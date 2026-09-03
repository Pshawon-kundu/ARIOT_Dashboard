"""HTTP client for the ARIOT CleanBot Digital Twin Simulator.

The FastAPI backend proxies all simulator communication through this
module so the frontend never talks to the simulator directly.
"""
from __future__ import annotations

import os
from typing import Any, Dict, Optional

import httpx

SIMULATOR_URL = os.getenv("SIMULATOR_URL", "http://127.0.0.1:8100")

_client: Optional[httpx.Client] = None


def _get_client() -> httpx.Client:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.Client(base_url=SIMULATOR_URL, timeout=5.0)
    return _client


def close_client() -> None:
    global _client
    if _client is not None and not _client.is_closed:
        _client.close()
        _client = None


# ── Simulation status ────────────────────────────────────────────────

def get_simulation_status() -> Dict[str, Any]:
    resp = _get_client().get("/simulation/status")
    resp.raise_for_status()
    return resp.json()


# ── Sensors ──────────────────────────────────────────────────────────

def get_simulation_sensors() -> Dict[str, Any]:
    resp = _get_client().get("/simulation/sensors")
    resp.raise_for_status()
    return resp.json()


# ── LiDAR ───────────────────────────────────────────────────────────

def get_simulation_lidar(downsample: int = 1) -> Dict[str, Any]:
    resp = _get_client().get("/simulation/lidar", params={"downsample": downsample})
    resp.raise_for_status()
    return resp.json()


# ── Events ──────────────────────────────────────────────────────────

def get_simulation_events(limit: int = 50) -> Dict[str, Any]:
    resp = _get_client().get("/simulation/events", params={"limit": limit})
    resp.raise_for_status()
    return resp.json()


# ── Map ─────────────────────────────────────────────────────────────

def get_simulation_map() -> Dict[str, Any]:
    resp = _get_client().get("/simulation/map")
    resp.raise_for_status()
    return resp.json()


# ── Control commands ────────────────────────────────────────────────

def start_simulation() -> Dict[str, Any]:
    resp = _get_client().post("/simulation/start")
    resp.raise_for_status()
    return resp.json()


def stop_simulation() -> Dict[str, Any]:
    resp = _get_client().post("/simulation/stop")
    resp.raise_for_status()
    return resp.json()


def reset_simulation() -> Dict[str, Any]:
    resp = _get_client().post("/simulation/reset")
    resp.raise_for_status()
    return resp.json()
