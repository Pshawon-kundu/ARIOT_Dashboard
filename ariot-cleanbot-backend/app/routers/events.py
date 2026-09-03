import logging

from fastapi import APIRouter, Depends, HTTPException
from app.access import get_registered_robot
from app.auth import User, get_current_user
from app import supabase as _sb

router = APIRouter(
    prefix="/events",
    tags=["Events"],
)

logger = logging.getLogger(__name__)


@router.get("/")
def get_events(user: User = Depends(get_current_user)):
    if _sb.supabase is None:
        return []
    try:
        return _sb.supabase.table("events").select("*").execute().data
    except HTTPException:
        raise
    except Exception:
        logger.error("Events query failed")
        raise HTTPException(status_code=503, detail="Events are unavailable")


@router.post("/")
def create_event(event: dict, user: User = Depends(get_current_user)):
    if _sb.supabase is None:
        return []
    robot_id = event.get("robot_id")
    if not robot_id:
        raise HTTPException(status_code=400, detail="robot_id is required")
    get_registered_robot(str(robot_id))
    safe_event = dict(event)
    safe_event["robot_id"] = str(robot_id)
    try:
        return _sb.supabase.table("events").insert(safe_event).execute().data
    except Exception:
        logger.error("Event creation failed")
        raise HTTPException(status_code=503, detail="Unable to create event")
