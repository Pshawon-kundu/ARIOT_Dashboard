"""Simulation engine: a 100 ms digital-twin loop tying every sub-component.

The engine owns the ground-truth robot state (battery / water / waste /
status / pose), runs the navigation controller, feeds the sensor models,
applies event consequences and publishes snapshots for the REST API.
When running it executes on a background thread so FastAPI stays
responsive; ``reset()`` rebuilds the whole twin from configuration.

Dynamic mission generation (Phase S1):
  On first cleaning start, the engine builds a full coverage mission from
  the CoverageGrid and A* planner. The mission follows a farthest-first
  room order (via A* path cost), transits with A*, and cleans each room
  with boustrophedon lanes. Area-based coverage tracking replaces the
  legacy distance-based lap counter.
"""
from __future__ import annotations

import random
import threading
import time as time_mod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import Config, get_config
from app.sim.coverage import CoverageGrid, generate_boustrophedon_lanes, split_lanes_by_obstacles
from app.sim.encoders import EncoderSimulator
from app.sim.environment import VirtualFacility
from app.sim.events import EventGenerator, SimEvent
from app.sim.imu import ImuSimulator
from app.sim.lidar import LidarSimulator
from app.sim.motion import DifferentialDrive
from app.sim.navigation import NavigationSimulator, Waypoint
from app.sim.planner import AStarPlanner, compute_room_costs
from app.sim.state import RobotStatus


class SimulationEngine:
    """Threaded orchestrator for the robot digital twin."""

    def __init__(self, config: Optional[Config] = None, autostart: bool = False) -> None:
        self.config = config or get_config()
        self.autostart = autostart
        self._lock = threading.RLock()
        self._rng = random.Random(self.config.simulation.random_seed)
        self._active = False
        self._thread: Optional[threading.Thread] = None
        self._step_count = 0
        self._hist_acc = 0.0

        self.battery: float = self.config.battery.start_level
        self.water: float = self.config.water.start_level
        self.waste: float = self.config.waste.start_level
        self.status: str = RobotStatus.IDLE
        self.current_task: str = "Simulation ready - awaiting start command"
        self.sim_time = 0.0
        self.uptime = 0.0
        self.path_history: List[Dict[str, float]] = []
        self._mode_override: Optional[Tuple[str, float]] = None
        self._spill_until = float("-inf")

        self.environment: VirtualFacility
        self.motion: DifferentialDrive
        self.encoders: EncoderSimulator
        self.imu: ImuSimulator
        self.lidar: LidarSimulator
        self.navigation: NavigationSimulator
        self.events: EventGenerator
        self.coverage_grid: Optional[CoverageGrid] = None
        self.planner: Optional[AStarPlanner] = None
        self._mission_built: bool = False
        self._prev_pose: Optional[Tuple[float, float]] = None
        self._build_components()

    # ------------------------------------------------------------------
    # component wiring
    # ------------------------------------------------------------------
    def _build_components(self) -> None:
        self.environment = VirtualFacility(self.config.environment)
        self.motion = DifferentialDrive(self.config)
        self.encoders = EncoderSimulator(self.config, self._rng)
        self.imu = ImuSimulator(self.config, self._rng)
        self.lidar = LidarSimulator(self.config, self._rng)

        self.coverage_grid = CoverageGrid(
            self.environment,
            self.config.coverage,
            self.config.robot,
        )
        self.planner = AStarPlanner(
            self.environment,
            self.config.coverage,
            self.config.robot,
        )

        def coverage_progress_fn() -> float:
            if self.coverage_grid is None:
                return 0.0
            return self.coverage_grid.coverage_percent()

        def can_move_check_fn(x1: float, y1: float, x2: float, y2: float, margin: float) -> bool:
            if self.planner is None:
                return True
            total_clearance = self.planner.total_clearance
            return self.environment.can_move(x1, y1, x2, y2, total_clearance)

        self.navigation = NavigationSimulator(self.config, self._rng, coverage_progress_fn, can_move_check_fn)
        self.events = EventGenerator(self.config, self._rng)
        self.path_history = []
        self._mode_override = None
        self._spill_until = float("-inf")
        self._hist_acc = 0.0
        self._step_count = 0
        self._mission_built = False
        self._prev_pose = None

    # ------------------------------------------------------------------
    # lifecycle control (used by the API)
    # ------------------------------------------------------------------
    def start(self, threaded: bool = True) -> None:
        """Begin (or resume) the simulation loop on a background thread.

        ``threaded=False`` activates the twin without the loop thread, which
        lets tests drive ``step(dt)`` manually in a deterministic way.
        """
        with self._lock:
            if self._active:
                return
            self._active = True
            if self.status in (RobotStatus.IDLE, RobotStatus.PAUSED):
                if self.battery <= self.config.battery.low_threshold:
                    self.status = RobotStatus.CHARGING
                else:
                    self.status = RobotStatus.CLEANING
            if threaded and (self._thread is None or not self._thread.is_alive()):
                self._thread = threading.Thread(
                    target=self._run, name="cleanbot-sim-engine", daemon=True
                )
                self._thread.start()

    def stop(self) -> None:
        """Pause the simulation (thread exits at the next loop boundary)."""
        with self._lock:
            self._active = False
            if self.status not in (RobotStatus.IDLE, RobotStatus.CHARGING):
                self.status = RobotStatus.PAUSED
        thread = self._thread
        if thread and thread.is_alive() and thread is not threading.current_thread():
            thread.join(timeout=2.0)

    def reset(self) -> None:
        """Halt and rebuild the twin from scratch (fresh world state)."""
        self.stop()
        with self._lock:
            self._build_components()
            self.battery = self.config.battery.start_level
            self.water = self.config.water.start_level
            self.waste = self.config.waste.start_level
            self.status = RobotStatus.IDLE
            self.current_task = "Simulation reset - awaiting start command"
            self.sim_time = 0.0
            self.uptime = 0.0

    # ------------------------------------------------------------------
    # dynamic mission building (Phase S1)
    # ------------------------------------------------------------------
    def build_dynamic_mission(self) -> None:
        """Build the full coverage mission: farthest-first rooms, A* transits, boustrophedon lanes.

        Called automatically on the first cleaning start if no mission has been built.
        """
        if self._mission_built or self.coverage_grid is None or self.planner is None:
            return

        dock = tuple(self.config.navigation.dock_position)

        room_costs = compute_room_costs(self.planner, self.environment.rooms, dock)

        waypoints: List[Waypoint] = []
        waypoints.append(Waypoint(x=dock[0], y=dock[1], label="Dock"))

        prev_pos = dock

        for room_name, cost, (cx, cy), bounds in room_costs:
            if cost < 0:
                continue

            lanes = generate_boustrophedon_lanes(
                bounds,
                self.config.coverage.cleaning_width,
                self.config.coverage.lane_overlap,
                self.config.coverage.safety_clearance,
                self.config.robot.footprint_radius,
            )

            lanes = split_lanes_by_obstacles(
                lanes,
                self.environment.obstacles + self.environment.restricted_areas,
                self.config.coverage.cleaning_width,
                self.config.robot.footprint_radius,
            )

            first_lane_point = None
            if lanes and len(lanes[0]) >= 2:
                first_lane_point = (lanes[0][0][0], lanes[0][0][1])
            elif lanes and len(lanes[0]) >= 1:
                first_lane_point = (lanes[0][0][0], lanes[0][0][1])

            if first_lane_point is not None:
                connect_transit = self.planner.plan(prev_pos, first_lane_point)
                if connect_transit is not None and len(connect_transit) > 1:
                    for pt in connect_transit[1:]:
                        waypoints.append(Waypoint(x=pt[0], y=pt[1], label=f"Transit to {room_name}"))

            lane_label = f"{room_name} cleaning"
            for lane in lanes:
                if len(lane) >= 2:
                    for pt in lane:
                        waypoints.append(Waypoint(x=pt[0], y=pt[1], label=lane_label))

            last_lane_point = None
            if lanes and len(lanes[-1]) >= 2:
                last_lane_point = (lanes[-1][-1][0], lanes[-1][-1][1])
            elif lanes and len(lanes[-1]) >= 1:
                last_lane_point = (lanes[-1][-1][0], lanes[-1][-1][1])

            if last_lane_point is not None:
                prev_pos = last_lane_point
            else:
                prev_pos = (cx, cy)

        return_transit = self.planner.plan(prev_pos, dock)
        if return_transit is not None and len(return_transit) > 1:
            for pt in return_transit[1:]:
                waypoints.append(Waypoint(x=pt[0], y=pt[1], label="Return to dock"))

        waypoints.append(Waypoint(x=dock[0], y=dock[1], label="Dock"))

        self.navigation.set_mission_route(waypoints)
        self.coverage_grid.reset()
        self._mission_built = True

    @property
    def is_running(self) -> bool:
        return self._active

    # ------------------------------------------------------------------
    # background loop
    # ------------------------------------------------------------------
    def _run(self) -> None:
        dt = self.config.simulation.sensor_dt
        next_tick = time_mod.perf_counter()
        while self._active:
            now = time_mod.perf_counter()
            if now >= next_tick:
                self.step(dt)
                next_tick += dt
                if next_tick < now:
                    next_tick = now + dt  # do not spiral
            else:
                time_mod.sleep(min(0.004, next_tick - now))

    # ------------------------------------------------------------------
    # main simulation step (called at 10 Hz by the loop or directly by tests)
    # ------------------------------------------------------------------
    def step(self, dt: float) -> None:
        if not self._active:
            return

        dt = max(0.0, dt)
        with self._lock:
            now = self.sim_time
            self.environment.update(now)

            if self.status == RobotStatus.CHARGING:
                self._charge(dt)
            else:
                # Build dynamic mission on first cleaning start
                if self.status == RobotStatus.CLEANING and not self._mission_built:
                    self.build_dynamic_mission()

                pose = self.motion.pose
                command = self.navigation.step(pose)
                self.current_task = command.target_label

                # Save pose before motion so we can revert on collision.
                old_x, old_y, old_yaw = pose.x, pose.y, pose.yaw
                self.motion.step(dt, command.left, command.right)

                # Facility-aware collision: revert if the new pose is invalid.
                self._enforce_boundaries(old_x, old_y)

                # Track area-based cleaning coverage
                if self.navigation.current_segment_mode() == "cleaning" and self.coverage_grid is not None:
                    new_pose = self.motion.pose
                    if self._prev_pose is not None:
                        self.coverage_grid.mark_cleaned_path(
                            self._prev_pose[0], self._prev_pose[1],
                            new_pose.x, new_pose.y,
                        )
                    self._prev_pose = (new_pose.x, new_pose.y)

                self.encoders.step(
                    dt, self.motion.left_wheel_speed, self.motion.right_wheel_speed
                )
                self.imu.step(
                    dt,
                    forward_accel=self.motion.forward_acceleration(dt),
                    lateral_accel=self.motion.lateral_acceleration(),
                    yaw_rate=self.motion.angular_velocity,
                    yaw_ground_truth=self.motion.pose.yaw,
                )

                room = self.environment.room_of(pose.x, pose.y)
                event = self.events.step(dt, pose, room, now)
                if event is not None:
                    self._apply_event(event)

                self._update_consumables(dt, now)
                self._check_service_needs()

            self.sim_time += dt
            self.uptime += dt
            self._step_count += 1
            self._publish_path_history(dt)

    # ------------------------------------------------------------------
    # charging / consumables / service
    # ------------------------------------------------------------------
    def _charge(self, dt: float) -> None:
        cfg = self.config
        self.battery = min(100.0, self.battery + cfg.battery.charge_per_second * dt)
        if cfg.water.refill_at_dock:
            self.water = min(100.0, self.water + 2.0 * dt)
        if cfg.waste.empty_at_dock:
            self.waste = max(0.0, self.waste - 2.0 * dt)

        self.current_task = (
            f"Charging at dock - battery {self.battery:.0f}%, "
            f"water {self.water:.0f}%, waste {self.waste:.0f}%"
        )

        if self.battery >= 99.9 and self.water >= 99.9:
            self.battery = 100.0
            self.water = 100.0
            self.navigation.resume_cleaning()
            self.status = RobotStatus.CLEANING
            self.current_task = "Docked, fully charged - resuming cleaning route"

    def _update_consumables(self, dt: float, now: float) -> None:
        mode = self.effective_mode(now)
        multiplier = self.config.cleaning.intensity_multiplier.get(mode, 1.0)

        drain_scale = (
            multiplier if self.status == RobotStatus.CLEANING else 0.4 * multiplier
        )
        self.battery = max(
            0.0,
            self.battery - self.config.battery.drain_per_second * drain_scale * dt,
        )

        if self.status == RobotStatus.CLEANING:
            spill_active = now < self._spill_until
            water_drain = self.config.water.drain_per_second * multiplier * dt
            if spill_active:
                water_drain *= self.config.water.spill_drain_multiplier
            self.water = max(0.0, self.water - water_drain)
            self.waste = min(
                100.0, self.waste + self.config.waste.fill_per_second * dt
            )

    def _check_service_needs(self) -> None:
        if self.status == RobotStatus.TRANSIT_TO_DOCK:
            if self.navigation.dock_reached:
                self.status = RobotStatus.CHARGING
                self.current_task = "Charging at dock"
            return

        if self.status == RobotStatus.CLEANING and (
            self.battery <= self.config.battery.low_threshold or self.water <= 0.5
        ):
            self.navigation.return_to_dock()
            self.status = RobotStatus.TRANSIT_TO_DOCK
            self.current_task = "Returning to charging dock (low battery / water)"

    def _enforce_boundaries(self, old_x: float, old_y: float) -> None:
        """Facility-aware collision detection with wall sliding.

        Checks that the robot's new pose is valid.  When the full move is
        blocked the response tries X-only then Y-only projections so the
        robot can *slide* along walls instead of freezing in place.

        Uses total_clearance (footprint_radius + safety_clearance) to match
        A* planner's edge validation clearance requirement.
        """
        margin = self.planner.total_clearance if self.planner else self.config.robot.footprint_radius
        pose = self.motion.pose

        # 1. Full move is fine — nothing to do.
        if self.environment.can_move(old_x, old_y, pose.x, pose.y, margin):
            return

        # 2. Try sliding along X only.
        if self.environment.can_move(old_x, old_y, pose.x, old_y, margin):
            pose.y = old_y
            self.motion.angular_velocity *= 0.5
            return

        # 3. Try sliding along Y only.
        if self.environment.can_move(old_x, old_y, old_x, pose.y, margin):
            pose.x = old_x
            self.motion.angular_velocity *= 0.5
            return

        # 4. Fully stuck — revert and zero velocity.
        pose.x = old_x
        pose.y = old_y
        self.motion.velocity = 0.0
        self.motion.left_wheel_speed = 0.0
        self.motion.right_wheel_speed = 0.0

    # ------------------------------------------------------------------
    # event consequences / cleaning mode
    # ------------------------------------------------------------------
    def effective_mode(self, now: float) -> str:
        """Currently active cleaning mode (respects event-driven overrides)."""
        if self._mode_override is not None:
            mode, until = self._mode_override
            if now < until:
                return mode
            self._mode_override = None
        return self.config.cleaning.default_mode

    def _apply_event(self, event: SimEvent) -> None:
        cfg = self.config
        now = self.sim_time

        if event.event_type == "heavy_dirt":
            self._mode_override = (
                cfg.cleaning.heavy_dirt_mode,
                now + cfg.cleaning.heavy_dirt_duration,
            )
            self.current_task = "Heavy dirt detected - intensity increased"

        elif event.event_type == "spill_detected":
            self._spill_until = now + cfg.cleaning.spill_duration
            self._mode_override = (
                cfg.cleaning.spill_mode,
                self._spill_until,
            )
            self.current_task = "Spill detected - extra cleaning pass started"

        elif event.event_type == "solid_waste":
            self.waste = min(100.0, self.waste + cfg.waste.solid_waste_fill)
            self.current_task = "Solid waste collected into container"

        elif event.event_type == "temporary_obstacle":
            meta = event.extra.get("obstacle", {})
            x, y = event.location
            self.environment.spawn_temporary_obstacle(
                x=x,
                y=y,
                width=float(meta.get("width_m", 0.5)),
                height=float(meta.get("height_m", 0.5)),
                duration=float(meta.get("duration_s", 15.0)),
                now=now,
                name="Temporary obstacle",
            )
            self.current_task = "Obstacle detected - route adjusted automatically"

    # ------------------------------------------------------------------
    # path history sampling (1 Hz publication, matches dashboard refresh)
    # ------------------------------------------------------------------
    def _publish_path_history(self, dt: float) -> None:
        self._hist_acc += dt
        if self._hist_acc >= self.config.simulation.state_publish_dt:
            self._hist_acc = 0.0
            pose = self.motion.pose
            self.path_history.append(
                {
                    "x": round(pose.x, 2),
                    "y": round(pose.y, 2),
                    "yaw": round(pose.yaw, 3),
                    "t": round(self.sim_time, 1),
                }
            )
            if len(self.path_history) > 500:
                self.path_history = self.path_history[-500:]

    # ------------------------------------------------------------------
    # snapshot getters (read by the REST layer, guarded by the lock)
    # ------------------------------------------------------------------
    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            pose = self.motion.pose
            room = self.environment.room_of(pose.x, pose.y)
            mode = self.effective_mode(self.sim_time)
            target = self._current_target()

            battery_low = self.battery <= self.config.battery.low_threshold
            waste_needs_empty = self.waste >= self.config.waste.needs_empty_threshold

            engine_state = (
                "running"
                if self._active
                else ("paused" if self.status == RobotStatus.PAUSED else "idle")
            )

            return {
                "robot_id": self.config.simulation.robot_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "sim_time_s": round(self.sim_time, 2),
                "uptime_s": round(self.uptime, 1),
                "engine_state": engine_state,
                "status": self.status,
                "cleaning_mode": mode,
                "cleaning_mode_default": self.config.cleaning.default_mode,
                "current_task": self.current_task,
                "current_room": room,
                "location": room,
                "position": pose.to_dict(),
                "target_waypoint": target,
                "battery": {
                    "percent": round(self.battery, 1),
                    "low": battery_low,
                    "critical": self.battery <= self.config.battery.critical_threshold,
                    "charging": self.status == RobotStatus.CHARGING,
                },
                "water": {
                    "percent": round(self.water, 1),
                    "low": self.water <= 10.0,
                    "refilling": self.status == RobotStatus.CHARGING,
                },
                "waste": {
                    "percent": round(self.waste, 1),
                    "needs_empty": waste_needs_empty,
                    "emptying": self.status == RobotStatus.CHARGING,
                },
                "cleaning": {
                    "progress_percent": round(self.navigation.cleaning_progress(), 1),
                    "meters_cleaned": round(self.navigation.cleaned_meters, 1),
                    "lap": self.navigation.lap,
                    "laps_completed": self.navigation.laps_completed,
                    "route_length_m": round(self.navigation._mission_route_length() if self.navigation._mission_route else self.navigation._total_route_length, 1),
                    "coverage_percent": round(self.coverage_grid.coverage_percent(), 1) if self.coverage_grid else 0.0,
                    "coverage_by_room": self.coverage_grid.coverage_by_room() if self.coverage_grid else {},
                    "cells_cleaned": self.coverage_grid.total_cleaned_cells() if self.coverage_grid else 0,
                    "cells_total": self.coverage_grid.total_cleanable_cells() if self.coverage_grid else 0,
                    "mission_built": self._mission_built,
                },
                "path_history": self.path_history[-200:],
                "planned_route": [
                    {"x": round(wp.x, 2), "y": round(wp.y, 2), "label": wp.label}
                    for wp in (self.navigation._effective_route() if self.navigation._mission_route else self.navigation._clean_route)
                ],
                "tick_hz": round(1.0 / self.config.simulation.sensor_dt, 1),
                "events_in_history": len(self.events.recent(limit=100000)),
            }

    def _current_target(self) -> Optional[Dict[str, float]]:
        if (
            self.status in (RobotStatus.CHARGING, RobotStatus.TRANSIT_TO_DOCK)
            or self.navigation.mode == self.navigation.MODE_DOCK
        ):
            return {
                "x": round(self.navigation._dock.x, 2),
                "y": round(self.navigation._dock.y, 2),
                "label": "Charging dock",
            }
        route = self.navigation._effective_route()
        index = min(self.navigation.index, len(route) - 1) if route else 0
        if index >= len(route):
            return None
        wp = route[index]
        return {"x": round(wp.x, 2), "y": round(wp.y, 2), "label": wp.label}

    def get_sensors(self) -> Dict[str, Any]:
        """Encoder, IMU plus wheel/velocity telemetry (live snapshot)."""
        with self._lock:
            return {
                "robot_id": self.config.simulation.robot_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "sim_time_s": round(self.sim_time, 2),
                "encoder": self.encoders.to_dict(),
                "imu": self.imu.to_dict(),
                "wheels": {
                    "left_speed_mps": round(self.motion.left_wheel_speed, 3),
                    "right_speed_mps": round(self.motion.right_wheel_speed, 3),
                    "velocity_mps": round(self.motion.velocity, 3),
                    "angular_velocity_radps": round(self.motion.angular_velocity, 4),
                    "travelled_m": round(self.motion.travelled_distance, 2),
                },
            }

    def get_lidar(self, downsample: int = 1) -> Dict[str, Any]:
        """A fresh 360-degree laser scan from the current pose."""
        with self._lock:
            pose = self.motion.pose
            scan = self.lidar.scan(self.environment, pose.x, pose.y, pose.yaw)
            step = max(1, int(downsample))
            if step > 1:
                scan["angles"] = scan["angles"][::step]
                scan["ranges"] = scan["ranges"][::step]
                scan["downsample"] = step
            scan["pose"] = pose.to_dict()
            scan["room"] = self.environment.room_of(pose.x, pose.y)
            scan["timestamp"] = datetime.now(timezone.utc).isoformat()
            return scan

    def get_events(self, limit: int = 50) -> Dict[str, Any]:
        """Most recent detected situations with detection + decision blocks."""
        with self._lock:
            events = self.events.recent(limit)
            return {
                "robot_id": self.config.simulation.robot_id,
                "count": len(events),
                "events": events,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    def get_map(self) -> Dict[str, Any]:
        """Static + dynamic floor-plan data for dashboard map rendering."""
        with self._lock:
            if not self._mission_built:
                self.build_dynamic_mission()
            data = self.environment.to_dict(self.config.navigation.dock_position)
            data["robot_id"] = self.config.simulation.robot_id
            if self.navigation._mission_route:
                data["cleaning_route"] = [
                    {"x": wp.x, "y": wp.y, "label": wp.label}
                    for wp in self.navigation._mission_route
                ]
            else:
                data["cleaning_route"] = [
                    {"x": x, "y": y, "label": label}
                    for (x, y, label) in self.config.navigation.cleaning_route
                ]
            data["robot_pose"] = self.motion.pose.to_dict()
            return data