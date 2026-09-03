"""Robot state model: status enums, cleaning modes and the pose type."""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict


class RobotStatus:
    """Operational states of the robot twin."""

    IDLE = "IDLE"
    CLEANING = "CLEANING"
    TRANSIT_TO_DOCK = "TRANSIT_TO_DOCK"
    CHARGING = "CHARGING"
    PAUSED = "PAUSED"

    ALL = (IDLE, CLEANING, TRANSIT_TO_DOCK, CHARGING, PAUSED)


class CleaningMode:
    """Cleaning intensity modes (mirror the physical robot badge labels)."""

    ECO = "ECO"
    STANDARD = "STANDARD"
    INTENSE = "INTENSE"
    BOOST = "BOOST"

    ALL = (ECO, STANDARD, INTENSE, BOOST)


@dataclass
class Pose:
    """Planar robot pose (ground truth used by the simulator engine)."""

    x: float
    y: float
    yaw: float

    def to_dict(self) -> Dict[str, float]:
        return {"x": round(self.x, 3), "y": round(self.y, 3), "yaw": round(self.yaw, 4)}

    def distance_to(self, other: "Pose") -> float:
        return math.hypot(self.x - other.x, self.y - other.y)


def wrap_angle(angle: float) -> float:
    """Normalise an angle to the range [-pi, pi) radians."""
    return (angle + math.pi) % (2.0 * math.pi) - math.pi


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))