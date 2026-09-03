import io
import os
import sys
import time
from types import SimpleNamespace
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import jwt
import pytest
from fastapi.testclient import TestClient
from PIL import Image

import app.auth as auth_module
import app.supabase as supabase_module
from app.main import app


AUTH_HEADERS = {"Authorization": "Bearer test-token"}


class FakeTable:
    def __init__(self, owner, name):
        self.owner = owner
        self.name = name
        self.operation = "select"
        self.payload = None
        self.filter = None

    def select(self, *args, **kwargs):
        self.operation = "select"
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = dict(payload)
        return self

    def update(self, payload):
        self.operation = "update"
        self.payload = dict(payload)
        return self

    def eq(self, column, value):
        self.filter = (column, value)
        return self

    def order(self, *args, **kwargs):
        return self

    def execute(self):
        if self.owner.table_failure:
            raise RuntimeError("private database detail")
        rows = self.owner.store.setdefault(self.name, [])
        if self.operation == "insert":
            rows.append(dict(self.payload))
            return SimpleNamespace(data=[dict(self.payload)])
        matching = rows
        if self.filter:
            key, value = self.filter
            matching = [row for row in rows if row.get(key) == value]
        if self.operation == "update":
            for row in matching:
                row.update(self.payload)
            return SimpleNamespace(data=[dict(row) for row in matching])
        return SimpleNamespace(data=[dict(row) for row in matching])


class FakeStorageBucket:
    def __init__(self, owner):
        self.owner = owner

    def upload(self, path, data, options):
        if self.owner.storage_failure:
            raise RuntimeError("private storage detail")
        self.owner.uploads.append((path, data, options))
        return {"path": path}

    def create_signed_url(self, path, expires_in):
        if self.owner.signed_url_failure:
            raise RuntimeError("private signing detail")
        self.owner.signed_requests.append((path, expires_in))
        return {"signedURL": f"https://signed.test/{path}?ttl={expires_in}"}


class FakeStorage:
    def __init__(self, owner):
        self.owner = owner

    def from_(self, bucket):
        assert bucket == "avatars"
        return FakeStorageBucket(self.owner)


class FakeAuth:
    def __init__(self):
        self.admin = self
        self.signup_session = None
        self.signup_duplicate = False
        self.signup_failure = None
        self.create_failure = None
        self.signin_failure = None
        self.update_failure = None
        self.signup_calls = []
        self.create_calls = []
        self.delete_calls = []
        self.signin_calls = []
        self.update_calls = []

    def sign_up(self, data):
        self.signup_calls.append(dict(data))
        if self.signup_failure:
            raise self.signup_failure
        identities = [] if self.signup_duplicate else [SimpleNamespace(id="identity")]
        return SimpleNamespace(
            user=SimpleNamespace(id="user-reg", email=data["email"], identities=identities),
            session=self.signup_session,
        )

    def create_user(self, data):
        self.create_calls.append(dict(data))
        if self.create_failure:
            raise self.create_failure
        return SimpleNamespace(
            user=SimpleNamespace(id="user-reg", email=data["email"]),
        )

    def delete_user(self, user_id, should_soft_delete=False):
        self.delete_calls.append((user_id, should_soft_delete))

    def sign_in_with_password(self, data):
        self.signin_calls.append(dict(data))
        if self.signin_failure:
            raise self.signin_failure
        return SimpleNamespace(
            session=SimpleNamespace(access_token="real-jwt-token"),
            user=SimpleNamespace(id="user-login", email=data["email"]),
        )

    def update_user(self, data):
        self.update_calls.append(dict(data))
        if self.update_failure:
            raise self.update_failure
        return SimpleNamespace(user=SimpleNamespace(id="user-1"))


class FakeAuthApiError(Exception):
    def __init__(self, message, *, status=None, code=None):
        super().__init__(message)
        self.status = status
        self.code = code


class FakeSupabase:
    def __init__(self, store=None):
        self.store = store or {}
        self.auth = FakeAuth()
        self.storage = FakeStorage(self)
        self.uploads = []
        self.signed_requests = []
        self.table_failure = False
        self.storage_failure = False
        self.signed_url_failure = False

    def table(self, name):
        return FakeTable(self, name)


@pytest.fixture
def auth_clients(monkeypatch):
    store = {
        "profiles": [
            {
                "id": "user-1",
                "name": "Alice",
                "email": "alice@ariot.io",
                "role": "facility_manager",
                "facility_id": "facility-1",
                "avatar_path": None,
            }
        ]
    }
    service = FakeSupabase(store)
    request = FakeSupabase()
    monkeypatch.setattr(auth_module, "_DEV_MODE", False)
    monkeypatch.setattr(
        auth_module,
        "decode_token",
        lambda token: {"sub": "user-1", "email": "untrusted@token.test"},
    )
    monkeypatch.setattr(supabase_module, "get_service_client", lambda: service)
    monkeypatch.setattr(supabase_module, "create_request_client", lambda: request)
    return TestClient(app), service, request


def image_bytes(image_format="JPEG", size=(64, 48)):
    output = io.BytesIO()
    Image.new("RGBA" if image_format == "PNG" else "RGB", size, (20, 100, 180)).save(
        output, format=image_format
    )
    return output.getvalue()


def test_valid_registration(auth_clients):
    client, _, _ = auth_clients
    response = client.post(
        "/auth/register",
        json={"name": "  Bob User  ", "email": "bob@ariot.io", "password": "secret123"},
    )
    assert response.status_code == 201
    assert response.json() == {
        "user": {"id": "user-reg", "email": "bob@ariot.io", "name": "Bob User"},
    }


def test_registration_uses_admin_create_user_and_confirms_email(auth_clients):
    client, service, request = auth_clients
    response = client.post(
        "/auth/register",
        json={"name": "Bob User", "email": "bob@ariot.io", "password": "secret123"},
    )
    assert response.status_code == 201
    assert service.auth.create_calls == [
        {
            "email": "bob@ariot.io",
            "password": "secret123",
            "email_confirm": True,
        }
    ]
    assert request.auth.signup_calls == []


def test_registration_defaults_to_viewer(auth_clients):
    client, service, _ = auth_clients
    client.post(
        "/auth/register",
        json={"name": "Bob User", "email": "bob@ariot.io", "password": "secret123"},
    )
    assert service.store["profiles"][-1]["role"] == "viewer"


def test_registration_facility_is_null(auth_clients):
    client, service, _ = auth_clients
    client.post(
        "/auth/register",
        json={"name": "Bob User", "email": "bob@ariot.io", "password": "secret123"},
    )
    assert service.store["profiles"][-1]["facility_id"] is None


def test_registration_rejects_malicious_role(auth_clients):
    client, service, _ = auth_clients
    response = client.post(
        "/auth/register",
        json={
            "name": "Evil User",
            "email": "evil@ariot.io",
            "password": "secret123",
            "role": "admin",
        },
    )
    assert response.status_code == 422
    assert len(service.store["profiles"]) == 1


def test_registration_rejects_malicious_facility(auth_clients):
    client, _, _ = auth_clients
    response = client.post(
        "/auth/register",
        json={
            "name": "Evil User",
            "email": "evil@ariot.io",
            "password": "secret123",
            "facility_id": "other-facility",
        },
    )
    assert response.status_code == 422


def test_registration_duplicate_email(auth_clients):
    client, service, _ = auth_clients
    service.auth.create_failure = FakeAuthApiError(
        "A user with this email address has already been registered",
        status=422,
        code="email_exists",
    )
    response = client.post(
        "/auth/register",
        json={"name": "Bob User", "email": "bob@ariot.io", "password": "secret123"},
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_registration_malformed_email(auth_clients):
    client, _, _ = auth_clients
    response = client.post(
        "/auth/register",
        json={"name": "Bob User", "email": "not-an-email", "password": "secret123"},
    )
    assert response.status_code == 422


def test_registration_short_password(auth_clients):
    client, _, _ = auth_clients
    response = client.post(
        "/auth/register",
        json={"name": "Bob User", "email": "bob@ariot.io", "password": "short"},
    )
    assert response.status_code == 422


def test_registration_does_not_depend_on_signup_email_delivery(auth_clients):
    client, service, request = auth_clients
    request.auth.signup_failure = FakeAuthApiError(
        "email rate limit exceeded",
        status=429,
        code="over_email_send_rate_limit",
    )
    response = client.post(
        "/auth/register",
        json={"name": "Bob User", "email": "bob@ariot.io", "password": "secret123"},
    )
    assert response.status_code == 201
    assert service.auth.create_calls[0]["email_confirm"] is True
    assert request.auth.signup_calls == []


def test_registration_provider_error_is_safe(auth_clients):
    client, service, _ = auth_clients
    service.auth.create_failure = RuntimeError("secret provider response")
    response = client.post(
        "/auth/register",
        json={"name": "Bob User", "email": "bob@ariot.io", "password": "secret123"},
    )
    assert response.status_code == 502
    assert "secret provider response" not in response.text


def test_registration_email_rate_limit_returns_safe_429(auth_clients):
    client, service, _ = auth_clients
    service.auth.create_failure = FakeAuthApiError(
        "email rate limit exceeded",
        status=429,
        code="over_email_send_rate_limit",
    )
    response = client.post(
        "/auth/register",
        json={"name": "Bob User", "email": "bob@ariot.io", "password": "secret123"},
    )
    assert response.status_code == 429
    assert response.json() == {
        "detail": "Registration is temporarily unavailable. Please try again later."
    }
    assert "over_email_send_rate_limit" not in response.text


def test_registration_profile_insert_failure_is_safe(auth_clients):
    client, service, _ = auth_clients
    service.table_failure = True
    response = client.post(
        "/auth/register",
        json={"name": "Bob User", "email": "bob@ariot.io", "password": "secret123"},
    )
    assert response.status_code == 500
    assert "private database detail" not in response.text
    assert service.auth.delete_calls == [("user-reg", False)]


def test_login(auth_clients):
    client, _, _ = auth_clients
    response = client.post(
        "/auth/login", json={"email": "bob@ariot.io", "password": "secret123"}
    )
    assert response.status_code == 200
    assert response.json()["access_token"] == "real-jwt-token"


def test_get_current_profile_uses_profiles_table(auth_clients):
    client, _, _ = auth_clients
    response = client.get("/auth/me", headers=AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json() == {
        "id": "user-1",
        "name": "Alice",
        "email": "alice@ariot.io",
        "role": "facility_manager",
        "facility_id": "facility-1",
        "avatar_url": None,
    }


def test_get_current_profile_returns_signed_avatar_url(auth_clients):
    client, service, _ = auth_clients
    service.store["profiles"][0]["avatar_path"] = "user-1/avatar.webp"
    response = client.get("/auth/me", headers=AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json()["avatar_url"].startswith("https://signed.test/user-1/avatar.webp")
    assert "avatar_path" not in response.json()


def test_update_own_name(auth_clients):
    client, service, _ = auth_clients
    response = client.patch("/auth/me", headers=AUTH_HEADERS, json={"name": "Alice Smith"})
    assert response.status_code == 200
    assert response.json()["name"] == "Alice Smith"
    assert service.store["profiles"][0]["name"] == "Alice Smith"


def test_update_name_requires_auth(auth_clients):
    client, _, _ = auth_clients
    assert client.patch("/auth/me", json={"name": "Alice Smith"}).status_code == 401


@pytest.mark.parametrize("field,value", [("role", "admin"), ("facility_id", "other")])
def test_update_profile_rejects_privilege_fields(auth_clients, field, value):
    client, service, _ = auth_clients
    response = client.patch(
        "/auth/me", headers=AUTH_HEADERS, json={"name": "Alice Smith", field: value}
    )
    assert response.status_code == 422
    assert service.store["profiles"][0][field] != value


def test_update_profile_has_no_target_user_id(auth_clients):
    client, service, _ = auth_clients
    response = client.patch(
        "/auth/me",
        headers=AUTH_HEADERS,
        json={"name": "Alice Smith", "user_id": "victim"},
    )
    assert response.status_code == 422
    assert service.store["profiles"][0]["name"] == "Alice"


def test_valid_password_change_uses_isolated_client(auth_clients):
    client, _, request = auth_clients
    response = client.patch(
        "/auth/password",
        headers=AUTH_HEADERS,
        json={"current_password": "old-secret", "new_password": "new-secret-123"},
    )
    assert response.status_code == 200
    assert response.json() == {"success": True}
    assert request.auth.signin_calls[-1] == {
        "email": "alice@ariot.io",
        "password": "old-secret",
    }
    assert request.auth.update_calls[-1] == {"password": "new-secret-123"}


def test_incorrect_current_password(auth_clients):
    client, _, request = auth_clients
    request.auth.signin_failure = RuntimeError("invalid credentials")
    response = client.patch(
        "/auth/password",
        headers=AUTH_HEADERS,
        json={"current_password": "wrong", "new_password": "new-secret-123"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Current password is incorrect"


def test_new_password_too_short(auth_clients):
    client, _, request = auth_clients
    response = client.patch(
        "/auth/password",
        headers=AUTH_HEADERS,
        json={"current_password": "old-secret", "new_password": "short"},
    )
    assert response.status_code == 422
    assert request.auth.signin_calls == []


def test_password_change_requires_auth(auth_clients):
    client, _, _ = auth_clients
    response = client.patch(
        "/auth/password",
        json={"current_password": "old-secret", "new_password": "new-secret-123"},
    )
    assert response.status_code == 401


def test_password_provider_failure_is_safe(auth_clients):
    client, _, request = auth_clients
    request.auth.update_failure = RuntimeError("secret provider response")
    response = client.patch(
        "/auth/password",
        headers=AUTH_HEADERS,
        json={"current_password": "old-secret", "new_password": "new-secret-123"},
    )
    assert response.status_code == 502
    assert "secret provider response" not in response.text


def test_valid_jpeg_avatar_upload(auth_clients):
    client, _, _ = auth_clients
    response = client.post(
        "/auth/me/avatar",
        headers=AUTH_HEADERS,
        files={"file": ("avatar.jpg", image_bytes("JPEG"), "image/jpeg")},
    )
    assert response.status_code == 200
    assert response.json()["avatar_url"].startswith("https://signed.test/")


@pytest.mark.parametrize(
    "image_format,mime,filename",
    [("PNG", "image/png", "avatar.png"), ("WEBP", "image/webp", "avatar.webp")],
)
def test_valid_png_and_webp_avatar_upload(auth_clients, image_format, mime, filename):
    client, _, _ = auth_clients
    response = client.post(
        "/auth/me/avatar",
        headers=AUTH_HEADERS,
        files={"file": (filename, image_bytes(image_format), mime)},
    )
    assert response.status_code == 200


def test_avatar_rejects_invalid_mime(auth_clients):
    client, _, _ = auth_clients
    response = client.post(
        "/auth/me/avatar",
        headers=AUTH_HEADERS,
        files={"file": ("avatar.svg", b"<svg></svg>", "image/svg+xml")},
    )
    assert response.status_code == 415


def test_avatar_rejects_spoofed_or_corrupt_image(auth_clients):
    client, _, _ = auth_clients
    response = client.post(
        "/auth/me/avatar",
        headers=AUTH_HEADERS,
        files={"file": ("avatar.jpg", b"not really an image", "image/jpeg")},
    )
    assert response.status_code == 400


def test_avatar_rejects_more_than_two_mb(auth_clients):
    client, _, _ = auth_clients
    response = client.post(
        "/auth/me/avatar",
        headers=AUTH_HEADERS,
        files={"file": ("avatar.png", b"x" * (2 * 1024 * 1024 + 1), "image/png")},
    )
    assert response.status_code == 413


def test_avatar_path_always_uses_authenticated_user(auth_clients):
    client, service, _ = auth_clients
    client.post(
        "/auth/me/avatar",
        headers=AUTH_HEADERS,
        files={"file": ("victim-id/avatar.jpg", image_bytes(), "image/jpeg")},
    )
    path, normalized, options = service.uploads[-1]
    assert path == "user-1/avatar.webp"
    assert normalized.startswith(b"RIFF")
    assert options["content-type"] == "image/webp"


def test_avatar_path_is_saved_to_profile(auth_clients):
    client, service, _ = auth_clients
    client.post(
        "/auth/me/avatar",
        headers=AUTH_HEADERS,
        files={"file": ("avatar.jpg", image_bytes(), "image/jpeg")},
    )
    assert service.store["profiles"][0]["avatar_path"] == "user-1/avatar.webp"


def test_avatar_upload_returns_new_signed_url(auth_clients):
    client, service, _ = auth_clients
    response = client.post(
        "/auth/me/avatar",
        headers=AUTH_HEADERS,
        files={"file": ("avatar.jpg", image_bytes(), "image/jpeg")},
    )
    assert response.json()["avatar_url"] == "https://signed.test/user-1/avatar.webp?ttl=3600"
    assert service.signed_requests[-1] == ("user-1/avatar.webp", 3600)


def test_avatar_upload_requires_auth(auth_clients):
    client, _, _ = auth_clients
    response = client.post(
        "/auth/me/avatar",
        files={"file": ("avatar.jpg", image_bytes(), "image/jpeg")},
    )
    assert response.status_code == 401


@pytest.fixture
def dev_client(monkeypatch):
    monkeypatch.setattr(auth_module, "_DEV_MODE", True)
    monkeypatch.setattr(auth_module, "DEV_JWT_SECRET", "unit-test-dev-secret-at-least-32-bytes")
    return TestClient(app)


def dev_token(secret, *, expires_in=300, audience="authenticated", issued_in=0):
    now = int(time.time())
    return jwt.encode(
        {
            "sub": "dev-user-1",
            "email": "dev@localhost.test",
            "name": "Dev User",
            "role": "operator",
            "facility_id": "facility-dev",
            "aud": audience,
            "iat": now + issued_in,
            "exp": now + expires_in,
        },
        secret,
        algorithm="HS256",
    )


def test_valid_dev_jwt_accepted(dev_client):
    token = dev_token("unit-test-dev-secret-at-least-32-bytes")
    response = dev_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["id"] == "dev-user-1"
    assert response.json()["role"] == "operator"
    assert response.json()["facility_id"] == "facility-dev"


def test_small_provider_clock_skew_is_accepted(dev_client):
    token = dev_token("unit-test-dev-secret-at-least-32-bytes", issued_in=3)
    response = dev_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_forged_dev_jwt_rejected(dev_client):
    token = dev_token("different-forged-secret-at-least-32-bytes")
    response = dev_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"


def test_expired_dev_jwt_rejected(dev_client):
    token = dev_token("unit-test-dev-secret-at-least-32-bytes", expires_in=-1)
    response = dev_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Token has expired"


def test_wrong_dev_audience_rejected(dev_client):
    token = dev_token(
        "unit-test-dev-secret-at-least-32-bytes", audience="wrong-audience"
    )
    response = dev_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_dev_login_mints_verified_hs256_token(dev_client):
    response = dev_client.post(
        "/auth/login", json={"email": "dev@example.com", "password": "anything"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    claims = jwt.decode(
        token,
        "unit-test-dev-secret-at-least-32-bytes",
        algorithms=["HS256"],
        audience="authenticated",
    )
    assert claims["sub"] == "dev-user-001"


def test_dev_mode_missing_token_rejected(dev_client):
    assert dev_client.get("/auth/me").status_code == 401


def test_invalid_es256_signature_rejected(monkeypatch):
    monkeypatch.setattr(auth_module, "_DEV_MODE", False)
    mock_jwks = MagicMock()
    mock_jwks.get_signing_key_from_jwt.side_effect = jwt.InvalidSignatureError()
    monkeypatch.setattr(auth_module, "_jwks_client", mock_jwks)
    response = TestClient(app).get(
        "/auth/me", headers={"Authorization": "Bearer forged-token"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"


def test_missing_bearer_token_rejected(auth_clients):
    client, _, _ = auth_clients
    response = client.get("/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing bearer token"
