import logging

from fastapi import APIRouter, Depends, HTTPException
from app.access import get_registered_robot
from app.auth import User, get_current_user, require_role
from app import supabase as _sb
from datetime import datetime, timezone
from pydantic import BaseModel
from app.supabase import supabase

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)

logger = logging.getLogger(__name__)


@router.get("/")
def get_notifications(user: User = Depends(get_current_user)):
    if _sb.supabase is None:
        return []
    try:
        return _sb.supabase.table("notifications").select("*").execute().data
    except Exception:
        logger.error("Notifications query failed")
        raise HTTPException(status_code=503, detail="Notifications are unavailable")


@router.post("/")
def create_notification(
    notification: dict,
    user: User = Depends(get_current_user),
):
    if _sb.supabase is None:
        return []
    robot_id = notification.get("robot_id")
    if not robot_id:
        raise HTTPException(status_code=400, detail="robot_id is required")
    robot = get_registered_robot(str(robot_id))
    safe_notification = dict(notification)
    safe_notification["robot_id"] = str(robot_id)
    safe_notification["facility_id"] = robot.get("facility_id")
    try:
        response = _sb.supabase.table("notifications").insert(safe_notification).execute()
        return response.data
    except Exception:
        logger.error("Notification creation failed")
        raise HTTPException(status_code=503, detail="Unable to create notification")


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    user: User = Depends(get_current_user),
):
    if _sb.supabase is None:
        return {"error": "No database connected"}
    try:
        query = (
            _sb.supabase
            .table("notifications")
            .update({"read": True})
            .eq("id", notification_id)
        )
        response = query.execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"id": notification_id, "read": True}
    except HTTPException:
        raise
    except Exception:
        logger.error("Notification update failed")
        raise HTTPException(status_code=503, detail="Unable to update notification")
class NotificationCreate(BaseModel):
    robot_id: str | None = None
    facility_id: str | None = None
    severity: str
    title: str
    message: str
    status: str | None = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _list_row(n: dict) -> dict:
    return {
        "id": n.get("id"),
        "robot_id": n.get("robot_id"),
        "severity": n.get("severity"),
        "title": n.get("title"),
        "message": n.get("message"),
        "status": n.get("status"),
        "created_at": n.get("created_at"),
    }


def _get_notification(notification_id: str) -> dict:
    resp = (
        supabase.table("notifications")
        .select("*")
        .eq("id", notification_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return resp.data[0]


def _check_facility_access(notification: dict, user: User):
    if user.role == "admin":
        return
    if not user.facility_id:
        raise HTTPException(status_code=403, detail="No facility assigned")
    if str(notification.get("facility_id")) != str(user.facility_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this notification",
        )


@router.get("")
def list_notifications(user: User = Depends(get_current_user)):
    try:
        query = supabase.table("notifications").select("*")
        if user.role != "admin":
            if not user.facility_id:
                return []
            query = query.eq("facility_id", user.facility_id)
        resp = query.order("created_at", desc=True).execute()
        return [_list_row(n) for n in (resp.data or [])]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")


@router.get("/{notification_id}")
def get_notification(
    notification_id: str,
    user: User = Depends(get_current_user),
):
    try:
        notification = _get_notification(notification_id)
        _check_facility_access(notification, user)
        return notification
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")


@router.patch("/{notification_id}/read")
def mark_read(
    notification_id: str,
    user: User = Depends(get_current_user),
):
    try:
        notification = _get_notification(notification_id)
        _check_facility_access(notification, user)

        updates = {"read": True}
        if notification.get("status") in (None, "unread"):
            updates["status"] = "read"

        resp = (
            supabase.table("notifications")
            .update(updates)
            .eq("id", notification_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=503, detail="Failed to update notification")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")


@router.patch("/{notification_id}/resolve")
def resolve_notification(
    notification_id: str,
    user: User = Depends(get_current_user),
):
    try:
        notification = _get_notification(notification_id)
        _check_facility_access(notification, user)

        updates = {
            "status": "resolved",
            "read": True,
            "resolved_at": _now(),
        }
        resp = (
            supabase.table("notifications")
            .update(updates)
            .eq("id", notification_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=503, detail="Failed to resolve notification")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")


@router.post("")
def create_notification(
    payload: NotificationCreate,
    user: User = Depends(require_role("admin", "service")),
):
    try:
        row = {
            "robot_id": payload.robot_id,
            "facility_id": payload.facility_id,
            "severity": payload.severity,
            "title": payload.title,
            "message": payload.message,
            "status": payload.status or "unread",
            "read": False,
            "created_at": _now(),
        }
        resp = supabase.table("notifications").insert(row).execute()
        if not resp.data:
            raise HTTPException(status_code=503, detail="Failed to create notification")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")
