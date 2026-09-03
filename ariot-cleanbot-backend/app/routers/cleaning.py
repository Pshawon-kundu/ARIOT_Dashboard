import logging

from fastapi import APIRouter, Depends, HTTPException
from app.access import get_registered_robot
from app.auth import User, get_current_user
from app import supabase as _sb

router = APIRouter(
    prefix="/cleaning",
    tags=["Cleaning"],
)

logger = logging.getLogger(__name__)


@router.get("/jobs")
def list_cleaning_jobs(user: User = Depends(get_current_user)):
    if _sb.supabase is None:
        return []
    try:
        jobs_query = (
            _sb.supabase
            .table("cleaning_jobs")
            .select("*")
            .order("started_at", desc=True)
        )
        jobs_resp = jobs_query.execute()
        jobs = jobs_resp.data or []

        robots_query = (
            _sb.supabase
            .table("robots")
            .select("id, name")
        )
        robots_resp = robots_query.execute()
        robot_map = {
            str(r.get("id")): r.get("name") for r in (robots_resp.data or [])
        }

        return [
            {
                "id": job.get("id"),
                "robot_id": job.get("robot_id"),
                "robot_name": robot_map.get(str(job.get("robot_id")), "Unknown"),
                "floor": job.get("floor"),
                "zone": job.get("zone"),
                "status": job.get("status"),
                "progress": job.get("progress"),
                "started_at": job.get("started_at"),
                "completed_at": job.get("completed_at"),
                "coverage": job.get("coverage"),
            }
            for job in jobs
        ]

    except Exception:
        logger.error("Cleaning jobs query failed")
        raise HTTPException(status_code=503, detail="Cleaning jobs are unavailable")


@router.get("/jobs/{job_id}")
def get_cleaning_job(job_id: str, user: User = Depends(get_current_user)):
    if _sb.supabase is None:
        raise HTTPException(status_code=404, detail="No database connected")
    try:
        job_query = (
            _sb.supabase
            .table("cleaning_jobs")
            .select("*")
            .eq("id", job_id)
        )
        job_resp = job_query.execute()

        if not job_resp.data:
            raise HTTPException(
                status_code=404,
                detail=f"Cleaning job {job_id} not found"
            )

        job = job_resp.data[0]
        robot_id = job.get("robot_id")

        robot_name = "Unknown"
        if robot_id is not None:
            robot = get_registered_robot(str(robot_id), "id,name")
            robot_name = robot.get("name", "Unknown")

        return {
            "id": job.get("id"),
            "robot": robot_name,
            "floor": job.get("floor"),
            "zone": job.get("zone"),
            "status": job.get("status"),
            "progress": job.get("progress"),
            "coverage": job.get("coverage"),
            "path": job.get("path"),
            "detected_events": job.get("detected_events") or [],
            "started_at": job.get("started_at"),
            "completed_at": job.get("completed_at"),
        }

    except HTTPException:
        raise
    except Exception:
        logger.error("Cleaning job detail query failed")
        raise HTTPException(status_code=503, detail="Cleaning job is unavailable")
