"""Autonomous navigation simulator (waypoint follower + dock management).

The robot follows a fixed cleaning route through the facility
(Lobby -> Corridor A -> East Wing -> back), looping continuously.
While following, a simple P-controller on the heading error produces
differential-drive wheel commands. When the engine requests service,
the navigator switches to the charging dock; when resumed, it continues
from the exact waypoint it was interrupted at - mirroring a ROS2
``FollowWaypoints`` behaviour tree.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Optional, Tuple

from app.core.config import Config
from app.sim.state import Pose, clamp, wrap_angle


@dataclass
class Waypoint:
    x: float
    y: float
    label: str


@dataclass
class DriveCommand:
    left: float  # left wheel speed [m/s]
    right: float  # right wheel speed [m/s]
    target_label: str
    driving: bool
    heading_error_rad: float = 0.0


class NavigationSimulator:
    """Pure waypoint-following controller (no map planarity assumptions)."""

    MODE_CLEANING = "cleaning"
    MODE_DOCK = "dock"

    def __init__(self, config: Config, rng: random.Random) -> None:
        nav_cfg = config.navigation
        clean_cfg = config.cleaning
        robot_cfg = config.robot

        self._clean_route: list[Waypoint] = [
            Waypoint(x=x, y=y, label=label)
            for (x, y, label) in nav_cfg.cleaning_route
        ]
        self._dock = Waypoint(
            x=nav_cfg.dock_position[0],
            y=nav_cfg.dock_position[1],
            label="Charging dock",
        )
        self._tolerance = nav_cfg.waypoint_tolerance
        self._base_speed = clean_cfg.base_speed
        self._turn_gain = clean_cfg.turn_gain
        self._approach = clean_cfg.approach_slowdown
        self._max_speed = robot_cfg.max_speed
        self._max_turn = robot_cfg.max_turn_rate
        self._wheel_base = robot_cfg.wheel_base
        self._rng = rng

        # progressive state
        self.mode = NavigationSimulator.MODE_CLEANING
        self.index = 0  # index into the full cleaning route
        self.cleaned_meters = 0.0
        self.lap = 1
        self.laps_completed = 0
        self.dock_reached = False
        self._last_arrival: Optional[Tuple[float, float]] = None
        self._total_route_length = self._route_length()

    # ------------------------------------------------------------------
    # metrics
    # ------------------------------------------------------------------
    def _route_length(self) -> float:
        total = 0.0
        for i in range(len(self._clean_route) - 1):
            a, b = self._clean_route[i], self._clean_route[i + 1]
            total += math.hypot(b.x - a.x, b.y - a.y)
        return total if total > 0.0 else 1.0

    def cleaning_progress(self) -> float:
        """Lap progress 0..100 based on metres actually cleaned."""
        if self._total_route_length <= 0.0:
            return 100.0
        within_lap = self.cleaned_meters % self._total_route_length
        return clamp(within_lap / self._total_route_length * 100.0, 0.0, 100.0)

    def current_label(self) -> str:
        if self.mode == NavigationSimulator.MODE_DOCK and not self.dock_reached:
            return "Returning to charging dock"
        if self.mode == NavigationSimulator.MODE_DOCK and self.dock_reached:
            return "At charging dock"
        if self.index >= len(self._clean_route):
            return "Completing lap"
        return self._clean_route[self.index].label

    def reset_route(self) -> None:
        """Restart the cleaning route from its first waypoint."""
        self.mode = NavigationSimulator.MODE_CLEANING
        self.index = 0
        self.cleaned_meters = 0.0
        self.lap = 1
        self.laps_completed = 0
        self.dock_reached = False
        self._last_arrival = None

    def return_to_dock(self) -> None:
        """Switch navigation to the charging dock."""
        if self.mode != NavigationSimulator.MODE_DOCK:
            self.mode = NavigationSimulator.MODE_DOCK
            self.dock_reached = False

    def resume_cleaning(self) -> None:
        """Resume the cleaning route at the interrupted waypoint."""
        self.mode = NavigationSimulator.MODE_CLEANING
        self.dock_reached = False

    # ------------------------------------------------------------------
    # control
    # ------------------------------------------------------------------
    def step(self, pose: Pose) -> DriveCommand:
        """Compute wheel-speed commands for the current pose."""
        if self.mode == NavigationSimulator.MODE_DOCK:
            target = self._dock
            if self.dock_reached:
                return DriveCommand(0.0, 0.0, target.label, driving=False)
        else:
            if self.index >= len(self._clean_route):
                self._complete_lap()
            target = self._clean_route[self.index]

        dx, dy = target.x - pose.x, target.y - pose.y
        distance = math.hypot(dx, dy)

        if distance < self._tolerance:
            self._handle_arrival(pose)
            return self.step(pose)

        desired_heading = math.atan2(dy, dx)
        heading_error = wrap_angle(desired_heading - pose.yaw)

        # speed shaping: rotate in place for sharp heading errors
        speed = self._base_speed
        if abs(heading_error) > 0.75:
            speed = 0.0
        elif abs(heading_error) > 0.30:
            speed = self._base_speed * 0.35

        if distance < self._approach:
            factor = clamp(distance / self._approach, 0.15, 1.0)
            speed *= factor

        linear = clamp(speed, -self._max_speed, self._max_speed)
        angular = clamp(
            self._turn_gain * heading_error, -self._max_turn, self._max_turn
        )

        left = linear - angular * self._wheel_base / 2.0
        right = linear + angular * self._wheel_base / 2.0
        limit = self._max_speed + self._max_turn * self._wheel_base / 2.0
        left, right = clamp(left, -limit, limit), clamp(right, -limit, limit)

        return DriveCommand(
            left=left,
            right=right,
            target_label=target.label,
            driving=True,
            heading_error_rad=heading_error,
        )

    # ------------------------------------------------------------------
    # internals
    # ------------------------------------------------------------------
    def _handle_arrival(self, pose: Pose) -> None:
        if self.mode == NavigationSimulator.MODE_DOCK:
            self.dock_reached = True
            return

        if self._last_arrival is not None:
            self.cleaned_meters += math.hypot(
                pose.x - self._last_arrival[0], pose.y - self._last_arrival[1]
            )
        self._last_arrival = (pose.x, pose.y)
        self.index += 1

        if self.index >= len(self._clean_route):
            self.cleaned_meters += math.hypot(
                pose.x - self._last_arrival[0], pose.y - self._last_arrival[1]
            )
            self._complete_lap()
            self._last_arrival = (pose.x, pose.y)

    def _complete_lap(self) -> None:
        self.laps_completed += 1
        self.lap = self.laps_completed + 1
        self.index = 0