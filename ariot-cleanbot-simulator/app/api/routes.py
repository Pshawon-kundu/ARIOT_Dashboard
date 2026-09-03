"""REST API for the CleanBot digital twin.

Exposes the simulation endpoints the ARIOT dashboard consumes. The engine
is resolved from ``request.app.state.engine`` so tests can inject their own
instance (dependency inversion).
"""
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Query, Request
from app.sim.engine import SimulationEngine

router = APIRouter(prefix="/simulation", tags=["Simulation"])


def _engine(request: Request) -> SimulationEngine:
    return request.app.state.engine


@router.get("/status")
def simulation_status(request: Request) -> Dict[str, Any]:
    """Robot state: status, battery, water, waste, pose, task, progress."""
    return _engine(request).get_status()


@router.get("/sensors")
def simulation_sensors(request: Request) -> Dict[str, Any]:
    """Wheel encoders (ticks + odometry), IMU, wheel/velocity telemetry."""
    return _engine(request).get_sensors()


@router.get("/lidar")
def simulation_lidar(
    request: Request,
    downsample: int = Query(1, ge=1, le=90),
) -> Dict[str, Any]:
    """360-degree laser scan from the current pose (optionally thinned)."""
    return _engine(request).get_lidar(downsample)


@router.get("/events")
def simulation_events(
    request: Request,
    limit: int = Query(50, ge=1, le=500),
) -> Dict[str, Any]:
    """Most recent detected situations with detection + decision blocks."""
    return _engine(request).get_events(limit)


@router.get("/map")
def simulation_map(request: Request) -> Dict[str, Any]:
    """Floor plan (rooms, walls, obstacles, doors, route) for the dashboard."""
    return _engine(request).get_map()


@router.post("/start")
def simulation_start(request: Request) -> Dict[str, Any]:
    """Start (or resume) the simulation on its 100 ms background loop."""
    engine = _engine(request)
    engine.start()
    return {
        "status": "STARTED" if engine.is_running else "ERROR",
        "robot_id": engine.config.simulation.robot_id,
        "message": "Simulation running at 10 Hz",
    }


@router.post("/stop")
def simulation_stop(request: Request) -> Dict[str, Any]:
    """Pause the simulation loop; state is preserved for resume."""
    engine = _engine(request)
    engine.stop()
    return {
        "status": "STOPPED",
        "robot_id": engine.config.simulation.robot_id,
        "message": "Simulation paused",
    }


@router.post("/reset")
def simulation_reset(request: Request) -> Dict[str, Any]:
    """Reset the twin to a fresh factory state."""
    engine = _engine(request)
    engine.reset()
    return {
        "status": "RESET",
        "robot_id": engine.config.simulation.robot_id,
        "message": "Simulation reset to factory state",
    }