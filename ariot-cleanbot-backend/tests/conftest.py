from types import SimpleNamespace

import pytest

import app.supabase as supabase_module


class _ProfileQuery:
    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def execute(self):
        return SimpleNamespace(
            data=[
                {
                    "id": "user-1",
                    "name": "Test User",
                    "email": "test@example.com",
                    "role": "admin",
                    "facility_id": None,
                    "avatar_path": None,
                }
            ]
        )


class _AuthServiceClient:
    def table(self, name):
        assert name == "profiles"
        return _ProfileQuery()


@pytest.fixture(autouse=True)
def configured_profile_service(monkeypatch):
    """Keep legacy endpoint tests focused on their router-level Supabase fakes."""
    monkeypatch.setattr(
        supabase_module,
        "get_service_client",
        lambda: _AuthServiceClient(),
    )
