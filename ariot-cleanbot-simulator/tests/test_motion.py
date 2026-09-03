"""Tests for the differential-drive motion simulator."""
from __future__ import annotations

import math

import pytest

from app.sim.motion import DifferentialDrive
from app.sim.state import Pose, wrap_angle


@pytest.fixture()
def drive(config):
    return DifferentialDrive(config)


def test_straight_line_forward(drive):
    drive.set_pose(Pose(0.0, 0.0, 0.0))
    for _ in range(100):
        drive.step(0.1, 1.0, 1.0)
    # v == 1 m/s for ~10 s (minus acceleration ramp)
    assert drive.velocity == pytest.approx(1.0, abs=0.05)
    assert drive.pose.x == pytest.approx(10.0, abs=0.6)
    assert drive.pose.y == pytest.approx(0.0, abs=0.05)
    assert drive.pose.yaw == pytest.approx(0.0, abs=1e-6)


def test_rotation_in_place_no_translation(drive, config):
    drive.set_pose(Pose(0.0, 0.0, 0.0))
    # pre-set wheel speeds so the acceleration ramp does not skew the result
    drive.left_wheel_speed = -0.5
    drive.right_wheel_speed = 0.5
    angular_expected = (0.5 - (-0.5)) / config.robot.wheel_base  # 2.22 rad/s
    for _ in range(50):  # 5 seconds
        drive.step(0.1, -0.5, 0.5)
    assert drive.pose.yaw == pytest.approx(
        wrap_angle(angular_expected * 5.0), abs=0.15
    )
    assert drive.pose.x == pytest.approx(0.0, abs=0.05)
    assert drive.pose.y == pytest.approx(0.0, abs=0.05)


def test_acceleration_is_limited(drive):
    drive.step(0.1, 10.0, 10.0)
    assert drive.left_wheel_speed <= 0.11  # accel_limit * dt = 0.1
    assert drive.right_wheel_speed <= 0.11
    assert drive.velocity <= 0.11


def test_unicycle_map_and_inverse(drive, config):
    base = config.robot.wheel_base
    v, w = DifferentialDrive.unicycle(0.8, 1.2, base)
    assert v == pytest.approx(1.0)
    assert w == pytest.approx(0.4 / base)

    vl, vr = drive.wheel_speeds_from_command(1.0, 0.4 / base)
    v2, w2 = DifferentialDrive.unicycle(vl, vr, base)
    assert v2 == pytest.approx(1.0, abs=1e-6)
    assert w2 == pytest.approx(0.4 / base, abs=1e-6)


def test_travelled_distance(drive):
    drive.set_pose(Pose(0.0, 0.0, 0.0))
    for _ in range(30):
        drive.step(0.1, 0.8, 0.8)
    assert drive.travelled_distance == pytest.approx(2.4, abs=0.4)


def test_acceleration_readings(drive):
    drive.step(0.1, 1.0, 1.0)
    accel = drive.forward_acceleration(0.1)
    assert accel >= 0.0
    assert accel <= 1.0 + 1e-6