"""Tests for the navigation waypoint follower."""
from __future__ import annotations

import random

import pytest

from app.sim.motion import DifferentialDrive
from app.sim.navigation import NavigationSimulator
from app.sim.state import Pose


@pytest.fixture()
def nav(config):
    return NavigationSimulator(config, random.Random(3))


@pytest.fixture()
def drive(config):
    return DifferentialDrive(config)


def test_drives_to_first_waypoint(nav, drive):
    drive.set_pose(Pose(3.5, 3.5, 0.0))
    for _ in range(3000):
        command = nav.step(drive.pose)
        if not command.driving:
            break
        drive.step(0.05, command.left, command.right)

    assert nav.index >= 1
    # the robot must be near whichever waypoint it is currently pursuing
    current = nav._clean_route[min(nav.index, len(nav._clean_route) - 1)]
    reached = drive.pose.distance_to(Pose(current.x, current.y, 0.0))
    assert reached < nav._tolerance + 0.3


def test_progress_increases_over_lap(nav, drive):
    drive.set_pose(Pose(3.5, 3.5, 0.0))
    progress_before = nav.cleaning_progress()
    for _ in range(4000):
        command = nav.step(drive.pose)
        drive.step(0.05, command.left, command.right)
        if not command.driving:
            break
    assert nav.cleaning_progress() >= progress_before
    assert nav.cleaning_progress() > 0.0
    assert nav.cleaning_progress() <= 100.0


def test_return_to_dock_and_resume(nav, drive):
    drive.set_pose(Pose(3.5, 3.5, 0.0))
    # start cleaning
    for _ in range(200):
        command = nav.step(drive.pose)
        drive.step(0.1, command.left, command.right)
    assert nav.mode == NavigationSimulator.MODE_CLEANING

    nav.return_to_dock()
    assert nav.mode == NavigationSimulator.MODE_DOCK
    reached_dock = False
    for _ in range(2000):
        command = nav.step(drive.pose)
        drive.step(0.05, command.left, command.right)
        if nav.dock_reached:
            reached_dock = True
            break
    assert reached_dock
    dock = nav._dock
    assert drive.pose.distance_to(Pose(dock.x, dock.y, 0.0)) < 0.6

    # resume: robot leaves dock toward the cleaning route again
    nav.resume_cleaning()
    assert nav.mode == NavigationSimulator.MODE_CLEANING
    command = nav.step(drive.pose)
    assert command.driving is True


def test_crosses_all_rooms(nav, drive, config):
    """Full simulated lap must visit Lobby, Corridor A and East Wing."""
    from app.sim.environment import VirtualFacility

    facility = VirtualFacility(config.environment)
    drive.set_pose(Pose(3.5, 3.5, 0.0))
    rooms = set()
    index_before = nav.index
    for _ in range(6000):
        command = nav.step(drive.pose)
        drive.step(0.05, command.left, command.right)
        rooms.add(facility.room_of(drive.pose.x, drive.pose.y))
        if nav.index < index_before:  # a lap was completed
            break
    assert {"Lobby", "Corridor A", "East Wing"} <= rooms