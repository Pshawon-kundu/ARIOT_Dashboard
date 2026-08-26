import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import jwt
import pytest
from fastapi.testclient import TestClient

import app.supabase as supabase_module
import app.auth as auth_module
from app.main import app


class FakeAuth:
    def sign_up(self, data):
        class U:
            id = "user-reg"
            email = data["email"]

        class R:
            user = U()

        return R()

    def sign_in_with_password(self, data):
        class S:
            access_token = "real-jwt-token"

        class U:
            id = "user-login"
            email = data["email"]

        class R:
            session = S()
            user = U()

        return R()


class FakeTable:
    def __init__(self, store):
        self._store = store
        self._by = None

    def select(self, *args, **kwargs):
        return self

    def insert(self, *args, **kwargs):
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
    def __init__(self, store=None):
        self._store = store or {}
        self.auth = FakeAuth()

    def table(self, name):
        return FakeTable(self._store.get(name, []))


AUTH_HEADERS = {"Authorization": "Bearer test-token"}


@pytest.fixture
def raw_client(monkeypatch):
    # No decode_token patch: exercises the real JWT verification path.
    fake = FakeSupabase({})
    monkeypatch.setattr(supabase_module, "supabase", fake)
    monkeypatch.setattr(auth_module, "JWT_SECRET", "test-secret")
    return TestClient(app)


@pytest.fixture
def client(monkeypatch):
    store = {
        "profiles": [
            {
                "id": "user-1",
                "name": "Alice",
                "email": "alice@ariot.io",
                "role": "facility_manager",
                "facility_id": "facility-1",
            }
        ]
    }
    fake = FakeSupabase(store)
    monkeypatch.setattr(supabase_module, "supabase", fake)
    monkeypatch.setattr(
        auth_module,
        "decode_token",
        lambda token: {"sub": "user-1", "email": "alice@ariot.io", "role": "facility_manager"},
    )
    return TestClient(app)


def test_register(client):
    r = client.post(
        "/auth/register",
        json={
            "email": "bob@ariot.io",
            "password": "secret123",
            "name": "Bob",
            "role": "operator",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "bob@ariot.io"
    assert body["name"] == "Bob"
    assert body["role"] == "operator"
    assert body["id"] == "user-reg"


def test_register_invalid_role(client):
    r = client.post(
        "/auth/register",
        json={
            "email": "evil@ariot.io",
            "password": "secret123",
            "name": "Evil",
            "role": "superuser",
        },
    )
    assert r.status_code == 400


def test_login(client):
    r = client.post(
        "/auth/login",
        json={"email": "bob@ariot.io", "password": "secret123"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] == "real-jwt-token"
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "bob@ariot.io"


def test_me_authenticated(client):
    r = client.get("/auth/me", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == "user-1"
    assert body["email"] == "alice@ariot.io"
    assert body["name"] == "Alice"
    assert body["role"] == "facility_manager"
    assert body["facility_id"] == "facility-1"


def test_me_missing_token(client):
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_invalid_jwt_returns_401(raw_client):
    token = jwt.encode(
        {"sub": "user-1", "email": "a@b.c", "aud": "authenticated"},
        "test-secret",
        algorithm="HS256",
    )
    bad = token + "tampered"
    r = raw_client.get("/auth/me", headers={"Authorization": f"Bearer {bad}"})
    assert r.status_code == 401


def test_valid_jwt_returns_200(raw_client):
    token = jwt.encode(
        {"sub": "user-1", "email": "a@b.c", "aud": "authenticated"},
        "test-secret",
        algorithm="HS256",
    )
    r = raw_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["id"] == "user-1"
