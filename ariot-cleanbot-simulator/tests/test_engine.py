"""End-to-end tests for the simulation engine lifecycle and telemetry."""
from __future__ import annotations

import random

import pytest

from app.core.config import Config
from app.sim.engine import SimulationEngine
from app.sim.state import RobotStatus


def test_lifecycle_idle_cleaning_paused(engine):
    assert engine.status == RobotStatus.IDLE
    assert not engine.is_running

    engine.start(threaded=False)
    assert engine.is_running
    assert engine.status == RobotStatus.CLEANING

    engine.stop()
    assert not engine.is_running
    assert engine.status == RobotStatus.PAUSED

    engine.start(threaded=False)
    assert engine.is_running


def test_battery_drains_while_cleaning(engine):
    engine.start(threaded=False)
    before = engine.battery
    for _ in range(100):
        engine.step(0.1)
    assert engine.battery < before


def test_water_and_waste_change_while_cleaning(engine):
    engine.start(threaded=False)
    for _ in range(100):
        engine.step(0.1)
    assert engine.water < 99.9
    assert engine.waste > 0.0


def test_robot_moves_and_history_grows(engine):
    engine.start(threaded=False)
    start_pose = engine.motion.pose.to_dict()
    for _ in range(100):  # 10 s
        engine.step(0.1)
    current = engine.motion.pose
    assert (current.x, current.y) != (start_pose["x"], start_pose["y"])
    # path history is published once per second
    assert len(engine.path_history) >= 8


def test_low_battery_goes_to_dock_and_charges(config):
    engine = SimulationEngine(config)
    engine.start(threaded=False)

    for _ in range(150):
        engine.step(0.1)

    engine.battery = 20.0  # below the 25 % low threshold
    for _ in range(4000):
        engine.step(0.1)
        if engine.status == RobotStatus.CHARGING:
            break
    assert engine.status == RobotStatus.CHARGING
    assert engine.navigation.dock_reached

    for _ in range(4000):
        engine.step(0.1)
        if engine.battery >= 99.9:
            break
    assert engine.battery >= 99.9
    assert engine.status == RobotStatus.CLEANING
    assert engine.navigation.mode == engine.navigation.MODE_CLEANING


def test_reset_restores_factory_state(engine):
    engine.start(threaded=False)
    for _ in range(50):
        engine.step(0.1)
    assert engine.battery < 100.0

    engine.reset()
    assert engine.status == RobotStatus.IDLE
    assert engine.battery == pytest.approx(100.0)
    assert engine.water == pytest.approx(100.0)
    assert engine.waste == pytest.approx(0.0)
    assert engine.sim_time == 0.0
    assert not engine.is_running
    # the twin is fully rebuilt: encoders/odometry at the start pose
    assert engine.encoders.left_total_ticks == 0
    assert (engine.motion.pose.x, engine.motion.pose.y) == pytest.approx(
        (3.5, 3.5)
    )


def test_imu_and_encoders_active_over_time(engine):
    engine.start(threaded=False)
    for _ in range(50):
        engine.step(0.1)
    sensors = engine.get_sensors()
    assert sensors["encoder"]["left"]["ticks"] > 0
    assert sensors["encoder"]["right"]["ticks"] > 0
    assert sensors["imu"]["accelerometer"]["z"] == pytest.approx(9.81, abs=0.4)
    assert sensors["wheels"]["velocity_mps"] >= 0.0


def test_status_runs_without_lidar_change(engine):
    engine.start(threaded=False)
    for _ in range(20):
        engine.step(0.1)
    status = engine.get_status()
    assert set(status.keys()) >= {
        "robot_id",
        "status",
        "cleaning_mode",
        "current_task",
        "current_room",
        "position",
        "battery",
        "water",
        "waste",
    }
    assert status["position"]["x"] >= 0.0