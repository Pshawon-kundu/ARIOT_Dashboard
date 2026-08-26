from fastapi import APIRouter, Depends, HTTPException
from app.supabase import supabase
from app.auth import get_current_user

router = APIRouter(
    prefix="/cleaning",
    tags=["Cleaning"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/jobs")
def list_cleaning_jobs():
    try:
        jobs_resp = (
            supabase
            .table("cleaning_jobs")
            .select("*")
            .order("started_at", desc=True)
            .execute()
        )
        jobs = jobs_resp.data or []

        robots_resp = (
            supabase
            .table("robots")
            .select("id, name")
            .execute()
        )
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

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Supabase connection failed: {exc}"
        )


@router.get("/jobs/{job_id}")
def get_cleaning_job(job_id: str):
    try:
        job_resp = (
            supabase
            .table("cleaning_jobs")
            .select("*")
            .eq("id", job_id)
            .execute()
        )

        if not job_resp.data:
            raise HTTPException(
                status_code=404,
                detail=f"Cleaning job {job_id} not found"
            )

        job = job_resp.data[0]
        robot_id = job.get("robot_id")

        robot_name = "Unknown"
        if robot_id is not None:
            robot_resp = (
                supabase
                .table("robots")
                .select("id, name")
                .eq("id", robot_id)
                .execute()
            )
            if robot_resp.data:
                robot_name = robot_resp.data[0].get("name", "Unknown")

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
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Supabase connection failed: {exc}"
        )
