"""Integration tests for the FastAPI REST endpoints (TestClient)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import Config
from app.main import create_app


@pytest.fixture()
def client():
    config = Config.load()
    config.simulation.autostart = False  # deterministic, no background thread
    from app.sim.engine import SimulationEngine

    engine = SimulationEngine(config)
    app = create_app(engine=engine)
    with TestClient(app) as test_client:
        yield test_client


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert any("simulation/status" in e for e in body["endpoints"])


def test_status_endpoint(client):
    from app.core.config import get_config
    response = client.get("/simulation/status")
    assert response.status_code == 200
    body = response.json()
    assert body["robot_id"] == get_config().simulation.robot_id
    assert body["status"] == "IDLE"
    assert {"battery", "water", "waste", "cleaning"} <= set(body.keys())


def test_sensors_endpoint(client):
    response = client.get("/simulation/sensors")
    assert response.status_code == 200
    body = response.json()
    assert {"encoder", "imu", "wheels"} <= set(body.keys())
    assert {"left", "right", "odometry"} <= set(body["encoder"].keys())
    assert {"accelerometer", "gyroscope", "orientation"} <= set(
        body["imu"].keys()
    )


def test_lidar_endpoint_full_and_downsampled(client):
    full = client.get("/simulation/lidar")
    assert full.status_code == 200
    assert len(full.json()["ranges"]) == 360

    thinned = client.get("/simulation/lidar", params={"downsample": 10})
    assert thinned.status_code == 200
    assert len(thinned.json()["ranges"]) == 36


def test_events_endpoint(client):
    response = client.get("/simulation/events", params={"limit": 20})
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["events"], list)
    assert "count" in body


def test_map_endpoint(client):
    response = client.get("/simulation/map")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "ARIOT Demo Facility"
    assert len(body["rooms"]) == 3
    assert len(body["walls"]) >= 8
    assert len(body["cleaning_route"]) >= 10


def test_start_stop_reset_flow(client):
    started = client.post("/simulation/start")
    assert started.status_code == 200
    assert started.json()["status"] == "STARTED"

    status = client.get("/simulation/status").json()
    assert status["status"] in {"CLEANING", "TRANSIT_TO_DOCK", "CHARGING"}

    stopped = client.post("/simulation/stop")
    assert stopped.status_code == 200
    assert client.get("/simulation/status").json()["engine_state"] in {
        "paused",
        "idle",
    }

    reset = client.post("/simulation/reset")
    assert reset.status_code == 200
    assert reset.json()["status"] == "RESET"
    reset_status = client.get("/simulation/status").json()
    assert reset_status["status"] == "IDLE"

    # and it can start again after a reset
    restarted = client.post("/simulation/start")
    assert restarted.json()["status"] == "STARTED"