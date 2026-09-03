"""LiDAR (2D laser scanner) simulator.

Performs a full 360-degree ray sweep against the virtual floor plan. Each
beam returns a distance measurement with Gaussian range noise; a small
fraction of beams drop out (reported as ``None`` so the dashboard can draw
gaps, exactly like a real scan).
"""
from __future__ import annotations

import math
import random
from typing import Dict, List, Optional

from app.core.config import Config
from app.sim.environment import VirtualFacility
from app.sim.state import wrap_angle


class LidarSimulator:
    def __init__(self, config: Config, rng: random.Random) -> None:
        lidar = config.lidar
        self._range_min = lidar.range_min
        self._range_max = lidar.range_max
        self._resolution_deg = lidar.angular_resolution_deg
        self._noise_std = lidar.noise_std
        self._failure_rate = lidar.failure_rate
        self._rng = rng

    # ------------------------------------------------------------------
    # scan generation
    # ------------------------------------------------------------------
    def scan(
        self,
        environment: VirtualFacility,
        ox: float,
        oy: float,
        yaw: float = 0.0,
    ) -> Dict:
        """Return a scan: world-space beam angles and measured ranges.

        Angles follow the convention used by ROS ``sensor_msgs/LaserScan``:
        -pi .. pi in world frame, increment = configured resolution.
        """
        step_deg = self._resolution_deg
        steps = int(round(360.0 / step_deg))
        angles: List[float] = []
        ranges: List[Optional[float]] = []

        for i in range(steps):
            local_deg = -180.0 + i * step_deg
            world_angle = wrap_angle(math.radians(local_deg) + yaw)
            angles.append(round(local_deg, 2))

            if self._rng.random() < self._failure_rate:
                ranges.append(None)
                continue

            raw = environment.raycast(ox, oy, world_angle)
            if math.isinf(raw):
                ranges.append(None)
            else:
                value = max(
                    self._range_min,
                    min(self._range_max, raw + self._rng.gauss(0.0, self._noise_std)),
                )
                ranges.append(round(value, 3))

        return {
            "angle_min_deg": -180.0,
            "angle_max_deg": 180.0,
            "angle_increment_deg": step_deg,
            "range_max_m": self._range_max,
            "range_min_m": self._range_min,
            "beam_count": steps,
            "angles": angles,
            "ranges": ranges,
        }