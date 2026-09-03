"""FastAPI application for the ARIOT CleanBot Digital Twin Simulator.

Run with either:

    python run.py
    uvicorn app.main:app --reload

The ``create_app`` factory injects the simulation engine through
``app.state``, keeping the REST layer decoupled from the twin internals.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Dict, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as simulation_router
from app.core.config import get_config
from app.sim.engine import SimulationEngine


def create_app(engine: Optional[SimulationEngine] = None) -> FastAPI:
    """Build the FastAPI application bound to a simulation engine."""
    config = get_config()
    engine = engine or SimulationEngine(config)
    # derive autostart from the *engine's* config so tests can inject an
    # engine with autostart disabled without fighting the global cache
    autostart = engine.config.simulation.autostart or engine.autostart

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if autostart:
            engine.start()
        yield
        engine.stop()

    app = FastAPI(
        title="ARIOT CleanBot Digital Twin Simulator",
        description=(
            "Digital twin of the physical cleaning robot: differential drive, "
            "wheel encoders, IMU, LiDAR, autonomous navigation and situation "
            "events. Intended to be swapped for the real ROS2 stack later."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.api.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.engine = engine
    app.include_router(simulation_router)

    @app.get("/")
    def home() -> Dict[str, object]:
        return {
            "name": "ARIOT CleanBot Digital Twin Simulator",
            "version": "1.0.0",
            "status": "ok",
            "endpoints": [
                "GET  /simulation/status",
                "GET  /simulation/sensors",
                "GET  /simulation/lidar",
                "GET  /simulation/events",
                "GET  /simulation/map",
                "POST /simulation/start",
                "POST /simulation/stop",
                "POST /simulation/reset",
            ],
        }

    return app


app = create_app()