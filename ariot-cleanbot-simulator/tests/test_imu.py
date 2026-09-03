"""Tests for the IMU simulator (noise, bias and orientation drift)."""
from __future__ import annotations

import random

import pytest

from app.sim.imu import ImuSimulator


@pytest.fixture()
def imu(config):
    return ImuSimulator(config, random.Random(11))


def test_accel_z_close_to_gravity(imu, config):
    imu.step(0.1, 0.0, 0.0, 0.0, 0.0)
    assert imu.accel[2] == pytest.approx(config.imu.gravity, abs=0.3)


def test_accel_x_forward(imu, config):
    imu.step(0.1, 0.5, 0.0, 0.0, 0.0)
    assert imu.accel[0] == pytest.approx(0.5, abs=config.imu.accel_noise_std[0] * 4)


def test_gyro_z_reports_yaw_rate(imu, config):
    imu.step(0.1, 0.0, 0.0, 0.5, 0.0)
    bias_bound = 3 * config.imu.gyro_bias[2]  # ~2-sigma
    assert imu.gyro[2] == pytest.approx(0.5, abs=0.1 + bias_bound)


def test_gyro_bias_is_fixed_per_device(config):
    imu_a = ImuSimulator(config, random.Random(99))
    imu_b = ImuSimulator(config, random.Random(99))
    imu_a.step(0.1, 0.0, 0.0, 0.0, 0.0)
    imu_b.step(0.1, 0.0, 0.0, 0.0, 0.0)
    assert imu_a.gyro[2] == pytest.approx(imu_b.gyro[2], abs=1e-9)
    assert imu_a.gyro[2] != pytest.approx(0.0, abs=0.004)  # bias present


def test_orientation_integrates_yaw(imu):
    for _ in range(100):  # 10 s at 1 rad/s
        imu.step(0.1, 0.0, 0.0, 1.0, 0.0)
    assert abs(imu.yaw) == pytest.approx(10.0, abs=1.5)


def test_yaw_has_small_drift(config):
    imu = ImuSimulator(config, random.Random(5))
    for _ in range(50):  # 5 s stationary
        imu.step(0.1, 0.0, 0.0, 0.0, 0.0)
    assert abs(imu.yaw) < 0.05  # drift bounded over a short window