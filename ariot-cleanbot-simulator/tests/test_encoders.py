"""Tests for the wheel encoder simulator and encoder-only odometry."""
from __future__ import annotations

import random

import pytest

from app.sim.encoders import EncoderSimulator


@pytest.fixture()
def enc(config):
    return EncoderSimulator(config, random.Random(7))


def test_zero_speed_produces_no_ticks(enc):
    enc.step(0.1, 0.0, 0.0)
    assert enc.left_total_ticks == 0
    assert enc.right_total_ticks == 0


def test_ticks_accumulate_against_geometry(config):
    enc = EncoderSimulator(config, random.Random(7))
    circumference = enc.wheel_circumference
    tpr = config.encoders.ticks_per_revolution

    duration = 4.0  # seconds at 0.5 m/s -> 2.0 m travelled per wheel
    for _ in range(int(duration / 0.1)):
        enc.step(0.1, 0.5, 0.5)

    expected_ticks = (0.5 * duration) / circumference * tpr
    # 2.0 m / 1.0053 m * 360 ~= 716 ticks (+- tick noise and truncation)
    assert enc.left_total_ticks == pytest.approx(expected_ticks, abs=12)
    assert enc.right_total_ticks == pytest.approx(expected_ticks, abs=12)


def test_differential_ticks_differ(config):
    enc = EncoderSimulator(config, random.Random(7))
    for _ in range(20):
        enc.step(0.1, 0.4, 0.9)
    assert enc.right_total_ticks > enc.left_total_ticks


def test_odometry_straight_line(config):
    enc = EncoderSimulator(config, random.Random(7))
    for _ in range(40):  # 4 s at 0.5 m/s -> ~2 m forward
        enc.step(0.1, 0.5, 0.5)
    # odometry is seeded from the known start pose (3.5, 3.5)
    assert enc.read_odometry().x == pytest.approx(3.5 + 2.0, abs=0.2)
    assert enc.read_odometry().y == pytest.approx(3.5, abs=0.08)
    assert abs(enc.read_odometry().yaw) < 0.05


def test_odometry_turn(config):
    enc = EncoderSimulator(config, random.Random(7))
    # spin counter-clockwise (left wheel reversed): yaw should grow positive
    for _ in range(30):
        enc.step(0.1, -0.5, 0.5)
    assert enc.read_odometry().yaw > 0.0


def test_serialisation_shape(enc):
    for _ in range(10):
        enc.step(0.1, 0.5, 0.5)
    payload = enc.to_dict()
    assert {"left", "right", "odometry"} <= payload.keys()
    assert {"ticks", "ticks_per_second", "velocity_mps", "distance_m"} <= payload[
        "left"
    ].keys()
    assert {"x", "y", "yaw"} <= payload["odometry"].keys()