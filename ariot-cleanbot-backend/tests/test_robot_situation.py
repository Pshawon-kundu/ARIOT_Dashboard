import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

import app.supabase as supabase_module
import app.auth as auth_module
import app.routers.robot_situation as rs
from app.main import app

AUTH_HEADERS = {"Authorization": "Bearer test-token"}


class FakeTable:
    def __init__(self, store):
        self._store = store
        self._by = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, column, value):
        self._by = (column, value)
        return self

    def execute(self):
        column, value = self._by
        data = [r for r in self._store if r.get(column) == value]
        return type("Resp", (), {"data": data})()


class FakeSupabase:
    def __init__(self, store):
        self._store = store

    def table(self, name):
        return FakeTable(self._store.get(name, []))


@pytest.fixture
def client(monkeypatch):
    store = {
        "robots": [
            {
                "id": 1,
                "name": "CleanBot-01",
                "model": "CB-X2",
                "status": "cleaning",
                "location": "Floor 3 / Wing B",
                "floor_condition": "wet",
                "nearby_obstacle": "chair",
                "restricted_area": "server room",
            }
        ],
        "cleaning_events": [
            {
                "id": 1,
                "robot_id": 1,
                "type": "heavy_dirt",
                "location": "Floor 3",
                "description": "dense dust",
                "response": "increased suction",
                "handled_automatically": True,
            },
            {
                "id": 2,
                "robot_id": 1,
                "type": "obstacle",
                "location": "Wing B",
                "description": "box",
                "response": "rerouted",
                "handled_automatically": True,
            },
            {
                "id": 3,
                "robot_id": 1,
                "type": "spill",
                "location": "cafeteria",
                "description": "coffee",
                "response": "extra pass",
                "handled_automatically": False,
            },
        ],
    }
    fake = FakeSupabase(store)
    monkeypatch.setattr(rs, "supabase", fake)
    monkeypatch.setattr(supabase_module, "supabase", fake)
    monkeypatch.setattr(
        auth_module,
        "decode_token",
        lambda token: {"sub": "user-1", "email": "a@b.c", "role": "admin"},
    )
    return TestClient(app)


def test_situation_found(client):
    r = client.get("/robots/1/situation", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()

    assert body["robot"]["id"] == 1
    assert body["robot"]["name"] == "CleanBot-01"
    assert body["robot"]["model"] == "CB-X2"
    assert body["robot"]["status"] == "cleaning"

    assert body["current_situation"]["location"] == "Floor 3 / Wing B"
    assert body["current_situation"]["floor_condition"] == "wet"
    assert body["current_situation"]["nearby_obstacle"] == "chair"
    assert body["current_situation"]["restricted_area"] == "server room"

    assert len(body["detections"]) == 3
    assert body["detections"][0]["type"] == "heavy_dirt"
    assert body["detections"][0]["handled_automatically"] is True

    decisions = {d["reason"]: d["action"] for d in body["decisions"]}
    assert decisions["obstacle"] == "Route adjusted automatically"
    assert decisions["spill"] == "Extra cleaning pass started"
    assert decisions["heavy_dirt"] == "Cleaning intensity increased automatically"


def test_situation_not_found(client):
    r = client.get("/robots/999/situation", headers=AUTH_HEADERS)
    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()
