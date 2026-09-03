"""IMU (Inertial Measurement Unit) simulator.

Produces realistic accelerometer, gyroscope and orientation outputs:

- accelerometer: linear + centripetal acceleration in the robot frame
  with gravity on the vertical axis, plus Gaussian white noise,
- gyroscope: angular rates with fixed bias and noise,
- orientation: roll/pitch jitter + yaw estimated by integrating the
  de-biased gyro (unavoidable random-walk drift, like the real part).
"""
from __future__ import annotations

import random
from typing import Dict

from app.core.config import Config
from app.sim.state import wrap_angle


class ImuSimulator:
    def __init__(self, config: Config, rng: random.Random) -> None:
        self._config = config.imu
        self._rng = rng

        # fixed per-device bias (one draw per boot)
        self._bias = tuple(rng.gauss(0.0, b) for b in self._config.gyro_bias)

        self.accel = [0.0, 0.0, 0.0]  # x, y, z [m/s^2]
        self.gyro = [0.0, 0.0, 0.0]  # wx, wy, wz [rad/s]
        self.roll = 0.0
        self.pitch = 0.0
        self.yaw = 0.0  # gyro-integrated orientation [rad]

    def step(
        self,
        dt: float,
        forward_accel: float,
        lateral_accel: float,
        yaw_rate: float,
        yaw_ground_truth: float,
    ) -> None:
        """Update IMU readings for one simulation tick (frame = robot body).

        ``yaw_ground_truth`` feeds the drift model (the gyro integration is
        intentionally left to accumulate error over time).
        """
        rng = self._rng
        std_a = self._config.accel_noise_std

        self.accel = [
            forward_accel + rng.gauss(0.0, std_a[0]),
            lateral_accel + rng.gauss(0.0, std_a[1]),
            self._config.gravity + rng.gauss(0.0, std_a[2]),
        ]

        std_g = self._config.gyro_noise_std
        self.gyro = [
            self._bias[0] + rng.gauss(0.0, std_g[0]),
            self._bias[1] + rng.gauss(0.0, std_g[1]),
            yaw_rate + self._bias[2] + rng.gauss(0.0, std_g[2]),
        ]

        # integrate de-biased gyro z; add a small random walk so the
        # orientation estimate drifts relative to the ground truth yaw.
        # The value stays unwrapped internally and wraps only on output.
        self.yaw += (self.gyro[2] - self._bias[2]) * dt
        self.yaw += rng.gauss(0.0, self._config.yaw_drift_noise_std * dt)

        self.roll = rng.gauss(0.0, 0.002)
        self.pitch = rng.gauss(0.0, 0.002)

    # ------------------------------------------------------------------
    # serialisation
    # ------------------------------------------------------------------
    def to_dict(self) -> Dict:
        return {
            "accelerometer": {
                "x": round(self.accel[0], 4),
                "y": round(self.accel[1], 4),
                "z": round(self.accel[2], 4),
            },
            "gyroscope": {
                "x": round(self.gyro[0], 4),
                "y": round(self.gyro[1], 4),
                "z": round(self.gyro[2], 4),
            },
            "orientation": {
                "roll": round(self.roll, 4),
                "pitch": round(self.pitch, 4),
                "yaw": round(wrap_angle(self.yaw), 4),
            },
        }