"""Shared pytest fixtures: fresh configuration and engine instances.

Each fixture is function-scoped so tests never share mutable simulator
state. Engines are activated with ``start(threaded=False)`` so tests can
drive ``step(dt)`` deterministically without background threads.
"""
from __future__ import annotations

import random

import pytest

from app.core.config import Config


@pytest.fixture()
def config() -> Config:
    return Config.load()


@pytest.fixture()
def rng() -> random.Random:
    return random.Random(1234)


@pytest.fixture()
def engine(config: Config):
    """A fresh, non-started simulation twin."""
    from app.sim.engine import SimulationEngine

    return SimulationEngine(config)