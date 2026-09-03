from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app import supabase as supabase_module
from app.auth import User, get_current_user
from app.main import app
from app.services import simulator_client


ROBOT_A = "robot-a"
ROBOT_B = "robot-b"
AUTH_HEADERS = {"Authorization": "Bearer master-user-test-token"}


class FakeQuery:
    def __init__(self, database, table):
        self.database = database
        self.table = table
        self.filters = []
        self.operation = "select"
        self.payload = None
        self.limit_count = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def gte(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, count):
        self.limit_count = count
        return self

    def update(self, payload):
        self.operation = "update"
        self.payload = dict(payload)
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = dict(payload)
        return self

    def execute(self):
        rows = self.database.store.setdefault(self.table, [])
        matches = list(rows)
        for column, value in self.filters:
            matches = [row for row in matches if row.get(column) == value]
        if self.limit_count is not None:
            matches = matches[: self.limit_count]
        if self.operation == "update":
            for row in matches:
                row.update(self.payload)
        elif self.operation == "insert":
            rows.append(dict(self.payload))
            matches = [dict(self.payload)]
        return SimpleNamespace(data=[dict(row) for row in matches])


class FakeSupabase:
    def __init__(self):
        self.store = {
            "robots": [
                {"id": ROBOT_A, "name": "Robot A", "facility_id": "facility-a", "status": "ready"},
                {"id": ROBOT_B, "name": "Robot B", "facility_id": "facility-b", "status": "ready"},
            ],
            "cleaning_jobs": [
                {"id": "job-a", "robot_id": ROBOT_A, "facility_id": "facility-a", "detected_events": []},
                {"id": "job-b", "robot_id": ROBOT_B, "facility_id": "facility-b", "detected_events": []},
            ],
            "notifications": [
                {"id": "notification-a", "robot_id": ROBOT_A, "facility_id": "facility-a", "read": False},
                {"id": "notification-b", "robot_id": ROBOT_B, "facility_id": "facility-b", "read": False},
            ],
            "cleaning_events": [
                {"id": "event-a", "robot_id": ROBOT_A, "type": "spill"},
                {"id": "event-b", "robot_id": ROBOT_B, "type": "obstacle"},
            ],
            "events": [
                {"id": "raw-event-a", "robot_id": ROBOT_A},
                {"id": "raw-event-b", "robot_id": ROBOT_B},
            ],
        }

    def table(self, name):
        return FakeQuery(self, name)


@pytest.fixture
def master_user_client(monkeypatch):
    database = FakeSupabase()
    monkeypatch.setattr(supabase_module, "supabase", database)
    monkeypatch.setattr(
        simulator_client,
        "get_simulation_status",
        lambda: {"robot_id": ROBOT_B, "status": "IDLE", "battery": {"percent": 100}},
    )
    monkeypatch.setattr(
        simulator_client,
        "start_simulation",
        lambda: {"status": "STARTED", "message": "started"},
    )

    app.dependency_overrides[get_current_user] = lambda: User(
        id="master-user",
        name="Master User",
        email="master@example.com",
        role="viewer",
        facility_id=None,
    )
    yield TestClient(app), database
    app.dependency_overrides.clear()


@pytest.mark.parametrize(
    "path",
    ["/dashboard/overview", "/robots", "/notifications", "/cleaning/jobs"],
)
def test_authenticated_unassigned_viewer_has_operational_read_access(
    master_user_client, path
):
    client, _ = master_user_client
    response = client.get(path, headers=AUTH_HEADERS, follow_redirects=True)
    assert response.status_code == 200


def test_authenticated_viewer_sees_all_robots(master_user_client):
    client, _ = master_user_client
    response = client.get("/robots", headers=AUTH_HEADERS, follow_redirects=True)
    assert {robot["id"] for robot in response.json()} == {ROBOT_A, ROBOT_B}


def test_authenticated_viewer_can_access_any_robot(master_user_client):
    client, _ = master_user_client
    response = client.get(f"/robots/{ROBOT_B}/situation", headers=AUTH_HEADERS)
    assert response.status_code == 200


def test_authenticated_viewer_can_start_robot(master_user_client):
    client, _ = master_user_client
    response = client.post(f"/robots/{ROBOT_B}/start", headers=AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json()["command"] == "start"


def test_authenticated_viewer_can_read_any_cleaning_job(master_user_client):
    client, _ = master_user_client
    response = client.get("/cleaning/jobs/job-b", headers=AUTH_HEADERS)
    assert response.status_code == 200


def test_authenticated_viewer_can_mark_notification_read(master_user_client):
    client, database = master_user_client
    response = client.patch("/notifications/notification-b/read", headers=AUTH_HEADERS)
    assert response.status_code == 200
    assert database.store["notifications"][1]["read"] is True


def test_authenticated_viewer_can_discover_simulator_robot(master_user_client):
    client, _ = master_user_client
    response = client.get("/robots/simulator", headers=AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json() == {"robot_id": ROBOT_B, "available": True}


def test_unassigned_master_user_auth_me_still_works(master_user_client):
    client, _ = master_user_client
    response = client.get("/auth/me", headers=AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json()["id"] == "master-user"


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/dashboard/overview"),
        ("get", "/robots"),
        ("post", f"/robots/{ROBOT_B}/start"),
    ],
)
def test_operational_routes_still_require_authentication(monkeypatch, method, path):
    app.dependency_overrides.clear()
    monkeypatch.setattr(supabase_module, "supabase", FakeSupabase())
    response = getattr(TestClient(app), method)(path, follow_redirects=True)
    assert response.status_code == 401
