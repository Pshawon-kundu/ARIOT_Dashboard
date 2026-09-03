import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

os.environ.setdefault("SUPABASE_URL", "http://fake.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "fake-key")

import json
import pytest
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from app.main import app
from app.services import simulator_client

AUTH_HEADERS = {"Authorization": "Bearer test-token"}

ROBOT_UUID = "9a8c8213-d2f7-4e9b-9a1b-5f25631b57cd"

FAKE_STATUS = {
    "robot_id": ROBOT_UUID,
    "timestamp": "2026-08-30T12:00:00+00:00",
    "sim_time_s": 10.0,
    "uptime_s": 10.0,
    "engine_state": "running",
    "status": "CLEANING",
    "cleaning_mode": "STANDARD",
    "current_task": "Cleaning East Wing",
    "current_room": "East Wing",
    "location": "East Wing",
    "position": {"x": 5.5, "y": 3.2, "yaw": 0.785},
    "battery": {"percent": 85.0, "low": False, "critical": False, "charging": False},
    "water": {"percent": 70.0, "low": False, "refilling": False},
    "waste": {"percent": 15.0, "needs_empty": False, "emptying": False},
    "cleaning": {"progress_percent": 42.5, "meters_cleaned": 120.3, "lap": 1, "laps_completed": 0, "route_length_m": 500.0},
    "path_history": [{"x": 3.5, "y": 3.5, "yaw": 0, "t": 0.0}, {"x": 5.5, "y": 3.2, "yaw": 0.785, "t": 10.0}],
    "tick_hz": 10.0,
}

FAKE_SENSORS = {
    "robot_id": ROBOT_UUID,
    "timestamp": "2026-08-30T12:00:00+00:00",
    "sim_time_s": 10.0,
    "encoder": {"left_ticks": 1234, "right_ticks": 1230, "odometry": {"x": 5.5, "y": 3.2, "yaw": 0.785}},
    "imu": {"accel": {"x": 0.01, "y": 0.02, "z": 9.81}, "gyro": {"x": 0.0, "y": 0.0, "z": 0.05}, "yaw": 0.785},
    "wheels": {"left_speed_mps": 0.45, "right_speed_mps": 0.42, "velocity_mps": 0.435, "angular_velocity_radps": 0.033, "travelled_m": 120.3},
}

FAKE_LIDAR = {
    "angle_min_deg": -180.0,
    "angle_max_deg": 180.0,
    "angle_increment_deg": 1.0,
    "range_max_m": 30.0,
    "range_min_m": 0.05,
    "beam_count": 360,
    "angles": [float(i - 180) for i in range(360)],
    "ranges": [2.5] * 360,
    "pose": {"x": 5.5, "y": 3.2, "yaw": 0.785},
    "room": "East Wing",
    "timestamp": "2026-08-30T12:00:00+00:00",
}

FAKE_START = {"status": "STARTED", "robot_id": ROBOT_UUID, "message": "Simulation running at 10 Hz"}
FAKE_STOP = {"status": "STOPPED", "robot_id": ROBOT_UUID, "message": "Simulation paused"}
FAKE_RESET = {"status": "RESET", "robot_id": ROBOT_UUID, "message": "Simulation reset to factory state"}


class FakeResponse:
    def __init__(self, data, status_code=200):
        self._data = data
        self.status_code = status_code

    def json(self):
        return self._data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")


@pytest.fixture
def client(monkeypatch):
    from fastapi.testclient import TestClient as TC
    import app.auth as auth_module

    def fake_get(url, **kwargs):
        if url == "/simulation/status":
            return FakeResponse(FAKE_STATUS)
        elif url == "/simulation/sensors":
            return FakeResponse(FAKE_SENSORS)
        elif url == "/simulation/lidar":
            return FakeResponse(FAKE_LIDAR)
        elif url == "/simulation/events":
            return FakeResponse({"events": [], "count": 0})
        elif url == "/simulation/map":
            return FakeResponse({"rooms": {}, "walls": []})
        return FakeResponse({}, 404)

    def fake_post(url, **kwargs):
        if url == "/simulation/start":
            return FakeResponse(FAKE_START)
        elif url == "/simulation/stop":
            return FakeResponse(FAKE_STOP)
        elif url == "/simulation/reset":
            return FakeResponse(FAKE_RESET)
        return FakeResponse({}, 404)

    class FakeClient:
        def __init__(self, **kwargs):
            pass
        def get(self, url, **kwargs):
            return fake_get(url, **kwargs)
        def post(self, url, **kwargs):
            return fake_post(url, **kwargs)
        @property
        def is_closed(self):
            return False
        def close(self):
            pass

    monkeypatch.setattr(simulator_client, "_client", None)
    monkeypatch.setattr(simulator_client, "_get_client", lambda: FakeClient())
    monkeypatch.setattr(
        auth_module,
        "decode_token",
        lambda token: {"sub": "user-1", "email": "a@b.c", "role": "admin"},
    )

    return TC(app)


def test_get_simulation_status():
    with patch.object(simulator_client, "_get_client") as mock:
        mock.return_value.get.return_value = FakeResponse(FAKE_STATUS)
        result = simulator_client.get_simulation_status()
        assert result["robot_id"] == ROBOT_UUID
        assert result["status"] == "CLEANING"
        mock.return_value.get.assert_called_once_with("/simulation/status")


def test_get_simulation_sensors():
    with patch.object(simulator_client, "_get_client") as mock:
        mock.return_value.get.return_value = FakeResponse(FAKE_SENSORS)
        result = simulator_client.get_simulation_sensors()
        assert "encoder" in result
        assert "imu" in result
        mock.return_value.get.assert_called_once_with("/simulation/sensors")


def test_get_simulation_lidar():
    with patch.object(simulator_client, "_get_client") as mock:
        mock.return_value.get.return_value = FakeResponse(FAKE_LIDAR)
        result = simulator_client.get_simulation_lidar(downsample=5)
        assert result["beam_count"] == 360
        mock.return_value.get.assert_called_once_with("/simulation/lidar", params={"downsample": 5})


def test_start_simulation():
    with patch.object(simulator_client, "_get_client") as mock:
        mock.return_value.post.return_value = FakeResponse(FAKE_START)
        result = simulator_client.start_simulation()
        assert result["status"] == "STARTED"
        mock.return_value.post.assert_called_once_with("/simulation/start")


def test_stop_simulation():
    with patch.object(simulator_client, "_get_client") as mock:
        mock.return_value.post.return_value = FakeResponse(FAKE_STOP)
        result = simulator_client.stop_simulation()
        assert result["status"] == "STOPPED"
        mock.return_value.post.assert_called_once_with("/simulation/stop")


def test_reset_simulation():
    with patch.object(simulator_client, "_get_client") as mock:
        mock.return_value.post.return_value = FakeResponse(FAKE_RESET)
        result = simulator_client.reset_simulation()
        assert result["status"] == "RESET"
        mock.return_value.post.assert_called_once_with("/simulation/reset")


def test_live_telemetry_returns_200(client):
    r = client.get(f"/robots/{ROBOT_UUID}/live", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["robot_id"] == ROBOT_UUID
    assert body["status"] == "cleaning"
    assert body["battery"] == 85.0
    assert body["water_level"] == 70.0
    assert body["waste_level"] == 15.0
    assert body["cleaning_progress"] == 42.5
    assert body["current_task"] == "Cleaning East Wing"
    assert body["position"]["x"] == 5.5
    assert "sensors" in body
    assert "wheels" in body["sensors"]


def test_live_telemetry_path_history(client):
    r = client.get(f"/robots/{ROBOT_UUID}/live", headers=AUTH_HEADERS)
    body = r.json()
    assert isinstance(body["path_history"], list)
    assert len(body["path_history"]) == 2
    assert body["path_history"][0]["x"] == 3.5


def test_live_telemetry_engine_state(client):
    r = client.get(f"/robots/{ROBOT_UUID}/live", headers=AUTH_HEADERS)
    body = r.json()
    assert body["engine_state"] == "running"
    assert body["sim_status"] == "CLEANING"
    assert body["tick_hz"] == 10.0


def test_lidar_returns_200(client):
    r = client.get(f"/robots/{ROBOT_UUID}/lidar", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["robot_id"] == ROBOT_UUID
    assert body["beam_count"] == 360
    assert len(body["scan"]) == 360
    assert body["range_max"] == 30.0
    assert body["range_min"] == 0.05
    assert body["room"] == "East Wing"


def test_lidar_with_downsample(client):
    r = client.get(f"/robots/{ROBOT_UUID}/lidar?downsample=10", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["robot_id"] == ROBOT_UUID
    assert body["beam_count"] == 360


def test_start_robot_returns_200(client):
    r = client.post(f"/robots/{ROBOT_UUID}/start", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["robot_id"] == ROBOT_UUID
    assert body["command"] == "start"
    assert body["status"] == "STARTED"


def test_stop_robot_returns_200(client):
    r = client.post(f"/robots/{ROBOT_UUID}/stop", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["robot_id"] == ROBOT_UUID
    assert body["command"] == "stop"
    assert body["status"] == "STOPPED"


def test_reset_robot_returns_200(client):
    r = client.post(f"/robots/{ROBOT_UUID}/reset", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["robot_id"] == ROBOT_UUID
    assert body["command"] == "reset"
    assert body["status"] == "RESET"


def test_unauthenticated_returns_401(client):
    r = client.get(f"/robots/{ROBOT_UUID}/live")
    assert r.status_code == 401
    assert "Missing bearer token" in r.json()["detail"]


def test_invalid_robot_id_returns_404(client):
    r = client.get("/robots/00000000-0000-0000-0000-000000000000/live", headers=AUTH_HEADERS)
    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()


def test_live_telemetry_simulator_unavailable(monkeypatch):
    from fastapi.testclient import TestClient
    import app.auth as auth_module

    def fail_client():
        raise ConnectionError("Simulator unreachable")

    monkeypatch.setattr(simulator_client, "_get_client", fail_client)
    monkeypatch.setattr(
        auth_module,
        "decode_token",
        lambda token: {"sub": "user-1", "email": "a@b.c", "role": "admin"},
    )
    tc = TestClient(app)
    r = tc.get(f"/robots/{ROBOT_UUID}/live", headers=AUTH_HEADERS)
    assert r.status_code == 503
    assert "Simulator unavailable" in r.json()["detail"]
