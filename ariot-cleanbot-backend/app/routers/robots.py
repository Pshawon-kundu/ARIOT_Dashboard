from fastapi import APIRouter, Depends, HTTPException
from app.access import get_registered_robot
from app.auth import User, get_current_user
from app import supabase as _sb
from app.services import simulator_client

router = APIRouter(
    prefix="/robots",
    tags=["Robots"],
)


@router.get("/")
def get_robots(user: User = Depends(get_current_user)):
    if _sb.supabase is None:
        return [{"id": "dev-robot-001", "name": "CleanBot 01", "model": "ARIOT-X1", "status": "ready", "location": "Lobby"}]
    try:
        return _sb.supabase.table("robots").select("*").execute().data
    except Exception:
        raise HTTPException(status_code=503, detail="Unable to load robots")


@router.get("/simulator")
def get_simulator_robot(user: User = Depends(get_current_user)):
    """Return the robot_id currently configured in the Digital Twin Simulator."""
    try:
        status = simulator_client.get_simulation_status()
        robot_id = status.get("robot_id")
        if robot_id:
            try:
                get_registered_robot(str(robot_id))
            except HTTPException as exc:
                if exc.status_code == 404:
                    return {"robot_id": None, "available": False}
                raise
            return {"robot_id": robot_id, "available": True}
        return {"robot_id": None, "available": False}
    except HTTPException:
        raise
    except Exception:
        return {"robot_id": None, "available": False}
