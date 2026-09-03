"""Event generator for the environmental situations the robot discovers.

Every simulated event carries structured *detection* and *decision* data so
the dashboard can render the robot's perception and autonomy, matching the
vocabulary already used by the ARIOT backend (``robot_situation.py``):

===============  =============================  =============================
event type       detection confidence          decision action
===============  =============================  =============================
heavy_dirt       85-98%  floor sensor          Increase cleaning intensity
spill_detected   75-99%  moisture sensor       Extra cleaning pass started
temporary obstacle 70-95% LiDAR clusters       Route adjusted automatically
solid_waste      60-97%  vision classifier     Picked up & stored in waste
===============  =============================  =============================
"""
from __future__ import annotations

import math
import random
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import Config
from app.sim.state import Pose

EVENT_CATALOG: Dict[str, Dict[str, Any]] = {
    "heavy_dirt": {
        "action": "Increase cleaning intensity",
        "reason": (
            "Floor dust sensor reported high density in the current "
            "cleaning zone"
        ),
        "severity": "high",
    },
    "spill_detected": {
        "action": "Extra cleaning pass started",
        "reason": (
            "Moisture detection flagged a spill; an extra BOOST cleaning "
            "pass was scheduled over the area"
        ),
        "severity": "high",
    },
    "temporary_obstacle": {
        "action": "Route adjusted automatically",
        "reason": (
            "LiDAR detected an unexpected object next to the planned path; "
            "the route was replanned locally"
        ),
        "severity": "medium",
    },
    "solid_waste": {
        "action": "Picked up and stored in waste container",
        "reason": (
            "Vision classifier detected solid debris on the floor surface"
        ),
        "severity": "medium",
    },
}


@dataclass
class SimEvent:
    """One detected situation with its autonomous decision."""

    id: str
    timestamp: float  # simulation seconds
    event_type: str
    confidence: float
    location: Tuple[float, float]
    room: str
    action: str
    reason: str
    severity: str
    handled_automatically: bool = True
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": round(self.timestamp, 2),
            "type": self.event_type,
            "detection": {
                "type": self.event_type,
                "confidence": round(self.confidence, 3),
                "location": list(self.location),
                "room": self.room,
                "severity": self.severity,
            },
            "decision": {
                "action": self.action,
                "reason": self.reason,
                "handled_automatically": self.handled_automatically,
            },
            **self.extra,
        }


class EventGenerator:
    """Probabilistic generation of environment situations while cleaning."""

    def __init__(self, config: Config, rng: random.Random) -> None:
        self._cfg = config.events
        self._rng = rng
        self._probs = dict(config.events.probabilities_per_second or {})
        self._history: deque[SimEvent] = deque(maxlen=config.events.max_history)
        self._event_counter = 0

    # ------------------------------------------------------------------
    # generation
    # ------------------------------------------------------------------
    def step(self, dt: float, pose: Pose, room: str, sim_time: float) -> Optional[SimEvent]:
        """Attempt to generate one event for this tick (usually ``None``)."""
        if not self._cfg.enabled or not self._probs:
            return None

        total_rate = sum(self._probs.values())
        if total_rate <= 0.0 or self._rng.random() > total_rate * dt:
            return None

        event_type = self._weighted_pick(total_rate)
        if event_type is None:
            return None

        event = self._make_event(event_type, pose, room, sim_time)
        if event:
            self._history.append(event)
        return event

    # ------------------------------------------------------------------
    # helpers
    # ------------------------------------------------------------------
    def _weighted_pick(self, total_rate: float) -> Optional[str]:
        roll = self._rng.random() * total_rate
        cumulative = 0.0
        for event_type, rate in self._probs.items():
            cumulative += rate
            if roll <= cumulative:
                return event_type
        return None

    def _make_event(
        self, event_type: str, pose: Pose, room: str, sim_time: float
    ) -> Optional[SimEvent]:
        catalog = EVENT_CATALOG.get(event_type)
        if not catalog:
            return None

        low, high = self._cfg.confidence_ranges.get(event_type, (0.7, 0.98))
        confidence = self._rng.uniform(low, high)
        location = self._detection_location(event_type, pose)

        extra: Dict[str, Any] = {}
        if event_type == "temporary_obstacle":
            extra = {
                "obstacle": {
                    "width_m": 0.5,
                    "height_m": 0.5,
                    "duration_s": self._cfg.temporary_obstacle_duration,
                }
            }

        self._event_counter += 1
        return SimEvent(
            id=f"evt-{self._event_counter:04d}",
            timestamp=sim_time,
            event_type=event_type,
            confidence=confidence,
            location=location,
            room=room,
            action=catalog["action"],
            reason=catalog["reason"],
            severity=catalog["severity"],
            extra=extra,
        )

    def _detection_location(self, event_type: str, pose: Pose) -> Tuple[float, float]:
        """Pick a plausible detection point relative to the robot."""
        if event_type == "temporary_obstacle":
            # place it to one side of the forward axis so the robot never
            # physically drives through it while LiDAR still sees it
            side = self._rng.choice([-1.0, 1.0])
            beam = pose.yaw + side * self._rng.uniform(1.1, 1.9)
            offset = self._rng.uniform(1.2, 2.2)
            return (
                pose.x + offset * math.cos(beam),
                pose.y + offset * math.sin(beam),
            )
        # other events are detected just ahead of the robot
        beam = pose.yaw + self._rng.uniform(-0.4, 0.4)
        offset = self._rng.uniform(0.4, 1.2)
        return (
            pose.x + offset * math.cos(beam),
            pose.y + offset * math.sin(beam),
        )

    # ------------------------------------------------------------------
    # history / serialisation
    # ------------------------------------------------------------------
    def recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        events = list(self._history)[-limit:]
        return [e.to_dict() for e in reversed(events)]

    def clear(self) -> None:
        self._history.clear()