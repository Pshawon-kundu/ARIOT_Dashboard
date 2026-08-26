from fastapi import APIRouter, Depends, HTTPException
from app.supabase import supabase
from app.auth import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/overview")
def dashboard_overview():
    try:
        robots_resp = (
            supabase
            .table("robots")
            .select("*")
            .execute()
        )
        robots = robots_resp.data

        events_resp = (
            supabase
            .table("cleaning_events")
            .select("*")
            .limit(10)
            .execute()
        )
        events = sorted(
            events_resp.data,
            key=lambda e: e.get("created_at") or "",
            reverse=True
        )

        notifs_resp = (
            supabase
            .table("notifications")
            .select("*")
            .execute()
        )
        active_notifications = [
            n for n in notifs_resp.data
            if not n.get("read", False)
        ]

        return {
            "robots": robots,
            "recent_cleaning_events": events,
            "active_notifications": active_notifications,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Supabase connection failed: {exc}"
        )
