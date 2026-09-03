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
                "id": "9a8c8213-d2f7-4e9b-9a1b-5f25631b57cd",
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
                "id": "evt-0001",
                "robot_id": "9a8c8213-d2f7-4e9b-9a1b-5f25631b57cd",
                "type": "heavy_dirt",
                "location": "Floor 3",
                "description": "dense dust",
                "response": "increased suction",
                "handled_automatically": True,
            },
            {
                "id": "evt-0002",
                "robot_id": "9a8c8213-d2f7-4e9b-9a1b-5f25631b57cd",
                "type": "obstacle",
                "location": "Wing B",
                "description": "box",
                "response": "rerouted",
                "handled_automatically": True,
            },
            {
                "id": "evt-0003",
                "robot_id": "9a8c8213-d2f7-4e9b-9a1b-5f25631b57cd",
                "type": "spill",
                "location": "cafeteria",
                "description": "coffee",
                "response": "extra pass",
                "handled_automatically": False,
            },
        ],
    }
    fake = FakeSupabase(store)
    monkeypatch.setattr(supabase_module, "supabase", fake)
    monkeypatch.setattr(
        auth_module,
        "decode_token",
        lambda token: {"sub": "user-1", "email": "a@b.c", "role": "admin"},
    )
    return TestClient(app)


def test_situation_found(client):
    r = client.get("/robots/9a8c8213-d2f7-4e9b-9a1b-5f25631b57cd/situation", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()

    assert body["robot"]["id"] == "9a8c8213-d2f7-4e9b-9a1b-5f25631b57cd"
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
    r = client.get("/robots/00000000-0000-0000-0000-000000000000/situation", headers=AUTH_HEADERS)
    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()
