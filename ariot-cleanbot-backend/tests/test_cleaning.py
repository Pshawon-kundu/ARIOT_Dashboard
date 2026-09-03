import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

import app.supabase as supabase_module
import app.auth as auth_module
import app.routers.cleaning as cleaning
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

    def order(self, *args, **kwargs):
        return self

    def execute(self):
        if self._by is None:
            return type("Resp", (), {"data": list(self._store)})()
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
            {"id": "c417cbf7-7ef8-45f8-97a4-6c74ae545081", "name": "CleanBot 01"},
            {"id": "d233cbf7-7ef8-45f8-97a4-6c74ae545082", "name": "CleanBot 02"},
        ],
        "cleaning_jobs": [
            {
                "id": "a1111111-7ef8-45f8-97a4-6c74ae545001",
                "robot_id": "c417cbf7-7ef8-45f8-97a4-6c74ae545081",
                "floor": "Level 1",
                "zone": "East Wing",
                "status": "completed",
                "progress": 100,
                "coverage": 96,
                "path": "A1 -> B2 -> C3",
                "detected_events": ["spill", "obstacle"],
                "started_at": "2026-08-26T08:00:00",
                "completed_at": "2026-08-26T09:15:00",
            },
            {
                "id": "a2222222-7ef8-45f8-97a4-6c74ae545002",
                "robot_id": "d233cbf7-7ef8-45f8-97a4-6c74ae545082",
                "floor": "Level 2",
                "zone": "Storage",
                "status": "cleaning",
                "progress": 45,
                "coverage": 40,
                "path": None,
                "detected_events": None,
                "started_at": "2026-08-26T10:00:00",
                "completed_at": None,
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


def test_list_cleaning_jobs(client):
    r = client.get("/cleaning/jobs", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert len(body) == 2

    job = body[0]
    assert set(job.keys()) == {
        "id",
        "robot_id",
        "robot_name",
        "floor",
        "zone",
        "status",
        "progress",
        "started_at",
        "completed_at",
        "coverage",
    }
    # robot_name joined from robots table
    assert job["robot_name"] == "CleanBot 01"
    assert job["robot_id"] == "c417cbf7-7ef8-45f8-97a4-6c74ae545081"


def test_get_cleaning_job_detail(client):
    job_id = "a1111111-7ef8-45f8-97a4-6c74ae545001"
    r = client.get(f"/cleaning/jobs/{job_id}", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()

    assert body["id"] == job_id
    assert body["robot"] == "CleanBot 01"
    assert body["floor"] == "Level 1"
    assert body["zone"] == "East Wing"
    assert body["status"] == "completed"
    assert body["progress"] == 100
    assert body["coverage"] == 96
    assert body["path"] == "A1 -> B2 -> C3"
    assert body["detected_events"] == ["spill", "obstacle"]
    assert body["started_at"] == "2026-08-26T08:00:00"
    assert body["completed_at"] == "2026-08-26T09:15:00"


def test_get_cleaning_job_missing_detected_events_defaults_to_list(client):
    job_id = "a2222222-7ef8-45f8-97a4-6c74ae545002"
    r = client.get(f"/cleaning/jobs/{job_id}", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["detected_events"] == []
    assert body["path"] is None


def test_get_cleaning_job_not_found(client):
    r = client.get(
        "/cleaning/jobs/00000000-0000-0000-0000-000000000000",
        headers=AUTH_HEADERS,
    )
    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()
