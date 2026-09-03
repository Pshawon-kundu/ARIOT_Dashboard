"""Wheel encoder simulator with dead-reckoned odometry.

Mimics the physical encoder counters: each wheel accumulates integer
ticks derived from the travelled distance plus realistic tick noise.
Rolling tick samples provide a tick-based velocity estimate, and a
classic differential drive odometry model (with inherent drift) is
integrated from tick increments - exactly like the real robot's
wheel-encoder odometry before fusion with IMU/LiDAR.
"""
from __future__ import annotations

import math
import random
from collections import deque
from typing import Dict, Tuple

from app.core.config import Config
from app.sim.state import Pose, wrap_angle


class EncoderSimulator:
    def __init__(self, config: Config, rng: random.Random) -> None:
        self._tpr = config.encoders.ticks_per_revolution
        self._wheel_radius = config.robot.wheel_radius
        self._wheel_base = max(config.robot.wheel_base, 1e-3)
        self._noise_std = config.encoders.noise_std
        self._window = config.encoders.velocity_window_s
        self._rng = rng

        self.left_total_ticks = 0
        self.right_total_ticks = 0
        self.left_ticks = 0  # ticks since last tick
        self.right_ticks = 0

        # (sim_time, accumulated_ticks) rolling samples for velocity
        self._left_samples: deque[Tuple[float, int]] = deque()
        self._right_samples: deque[Tuple[float, int]] = deque()

        # odometry estimate (drifts from ground truth)
        self.odom = Pose(*config.robot.init_position)
        self._sim_time = 0.0

    # ------------------------------------------------------------------
    # measurement helpers
    # ------------------------------------------------------------------
    @property
    def wheel_circumference(self) -> float:
        return 2.0 * math.pi * self._wheel_radius

    def _speed_from_samples(self, samples: deque[Tuple[float, int]]) -> float:
        if len(samples) < 2:
            return 0.0
        t0, ticks0 = samples[0]
        t1, ticks1 = samples[-1]
        span = t1 - t0
        if span <= 0.0:
            return 0.0
        metres = (ticks1 - ticks0) / self._tpr * self.wheel_circumference
        return metres / span

    def read_left_velocity(self) -> float:
        return self._speed_from_samples(self._left_samples)

    def read_right_velocity(self) -> float:
        return self._speed_from_samples(self._right_samples)

    def read_odometry(self) -> Pose:
        """Return the dead-reckoned pose (encoder-only)."""
        return Pose(self.odom.x, self.odom.y, self.odom.yaw)

    # ------------------------------------------------------------------
    # simulation step: consume wheel speeds -> ticks + odometry update
    # ------------------------------------------------------------------
    def step(self, dt: float, left_speed: float, right_speed: float) -> None:
        self._sim_time += dt

        left_metres = left_speed * dt
        right_metres = right_speed * dt

        # encoders only tick while a wheel actually moves; noise would
        # otherwise produce phantom pulses while parked
        if abs(left_speed) < 1e-4:
            left_delta = 0
        else:
            left_delta = round(
                left_metres / self.wheel_circumference * self._tpr
                + self._rng.gauss(0.0, self._noise_std)
            )

        if abs(right_speed) < 1e-4:
            right_delta = 0
        else:
            right_delta = round(
                right_metres / self.wheel_circumference * self._tpr
                + self._rng.gauss(0.0, self._noise_std)
            )

        self.left_ticks = int(left_delta)
        self.right_ticks = int(right_delta)
        self.left_total_ticks += self.left_ticks
        self.right_total_ticks += self.right_ticks

        self._left_samples.append((self._sim_time, self.left_total_ticks))
        self._right_samples.append((self._sim_time, self.right_total_ticks))
        self._prune_samples()

        # differential odometry update (arc approximation)
        left_m = self.left_ticks / self._tpr * self.wheel_circumference
        right_m = self.right_ticks / self._tpr * self.wheel_circumference
        travelled = (left_m + right_m) / 2.0
        delta_theta = (right_m - left_m) / self._wheel_base
        midpoint = self.odom.yaw + delta_theta / 2.0
        self.odom.x += travelled * math.cos(midpoint)
        self.odom.y += travelled * math.sin(midpoint)
        self.odom.yaw = wrap_angle(self.odom.yaw + delta_theta)

    def _prune_samples(self) -> None:
        cutoff = self._sim_time - self._window
        while self._left_samples and self._left_samples[0][0] < cutoff:
            self._left_samples.popleft()
        while self._right_samples and self._right_samples[0][0] < cutoff:
            self._right_samples.popleft()

    # ------------------------------------------------------------------
    # serialisation
    # ------------------------------------------------------------------
    def to_dict(self) -> Dict:
        left_m = self.left_total_ticks / self._tpr * self.wheel_circumference
        right_m = self.right_total_ticks / self._tpr * self.wheel_circumference
        odom = self.read_odometry()
        return {
            "left": {
                "ticks": self.left_total_ticks,
                "ticks_per_second": round(
                    self.read_left_velocity() / self.wheel_circumference * self._tpr, 1
                ),
                "velocity_mps": round(self.read_left_velocity(), 3),
                "distance_m": round(left_m, 3),
            },
            "right": {
                "ticks": self.right_total_ticks,
                "ticks_per_second": round(
                    self.read_right_velocity() / self.wheel_circumference * self._tpr, 1
                ),
                "velocity_mps": round(self.read_right_velocity(), 3),
                "distance_m": round(right_m, 3),
            },
            "odometry": odom.to_dict(),
        }