"""Tests for the LiDAR simulator (ray casting against the virtual map)."""
from __future__ import annotations

import random

import pytest

from app.sim.environment import VirtualFacility
from app.sim.lidar import LidarSimulator


@pytest.fixture()
def facility(config):
    return VirtualFacility(config.environment)


@pytest.fixture()
def lidar(config):
    return LidarSimulator(config, random.Random(3))


def test_scan_shape(lidar, facility):
    scan = lidar.scan(facility, 3.5, 3.5, 0.0)
    assert scan["beam_count"] == 360
    assert len(scan["angles"]) == 360
    assert len(scan["ranges"]) == 360
    assert scan["range_max_m"] > 0
    assert len(scan["ranges"]) == len(scan["angles"])


def test_beam_sees_bottom_wall(lidar, facility):
    # robot at (3.5, 3.5), local beam -90 deg points south -> y=0 wall
    scan = lidar.scan(facility, 3.5, 3.5, 0.0)
    idx = int((-90.0 + scan["angle_max_deg"]) / scan["angle_increment_deg"])
    value = scan["ranges"][idx]
    assert value is not None
    assert value == pytest.approx(3.5, abs=0.12)


def test_beam_sees_right_wall(lidar, facility):
    # local beam 0 deg points east -> the lobby must be shielded by the
    # interior wall at x=10 (segment y 2..8) -> 6.5 m away at y=3.5
    scan = lidar.scan(facility, 3.5, 3.5, 0.0)
    idx = int((0.0 + scan["angle_max_deg"]) / scan["angle_increment_deg"])
    value = scan["ranges"][idx]
    assert value is not None
    assert value == pytest.approx(10.0 - 3.5, abs=0.2)


def test_beam_reaches_outer_wall_through_door(lidar, facility):
    # through the door opening (y 8..11 at x=10) the outer right wall at
    # x=30 is visible as a flat stop at ~25 m
    scan = lidar.scan(facility, 3.5, 9.5, 0.0)
    idx = int((0.0 + scan["angle_max_deg"]) / scan["angle_increment_deg"])
    value = scan["ranges"][idx]
    assert value is not None
    assert 24.0 <= value <= 30.0


def test_temporary_obstacle_shows_in_scan(lidar, facility):
    facility.spawn_temporary_obstacle(5.0, 3.5, 0.4, 0.4, 10.0, now=0.0)
    scan = lidar.scan(facility, 3.5, 3.5, 0.0)
    idx = int((0.0 + scan["angle_max_deg"]) / scan["angle_increment_deg"])
    value = scan["ranges"][idx]
    assert value is not None
    assert value <= 1.6  # obstacle face is ~1.5 m east


def test_room_of(facility):
    assert facility.room_of(5.0, 8.0) == "Lobby"
    assert facility.room_of(15.0, 9.5) == "Corridor A"
    assert facility.room_of(25.0, 5.0) == "East Wing"
    assert facility.room_of(29.5, 13.5) == "Unknown"


def test_dynamic_obstacle_expiry(facility):
    facility.spawn_temporary_obstacle(4, 4, 0.5, 0.5, duration=1.0, now=0.0)
    assert len(facility.dynamic_segments()) == 4
    facility.update(now=1.5)
    assert len(facility.dynamic_segments()) == 0


def test_point_outside_is_rejected(facility):
    assert (
        facility.spawn_temporary_obstacle(40.0, 40.0, 0.5, 0.5, 5.0, now=0.0) is None
    )