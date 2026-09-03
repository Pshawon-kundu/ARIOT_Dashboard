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
        self._update_data = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, column, value):
        self._by = (column, value)
        return self

    def gte(self, column, value):
        self._filters.append((column, value, "gte"))
        return self

    def update(self, data):
        self._update_data = data
        return self

    def execute(self):
        data = list(self._store)
        if self._by is not None:
            column, value = self._by
            data = [r for r in data if r.get(column) == value]
        for column, value, op in self._filters:
            if op == "gte":
                data = [r for r in data if r.get(column, "") >= value]
        if self._update_data is not None and data:
            data = [{**r, **self._update_data} for r in data]
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
        ],
        "notifications": [
            {
                "id": "n1",
                "robot_id": "550e8400-e29b-41d4-a716-446655440001",
                "message": "Water low",
                "read": False,
                "created_at": "2026-09-02T08:00:00",
            },
            {
                "id": "n2",
                "robot_id": "550e8400-e29b-41d4-a716-446655440001",
                "message": "Task completed",
                "read": True,
                "created_at": "2026-09-02T09:00:00",
            },
        ],
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

            def update(self, *args, **kwargs):
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


def test_get_notifications(client):
    r = client.get("/notifications", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 2
    assert body[0]["id"] == "n1"
    assert body[0]["read"] is False
    assert body[1]["id"] == "n2"
    assert body[1]["read"] is True


def test_mark_notification_read_success(client):
    r = client.patch("/notifications/n1/read", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == "n1"
    assert body["read"] is True


def test_mark_notification_read_not_found(empty_client):
    r = empty_client.patch("/notifications/n999/read", headers=AUTH_HEADERS)
    assert r.status_code == 404
    assert r.json()["detail"] == "Notification not found"


def test_mark_notification_read_supabase_failure(fail_client):
    r = fail_client.patch("/notifications/n1/read", headers=AUTH_HEADERS)
    assert r.status_code == 503
    assert r.json()["detail"] == "Unable to update notification"
