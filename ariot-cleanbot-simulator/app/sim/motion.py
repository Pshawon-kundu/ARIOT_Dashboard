"""Differential-drive motion simulator.

Realistic twin of a mobile robot base: two independently driven wheels.
Given target wheel speeds the base integrates the unicycle model

    v = (vl + vr) / 2          omega = (vr - vl) / wheel_base

while respecting a per-wheel acceleration limit.
"""
from __future__ import annotations

import math
from typing import Tuple

from app.core.config import Config
from app.sim.state import Pose, clamp, wrap_angle


class DifferentialDrive:
    def __init__(self, config: Config) -> None:
        robot = config.robot
        self._wheel_base = robot.wheel_base
        self._max_speed = robot.max_speed
        self._max_turn_rate = robot.max_turn_rate
        self._accel_limit = robot.accel_limit

        self.pose = Pose(*robot.init_position)
        self.left_wheel_speed = 0.0  # m/s (current actual)
        self.right_wheel_speed = 0.0
        self._prev_velocity = 0.0
        self.velocity = 0.0  # v
        self.angular_velocity = 0.0  # omega
        self.travelled_distance = 0.0  # total odometric distance [m]

    # ------------------------------------------------------------------
    # kinematics
    # ------------------------------------------------------------------
    @staticmethod
    def unicycle(wheel_left: float, wheel_right: float, wheel_base: float) -> Tuple[float, float]:
        """Map wheel speeds (m/s) to linear / angular velocity."""
        v = (wheel_left + wheel_right) / 2.0
        omega = (wheel_right - wheel_left) / wheel_base
        return v, omega

    def wheel_speeds_from_command(self, linear: float, angular: float) -> Tuple[float, float]:
        """Inverse kinematics: desired v / omega -> wheel speeds (m/s)."""
        left = linear - (angular * self._wheel_base / 2.0)
        right = linear + (angular * self._wheel_base / 2.0)
        limit = self._max_speed + abs(angular) * (self._wheel_base / 2.0) + 0.05
        return clamp(left, -limit, limit), clamp(right, -limit, limit)

    # ------------------------------------------------------------------
    # simulation step
    # ------------------------------------------------------------------
    def step(self, dt: float, target_left: float, target_right: float) -> None:
        """Advance the base by ``dt`` toward commanded wheel speeds."""
        max_delta = self._accel_limit * dt
        self.left_wheel_speed += clamp(
            target_left - self.left_wheel_speed, -max_delta, max_delta
        )
        self.right_wheel_speed += clamp(
            target_right - self.right_wheel_speed, -max_delta, max_delta
        )

        v, omega = self.unicycle(
            self.left_wheel_speed, self.right_wheel_speed, self._wheel_base
        )
        self._prev_velocity = self.velocity
        self.velocity = v
        self.angular_velocity = omega

        self.pose.x += v * math.cos(self.pose.yaw) * dt
        self.pose.y += v * math.sin(self.pose.yaw) * dt
        self.pose.yaw = wrap_angle(self.pose.yaw + omega * dt)
        self.travelled_distance += abs(v) * dt

    def set_pose(self, pose: Pose) -> None:
        self.pose = pose

    # ------------------------------------------------------------------
    # helpers
    # ------------------------------------------------------------------
    def forward_acceleration(self, dt: float) -> float:
        """Measured linear acceleration over the last tick (IMU input)."""
        if dt <= 0.0:
            return 0.0
        return (self.velocity - self._prev_velocity) / dt

    def lateral_acceleration(self) -> float:
        """Centripetal acceleration along the body Y axis."""
        return self.velocity * self.angular_velocity

    def current_command(self) -> Tuple[float, float]:
        """(linear v, angular omega) current state."""
        return self.velocity, self.angular_velocity