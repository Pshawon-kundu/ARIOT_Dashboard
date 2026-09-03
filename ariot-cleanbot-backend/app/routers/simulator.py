"""Router bridging the dashboard to the Digital Twin Simulator.

All simulator communication goes through this module so the frontend
never talks to the simulator directly.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException

from app.access import get_registered_robot
from app.auth import User, get_current_user
from app.services import simulator_client

router = APIRouter(
    prefix="/robots",
    tags=["Simulator"],
)

logger = logging.getLogger(__name__)


# ── helpers ──────────────────────────────────────────────────────────

def _sim_available() -> bool:
    """Return True if the simulator is reachable."""
    try:
        simulator_client.get_simulation_status()
        return True
    except Exception:
        return False


def _get_sim_robot_id() -> Optional[str]:
    """Fetch the robot_id configured in the simulator."""
    try:
        status = simulator_client.get_simulation_status()
        return status.get("robot_id")
    except Exception:
        return None


def _validate_robot_id(robot_id: str) -> None:
    """Ensure the requested robot_id matches the simulator's configured robot_id.

    Raises HTTPException 404 if the simulator is running a different robot.
    """
    get_registered_robot(robot_id)
    sim_robot_id = _get_sim_robot_id()
    if sim_robot_id is None:
        raise HTTPException(
            status_code=503,
            detail="Simulator unavailable: could not fetch simulator status",
        )
    if sim_robot_id != robot_id:
        raise HTTPException(
            status_code=404,
            detail="Robot not found",
        )


def _map_sim_status(status: str, battery: float) -> str:
    """Convert simulator status to dashboard status string."""
    mapping = {
        "IDLE": "ready",
        "CLEANING": "cleaning",
        "CHARGING": "charging",
        "PAUSED": "paused",
        "TRANSIT_TO_DOCK": "cleaning",
    }
    return mapping.get(status, "offline")


# ── Live telemetry ──────────────────────────────────────────────────

@router.get("/{robot_id}/live")
def get_robot_live(
    robot_id: str,
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return live telemetry from the Digital Twin Simulator.

    Aggregates status + sensors into a single dashboard-friendly payload.
    """
    _validate_robot_id(robot_id)
    try:
        status = simulator_client.get_simulation_status()
        sensors = simulator_client.get_simulation_sensors()
    except Exception:
        logger.error("Simulator telemetry request failed")
        raise HTTPException(status_code=503, detail="Simulator unavailable")

    # Fetch LiDAR and target waypoint; non-fatal if simulator is busy
    lidar = None
    target_wp = status.get("target_waypoint")
    try:
        lidar = simulator_client.get_simulation_lidar(downsample=5)
    except Exception:
        lidar = None

    battery_pct = status.get("battery", {}).get("percent", 0)
    water_pct = status.get("water", {}).get("percent", 0)
    waste_pct = status.get("waste", {}).get("percent", 0)
    position = status.get("position", {})
    cleaning = status.get("cleaning", {})
    sim_status = status.get("status", "IDLE")

    result: Dict[str, Any] = {
        "robot_id": status.get("robot_id", robot_id),
        "status": _map_sim_status(sim_status, battery_pct),
        "sim_status": sim_status,
        "engine_state": status.get("engine_state", "idle"),
        "battery": battery_pct,
        "water_level": water_pct,
        "waste_level": waste_pct,
        "position": {
            "x": position.get("x", 0),
            "y": position.get("y", 0),
            "yaw": position.get("yaw", 0),
        },
        "orientation": position.get("yaw", 0),
        "sensors": {
            "encoder": sensors.get("encoder", {}),
            "imu": sensors.get("imu", {}),
            "wheels": sensors.get("wheels", {}),
        },
        "cleaning_progress": cleaning.get("progress_percent", 0),
        "meters_cleaned": cleaning.get("meters_cleaned", 0),
        "current_task": status.get("current_task", ""),
        "current_room": status.get("current_room", ""),
        "cleaning_mode": status.get("cleaning_mode", "STANDARD"),
        "path_history": status.get("path_history", []),
        "planned_route": status.get("planned_route", []),
        "tick_hz": status.get("tick_hz", 10),
        "target_waypoint": target_wp,
    }

    if lidar is not None:
        result["lidar"] = {
            "ranges": lidar.get("ranges", []),
            "angles": lidar.get("angles", []),
            "range_max": lidar.get("range_max_m", 30.0),
        }

    return result


# ── LiDAR ──────────────────────────────────────────────────────────

@router.get("/{robot_id}/lidar")
def get_robot_lidar(
    robot_id: str,
    downsample: int = 1,
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return a 360-degree LiDAR scan from the simulator."""
    _validate_robot_id(robot_id)
    try:
        scan = simulator_client.get_simulation_lidar(downsample=downsample)
    except Exception:
        logger.error("Simulator LiDAR request failed")
        raise HTTPException(status_code=503, detail="Simulator unavailable")

    return {
        "robot_id": robot_id,
        "scan": scan.get("ranges", []),
        "angles": scan.get("angles", []),
        "beam_count": scan.get("beam_count", 0),
        "range_max": scan.get("range_max_m", 30.0),
        "range_min": scan.get("range_min_m", 0.05),
        "pose": scan.get("pose", {}),
        "room": scan.get("room", ""),
        "timestamp": scan.get("timestamp", ""),
    }


# ── Control ─────────────────────────────────────────────────────────

@router.post("/{robot_id}/start")
def start_robot(
    robot_id: str,
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Start (or resume) the simulation for this robot."""
    _validate_robot_id(robot_id)
    try:
        result = simulator_client.start_simulation()
    except Exception:
        logger.error("Simulator start request failed")
        raise HTTPException(status_code=503, detail="Simulator unavailable")
    return {
        **result,
        "robot_id": robot_id,
        "command": "start",
    }


@router.post("/{robot_id}/stop")
def stop_robot(
    robot_id: str,
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Stop (pause) the simulation for this robot."""
    _validate_robot_id(robot_id)
    try:
        result = simulator_client.stop_simulation()
    except Exception:
        logger.error("Simulator stop request failed")
        raise HTTPException(status_code=503, detail="Simulator unavailable")
    return {
        **result,
        "robot_id": robot_id,
        "command": "stop",
    }


@router.post("/{robot_id}/reset")
def reset_robot(
    robot_id: str,
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Reset the simulation to factory state."""
    _validate_robot_id(robot_id)
    try:
        result = simulator_client.reset_simulation()
    except Exception:
        logger.error("Simulator reset request failed")
        raise HTTPException(status_code=503, detail="Simulator unavailable")
    return {
        **result,
        "robot_id": robot_id,
        "command": "reset",
    }


# ── Simulator map ──────────────────────────────────────────────────

@router.get("/{robot_id}/sim-map")
def get_robot_sim_map(
    robot_id: str,
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return the floor plan from the simulator for map rendering."""
    _validate_robot_id(robot_id)
    try:
        data = simulator_client.get_simulation_map()
    except Exception:
        logger.error("Simulator map request failed")
        raise HTTPException(status_code=503, detail="Simulator unavailable")
    return {
        "robot_id": robot_id,
        "map": data,
    }
