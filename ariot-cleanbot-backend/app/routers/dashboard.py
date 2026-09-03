import logging

from fastapi import APIRouter, Depends, HTTPException
from app.auth import User, _DEV_MODE, get_current_user
from app import supabase as _sb
from app.schemas.models import DashboardMetrics

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)

logger = logging.getLogger(__name__)

# Dev-mode fallback data when Supabase is not configured
_DEV_ROBOTS = [
    {
        "id": "dev-robot-001",
        "name": "CleanBot 01",
        "model": "ARIOT-X1",
        "status": "ready",
        "location": "Lobby",
    }
]


@router.get("/overview")
def dashboard_overview(user: User = Depends(get_current_user)):
    # In dev mode, return lightweight fallback data so the dashboard
    # loads without requiring a Supabase connection.
    if _DEV_MODE:
        return {
            "robots": _DEV_ROBOTS,
            "recent_cleaning_events": [],
            "active_notifications": [],
        }

    try:
        robots = _sb.supabase.table("robots").select("*").execute().data or []
        events_resp = _sb.supabase.table("cleaning_events").select("*").limit(10).execute()
        event_rows = events_resp.data or []
        events = sorted(event_rows, key=lambda event: event.get("created_at") or "", reverse=True)

        notifs_resp = _sb.supabase.table("notifications").select("*").execute()
        active_notifications = [
            n for n in (notifs_resp.data or [])
            if not n.get("read", False)
        ]

        logger.debug(
            "Dashboard overview loaded: robots=%d events=%d notifications=%d",
            len(robots),
            len(events),
            len(active_notifications),
        )

        return {
            "robots": robots,
            "recent_cleaning_events": events,
            "active_notifications": active_notifications,
        }

    except Exception:
        logger.error("Dashboard overview query failed")
        raise HTTPException(status_code=503, detail="Dashboard data is unavailable")


@router.get("/metrics", response_model=DashboardMetrics)
def dashboard_metrics(user: User = Depends(get_current_user)):
    """Return aggregated dashboard metrics from Supabase."""
    try:
        robots_resp = _sb.supabase.table("robots").select("*").execute()
        robots = robots_resp.data or []

        total_robots = len(robots)
        active_cleaning = sum(1 for r in robots if r.get("status") == "cleaning")

        notifs_resp = _sb.supabase.table("notifications").select("*").execute()
        notifications = notifs_resp.data or []
        attention_required = sum(
            1 for n in notifications
            if not n.get("read", False) and n.get("severity") in ("warning", "error")
        )

        from datetime import date

        today_start = date.today().isoformat()
        jobs_query = (
            _sb.supabase.table("cleaning_jobs")
            .select("progress", "completed_at")
            .gte("started_at", today_start)
        )
        jobs_resp = jobs_query.execute()
        jobs = jobs_resp.data or []

        if jobs:
            completed_jobs = [j for j in jobs if j.get("completed_at")]
            if completed_jobs:
                cleaning_progress_today = int(
                    sum(j.get("progress", 0) for j in completed_jobs) / len(completed_jobs)
                )
            else:
                cleaning_progress_today = 0
        else:
            cleaning_progress_today = 0

        events_resp = (
            _sb.supabase.table("cleaning_events")
            .select("id")
            .gte("created_at", today_start)
            .execute()
        )
        event_count = len(events_resp.data or [])
        area_cleaned_today = event_count * 50

        facility_status = "operational" if total_robots > 0 else "offline"

        return DashboardMetrics(
            total_robots=total_robots,
            active_cleaning=active_cleaning,
            attention_required=attention_required,
            cleaning_progress_today=cleaning_progress_today,
            area_cleaned_today=area_cleaned_today,
            facility_status=facility_status,
        )

    except HTTPException:
        raise
    except Exception:
        logger.error("Dashboard metrics query failed")
        raise HTTPException(status_code=503, detail="Dashboard metrics are unavailable")
