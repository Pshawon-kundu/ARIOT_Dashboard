import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

os.environ.setdefault("SUPABASE_URL", "http://fake.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "fake-key")

import pytest
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.main import app
import app.auth as auth_module
from app.services import simulator_client

AUTH_HEADERS = {"Authorization": "Bearer test-token"}
ROBOT_UUID = "9a8c8213-d2f7-4e9b-9a1b-5f25631b57cd"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(
        auth_module,
        "decode_token",
        lambda token: {"sub": "user-1", "email": "a@b.c", "role": "admin"},
    )
    return TestClient(app)


def test_simulator_robot_returns_id_and_available(client):
    with patch.object(simulator_client, "get_simulation_status") as mock_status:
        mock_status.return_value = {
            "robot_id": ROBOT_UUID,
            "status": "CLEANING",
            "battery": {"percent": 85.0},
        }
        r = client.get("/robots/simulator", headers=AUTH_HEADERS)
        assert r.status_code == 200
        body = r.json()
        assert body["available"] is True
        assert body["robot_id"] == ROBOT_UUID


def test_simulator_robot_no_id_in_status(client):
    with patch.object(simulator_client, "get_simulation_status") as mock_status:
        mock_status.return_value = {
            "status": "IDLE",
            "battery": {"percent": 100.0},
        }
        r = client.get("/robots/simulator", headers=AUTH_HEADERS)
        assert r.status_code == 200
        body = r.json()
        assert body["available"] is False
        assert body["robot_id"] is None


def test_simulator_robot_client_exception(client):
    with patch.object(simulator_client, "get_simulation_status") as mock_status:
        mock_status.side_effect = ConnectionError("Simulator unreachable")
        r = client.get("/robots/simulator", headers=AUTH_HEADERS)
        assert r.status_code == 200
        body = r.json()
        assert body["available"] is False
        assert body["robot_id"] is None


def test_simulator_robot_requires_auth(client):
    r = client.get("/robots/simulator")
    assert r.status_code == 401
    assert "Missing bearer token" in r.json()["detail"]
