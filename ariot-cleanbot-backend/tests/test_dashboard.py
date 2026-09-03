import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

import app.supabase as supabase_module
import app.auth as auth_module
from app.main import app

AUTH_HEADERS = {"Authorization": "Bearer test-token"}


class FakeTable:
    def __init__(self, store):
        self._store = store
        self._by = None
        self._filters = []

    def select(self, *args, **kwargs):
        return self

    def eq(self, column, value):
        self._by = (column, value)
        return self

    def gte(self, column, value):
        self._filters.append((column, value, "gte"))
        return self

    def execute(self):
        data = list(self._store)
        if self._by is not None:
            column, value = self._by
            data = [r for r in data if r.get(column) == value]
        for column, value, op in self._filters:
            if op == "gte":
                data = [r for r in data if r.get(column, "") >= value]
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
                "id": "550e8400-e29b-41d4-a716-446655440001",
                "name": "CleanBot 01",
                "model": "CB-X2",
                "status": "cleaning",
                "location": "Level 1",
            },
            {
                "id": "660e8400-e29b-41d4-a716-446655440002",
                "name": "CleanBot 02",
                "model": "CB-X2",
                "status": "ready",
                "location": "Charging Dock",
            },
        ],
        "notifications": [
            {
                "id": "n1",
                "robot_id": "550e8400-e29b-41d4-a716-446655440001",
                "message": "Water low",
                "read": False,
                "severity": "warning",
            },
            {
                "id": "n2",
                "robot_id": "550e8400-e29b-41d4-a716-446655440001",
                "message": "Task completed",
                "read": True,
                "severity": "info",
            },
            {
                "id": "n3",
                "robot_id": "550e8400-e29b-41d4-a716-446655440001",
                "message": "Error",
                "read": False,
                "severity": "error",
            },
        ],
        "cleaning_jobs": [
            {
                "id": "j1",
                "robot_id": "550e8400-e29b-41d4-a716-446655440001",
                "progress": 100,
                "started_at": "2026-09-02T08:00:00",
                "completed_at": "2026-09-02T09:15:00",
            },
            {
                "id": "j2",
                "robot_id": "550e8400-e29b-41d4-a716-446655440001",
                "progress": 85,
                "started_at": "2026-09-02T10:00:00",
                "completed_at": "2026-09-02T11:00:00",
            },
        ],
        "cleaning_events": [
            {"id": "e1", "created_at": "2026-09-02T08:00:00"},
            {"id": "e2", "created_at": "2026-09-02T09:00:00"},
            {"id": "e3", "created_at": "2026-09-02T10:00:00"},
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


@pytest.fixture
def empty_client(monkeypatch):
    store = {
        "robots": [],
        "notifications": [],
        "cleaning_jobs": [],
        "cleaning_events": [],
    }
    fake = FakeSupabase(store)
    monkeypatch.setattr(supabase_module, "supabase", fake)
    monkeypatch.setattr(
        auth_module,
        "decode_token",
        lambda token: {"sub": "user-1", "email": "a@b.c", "role": "admin"},
    )
    return TestClient(app)


@pytest.fixture
def fail_client(monkeypatch):
    def raise_on_table(name):
        class FailingTable:
            def select(self, *args, **kwargs):
                return self

            def eq(self, *args, **kwargs):
                return self

            def gte(self, *args, **kwargs):
                return self

            def execute(self):
                raise Exception("Connection refused")

        return FailingTable()

    class FailingSupabase:
        def table(self, name):
            return raise_on_table(name)

    monkeypatch.setattr(supabase_module, "supabase", FailingSupabase())
    monkeypatch.setattr(
        auth_module,
        "decode_token",
        lambda token: {"sub": "user-1", "email": "a@b.c", "role": "admin"},
    )
    return TestClient(app)


def test_metrics_returns_expected_keys(client):
    r = client.get("/dashboard/metrics", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {
        "total_robots",
        "active_cleaning",
        "attention_required",
        "cleaning_progress_today",
        "area_cleaned_today",
        "facility_status",
    }


def test_metrics_values_from_database(client):
    r = client.get("/dashboard/metrics", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()

    assert body["total_robots"] == 2
    assert body["active_cleaning"] == 1
    assert body["attention_required"] == 2
    assert body["facility_status"] == "operational"


def test_metrics_empty_database(empty_client):
    r = empty_client.get("/dashboard/metrics", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()

    assert body["total_robots"] == 0
    assert body["active_cleaning"] == 0
    assert body["attention_required"] == 0
    assert body["cleaning_progress_today"] == 0
    assert body["area_cleaned_today"] == 0
    assert body["facility_status"] == "offline"


def test_metrics_supabase_failure_returns_503(fail_client):
    r = fail_client.get("/dashboard/metrics", headers=AUTH_HEADERS)
    assert r.status_code == 503
    assert r.json()["detail"] == "Dashboard metrics are unavailable"
