import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

import app.supabase as supabase_module
import app.auth as auth_module
import app.routers.facilities as facilities_module
from app.main import app

AUTH_HEADERS = {"Authorization": "Bearer test-token"}


class FakeTable:
    def __init__(self, store):
        self._store = store
        self._by = None
        self._op = None
        self._result = None

    def select(self, *args, **kwargs):
        self._op = "select"
        return self

    def insert(self, payload):
        row = dict(payload)
        if "id" not in row:
            row["id"] = f"gen-{len(self._store) + 1}"
        self._store.append(row)
        self._op = "insert"
        self._result = [row]
        return self

    def update(self, payload):
        self._op = "update"
        self._payload = payload
        self._result = []
        return self

    def delete(self):
        self._op = "delete"
        self._result = []
        return self

    def eq(self, column, value):
        self._by = (column, value)
        return self

    def order(self, *args, **kwargs):
        return self

    def execute(self):
        if self._op == "insert":
            return type("Resp", (), {"data": self._result})()
        if self._op == "update":
            column, value = self._by
            matched = [r for r in self._store if r.get(column) == value]
            for r in matched:
                r.update(self._payload)
            return type("Resp", (), {"data": matched})()
        if self._op == "delete":
            column, value = self._by
            self._store[:] = [r for r in self._store if r.get(column) != value]
            return type("Resp", (), {"data": self._result})()
        if self._by is None:
            return type("Resp", (), {"data": list(self._store)})()
        column, value = self._by
        data = [r for r in self._store if r.get(column) == value]
        return type("Resp", (), {"data": data})()


class FakeSupabase:
    def __init__(self, store=None):
        self._store = store or {}

    def table(self, name):
        return FakeTable(self._store.get(name, []))


@pytest.fixture
def client(monkeypatch):
    store = {
        "facilities": [
            {
                "id": "fac-1",
                "name": "ABC Hospital",
                "location": "Dhaka",
                "created_at": "2026-08-26T08:00:00",
            },
            {
                "id": "fac-2",
                "name": "XYZ Office",
                "location": "Chittagong",
                "created_at": "2026-08-26T09:00:00",
            },
        ],
        "floors": [
            {"id": "fl-1", "name": "Ground Floor", "facility_id": "fac-1"},
            {"id": "fl-2", "name": "First Floor", "facility_id": "fac-1"},
        ],
        "robots": [
            {"id": "rb-1", "name": "CleanBot 01", "status": "cleaning", "facility_id": "fac-1"},
        ],
    }
    fake = FakeSupabase(store)
    monkeypatch.setattr(supabase_module, "supabase", fake)
    monkeypatch.setattr(facilities_module, "supabase", fake)
    return TestClient(app)


def _auth(monkeypatch, role, facility_id=None):
    monkeypatch.setattr(
        auth_module,
        "decode_token",
        lambda token: {
            "sub": "user-1",
            "email": "a@b.c",
            "role": role,
            "facility_id": facility_id,
        },
    )


def test_admin_can_create_facility(client, monkeypatch):
    _auth(monkeypatch, "admin")
    r = client.post(
        "/facilities",
        json={"name": "New Facility", "location": "Sylhet"},
        headers=AUTH_HEADERS,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "New Facility"
    assert body["location"] == "Sylhet"
    assert "id" in body


def test_admin_can_view_all_facilities(client, monkeypatch):
    _auth(monkeypatch, "admin")
    r = client.get("/facilities", headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_facility_manager_views_assigned_facility(client, monkeypatch):
    _auth(monkeypatch, "facility_manager", facility_id="fac-1")
    r = client.get("/facilities", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["id"] == "fac-1"

    detail = client.get("/facilities/fac-1", headers=AUTH_HEADERS)
    assert detail.status_code == 200
    d = detail.json()
    assert d["name"] == "ABC Hospital"
    assert len(d["floors"]) == 2
    assert len(d["robots"]) == 1
    assert d["robots"][0]["status"] == "cleaning"


def test_user_cannot_access_another_facility(client, monkeypatch):
    _auth(monkeypatch, "facility_manager", facility_id="fac-1")
    r = client.get("/facilities/fac-2", headers=AUTH_HEADERS)
    assert r.status_code == 403


def test_invalid_token_returns_401(client):
    r = client.get("/facilities")
    assert r.status_code == 401


def test_invalid_role_returns_403(client, monkeypatch):
    _auth(monkeypatch, "operator")
    r = client.post(
        "/facilities",
        json={"name": "Hacked", "location": "Nowhere"},
        headers=AUTH_HEADERS,
    )
    assert r.status_code == 403


def test_facility_manager_cannot_update_other_facility(client, monkeypatch):
    _auth(monkeypatch, "facility_manager", facility_id="fac-1")
    r = client.put(
        "/facilities/fac-2",
        json={"name": "Renamed"},
        headers=AUTH_HEADERS,
    )
    assert r.status_code == 403


def test_admin_can_update_facility(client, monkeypatch):
    _auth(monkeypatch, "admin")
    r = client.put(
        "/facilities/fac-1",
        json={"name": "Renamed Hospital"},
        headers=AUTH_HEADERS,
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed Hospital"


def test_admin_can_delete_facility(client, monkeypatch):
    _auth(monkeypatch, "admin")
    r = client.delete("/facilities/fac-1", headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert r.json()["deleted"] is True

    remaining = client.get("/facilities", headers=AUTH_HEADERS)
    assert remaining.status_code == 200
    assert all(f["id"] != "fac-1" for f in remaining.json())
