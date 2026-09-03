import logging

from fastapi import APIRouter, Depends, HTTPException
from app.access import get_registered_robot
from app.auth import User, get_current_user
from app import supabase as _sb

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
