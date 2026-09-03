"""Tests for the situation event generator and its engine effects."""
from __future__ import annotations

from app.core.config import Config
from app.sim.engine import SimulationEngine


def _engine_with_events(**probabilities):
    config = Config.load()
    config.events.probabilities_per_second = dict(probabilities)
    engine = SimulationEngine(config)
    engine.start(threaded=False)
    return engine


def test_event_detection_and_decision_structure():
    engine = _engine_with_events(heavy_dirt=100.0)
    engine.step(0.1)
    payload = engine.get_events(limit=5)
    assert payload["count"] >= 1
    event = payload["events"][0]
    assert event["type"] == "heavy_dirt"
    assert "detection" in event
    assert {"type", "confidence", "location", "room", "severity"} <= set(
        event["detection"]
    )
    assert "decision" in event
    assert {"action", "reason", "handled_automatically"} <= set(event["decision"])
    assert event["decision"]["action"] == "Increase cleaning intensity"
    assert 0.0 <= event["detection"]["confidence"] <= 1.0


def test_heavy_dirt_raises_cleaning_mode():
    engine = _engine_with_events(heavy_dirt=100.0)
    engine.step(0.1)
    status = engine.get_status()
    assert status["cleaning_mode"] == "INTENSE"
    assert status["cleaning_mode"] != status["cleaning_mode_default"]


def test_spill_sets_boost_and_extra_pass():
    engine = _engine_with_events(spill_detected=100.0)
    engine.step(0.1)
    assert engine.get_status()["cleaning_mode"] == "BOOST"


def test_solid_waste_increases_container():
    config = Config.load()
    delta = config.waste.solid_waste_fill
    config.events.probabilities_per_second = {"solid_waste": 100.0}
    engine = SimulationEngine(config)
    engine.start(threaded=False)
    before = engine.waste
    engine.step(0.1)
    assert engine.waste >= before + delta * 0.9


def test_temporary_obstacle_spawned():
    engine = _engine_with_events(temporary_obstacle=100.0)
    engine.step(0.1)
    assert len(engine.environment.dynamic_segments()) == 4


def test_event_actions_match_backend_vocabulary():
    engine = _engine_with_events(
        heavy_dirt=25.0, spill_detected=25.0, temporary_obstacle=25.0, solid_waste=25.0
    )
    # force generation by stepping many times (~every tick one event)
    for _ in range(200):
        engine.step(0.1)
    actions = {e["decision"]["action"] for e in engine.get_events(200)["events"]}
    assert "Increase cleaning intensity" in actions
    assert "Extra cleaning pass started" in actions
    assert "Route adjusted automatically" in actions
    assert "Picked up and stored in waste container" in actions