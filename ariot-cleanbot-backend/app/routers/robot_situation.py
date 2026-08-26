from fastapi import APIRouter, Depends, HTTPException
from app.supabase import supabase
from app.auth import get_current_user

router = APIRouter(
    prefix="/robots",
    tags=["Robot Situation"],
    dependencies=[Depends(get_current_user)],
)

DECISION_MAP = {
    "obstacle": "Route adjusted automatically",
    "spill": "Extra cleaning pass started",
    "heavy_dirt": "Cleaning intensity increased automatically",
}


def build_decision(event_type: str):
    return DECISION_MAP.get(
        event_type,
        "Standard response applied automatically"
    )


@router.get("/{robot_id}/situation")
def robot_situation(robot_id: int):
    try:
        robot_resp = (
            supabase
            .table("robots")
            .select("*")
            .eq("id", robot_id)
            .execute()
        )

        if not robot_resp.data:
            raise HTTPException(
                status_code=404,
                detail=f"Robot {robot_id} not found"
            )

        robot = robot_resp.data[0]

        events_resp = (
            supabase
            .table("cleaning_events")
            .select("*")
            .eq("robot_id", robot_id)
            .execute()
        )
        events = events_resp.data or []

        detections = [
            {
                "type": e.get("type"),
                "location": e.get("location"),
                "description": e.get("description"),
                "response": e.get("response"),
                "handled_automatically": e.get("handled_automatically"),
            }
            for e in events
        ]

        decisions = [
            {
                "action": build_decision(e.get("type")),
                "reason": e.get("type"),
            }
            for e in events
        ]

        return {
            "robot": {
                "id": robot.get("id"),
                "name": robot.get("name"),
                "model": robot.get("model"),
                "status": robot.get("status"),
            },
            "current_situation": {
                "location": robot.get("location"),
                "floor_condition": robot.get("floor_condition"),
                "nearby_obstacle": robot.get("nearby_obstacle"),
                "restricted_area": robot.get("restricted_area"),
            },
            "detections": detections,
            "decisions": decisions,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Supabase connection failed: {exc}"
        )
