"""Virtual indoor environment: rooms, walls, obstacles and LiDAR ray-casting.

The map represents a small L-shaped facility with three rooms:

- ``Lobby``        (x 2..10, y 2..12)
- ``Corridor A``   (x 10..20, y 8..11)
- ``East Wing``    (x 20..28, y 2..12)

Walls are stored as 2D segments; the robot scans them with an idealised
ray-casting LiDAR. Obstacles are axis-aligned rectangles (each edge becomes
a ray-cast target), and events can spawn short-lived temporary obstacles.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import EnvironmentSection


def _rect_edges(xmin: float, ymin: float, xmax: float, ymax: float) -> List[Tuple[float, float, float, float]]:
    """Convert an axis-aligned rectangle into four wall segments."""
    return [
        (xmin, ymin, xmax, ymin),
        (xmax, ymin, xmax, ymax),
        (xmin, ymax, xmax, ymax),
        (xmin, ymin, xmin, ymax),
    ]


@dataclass
class Room:
    name: str
    bounds: Tuple[float, float, float, float]


@dataclass
class Obstacle:
    name: str
    bounds: Tuple[float, float, float, float]
    dynamic: bool = False
    expires_at: Optional[float] = None  # simulation time [s]


def ray_segment_distance(
    ox: float,
    oy: float,
    dx: float,
    dy: float,
    ax: float,
    ay: float,
    bx: float,
    by: float,
) -> Optional[float]:
    """Distance from ray origin ``(ox,oy)`` along unit direction ``(dx,dy)``
    to the first intersection with segment ``AB``.

    Returns ``None`` when the ray misses the segment or runs parallel to it.
    """
    rx, ry = bx - ax, by - ay
    denom = dx * ry - dy * rx
    if abs(denom) < 1e-12:
        return None  # parallel

    qx, qy = ax - ox, ay - oy
    t = (qx * ry - qy * rx) / denom
    if t < 0:
        return None
    s = (qx * dy - qy * dx) / denom
    if s < 0.0 or s > 1.0:
        return None
    return t


class VirtualFacility:
    """The simulated floor plan used by LiDAR and navigation."""

    def __init__(self, section: EnvironmentSection) -> None:
        self.name = section.name
        self.size = tuple(section.size)  # type: Tuple[float, float]
        self.rooms: List[Room] = [
            Room(name=name, bounds=tuple(room.bounds))  # type: ignore[misc]
            for name, room in section.rooms.items()
        ]
        self.walls: List[Tuple[float, float, float, float]] = [
            tuple(w) for w in section.walls  # type: ignore[misc]
        ]
        self.obstacles: List[Obstacle] = []
        self.restricted_areas: List[Obstacle] = []
        for item in section.obstacles:
            obs = Obstacle(name=item["name"], bounds=tuple(item["bounds"]))
            if item.get("restricted"):
                self.restricted_areas.append(obs)
            else:
                self.obstacles.append(obs)
        self.doors: List[Dict[str, Any]] = [{**d} for d in section.doors]
        self._dynamic_obstacles: List[Obstacle] = []

    # ------------------------------------------------------------------
    # geometry accessors
    # ------------------------------------------------------------------
    def static_segments(self) -> List[Tuple[float, float, float, float]]:
        """Walls plus the edges of every static obstacle."""
        segments = list(self.walls)
        for obstacle in self.obstacles:
            segments.extend(_rect_edges(*obstacle.bounds))
        return segments

    def dynamic_segments(self) -> List[Tuple[float, float, float, float]]:
        segments: List[Tuple[float, float, float, float]] = []
        for obstacle in self._dynamic_obstacles:
            segments.extend(_rect_edges(*obstacle.bounds))
        return segments

    def all_segments(self) -> List[Tuple[float, float, float, float]]:
        return self.static_segments() + self.dynamic_segments()

    def room_of(self, x: float, y: float) -> str:
        """Return the room name containing a point, or ``"Unknown"``."""
        for room in self.rooms:
            xmin, ymin, xmax, ymax = room.bounds
            if xmin <= x <= xmax and ymin <= y <= ymax:
                return room.name
        return "Unknown"

    def point_inside(self, x: float, y: float, margin: float = 0.0) -> bool:
        """True when the point (plus margin) stays inside the outer walls."""
        xmin, ymin, xmax, ymax = 0.0, 0.0, self.size[0], self.size[1]
        return (
            xmin + margin <= x <= xmax - margin
            and ymin + margin <= y <= ymax - margin
        )

    # ------------------------------------------------------------------
    # collision detection
    # ------------------------------------------------------------------
    @staticmethod
    def _point_to_segment_distance(
        px: float, py: float,
        ax: float, ay: float, bx: float, by: float,
    ) -> float:
        """Minimum distance from point P to segment AB."""
        dx, dy = bx - ax, by - ay
        len_sq = dx * dx + dy * dy
        if len_sq < 1e-12:
            return math.hypot(px - ax, py - ay)
        t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / len_sq))
        proj_x = ax + t * dx
        proj_y = ay + t * dy
        return math.hypot(px - proj_x, py - proj_y)

    @staticmethod
    def _segments_intersect(
        ax: float, ay: float, bx: float, by: float,
        cx: float, cy: float, dx: float, dy: float,
    ) -> bool:
        """Return True if segment AB crosses segment CD."""
        def cross(ox, oy, px, py, qx, qy):
            return (px - ox) * (qy - oy) - (py - oy) * (qx - ox)
        d1 = cross(cx, cy, dx, dy, ax, ay)
        d2 = cross(cx, cy, dx, dy, bx, by)
        d3 = cross(ax, ay, bx, by, cx, cy)
        d4 = cross(ax, ay, bx, by, dx, dy)
        if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
           ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
            return True
        return False

    def _point_in_obstacle(self, x: float, y: float, margin: float) -> bool:
        """True if (x,y) with margin overlaps any obstacle or restricted area."""
        all_obs = self.obstacles + self.restricted_areas + self._dynamic_obstacles
        for obs in all_obs:
            xmin, ymin, xmax, ymax = obs.bounds
            if (xmin - margin < x < xmax + margin and
                    ymin - margin < y < ymax + margin):
                return True
        return False

    def _path_crosses_wall(self,
                           x1: float, y1: float,
                           x2: float, y2: float) -> bool:
        """True if the straight line from (x1,y1) to (x2,y2) crosses any wall."""
        for seg in self.walls:
            if self._segments_intersect(x1, y1, x2, y2, *seg):
                return True
        return False

    def is_valid_position(self, x: float, y: float, margin: float = 0.0) -> bool:
        """True when a circular robot at (x,y) with radius *margin* is valid.

        Checks:
        - Inside outer walls
        - Not overlapping any obstacle or restricted area
        - Not too close to any wall segment
        """
        if not self.point_inside(x, y, margin):
            return False
        if self._point_in_obstacle(x, y, margin):
            return False
        # Check distance to every wall segment
        for seg in self.walls:
            if self._point_to_segment_distance(x, y, *seg) < margin:
                return False
        return True

    def can_move(self,
                 x1: float, y1: float,
                 x2: float, y2: float,
                 margin: float = 0.0) -> bool:
        """True if moving from (x1,y1) to (x2,y2) is collision-free."""
        if not self.is_valid_position(x2, y2, margin):
            return False
        if self._path_crosses_wall(x1, y1, x2, y2):
            return False
        return True

    # ------------------------------------------------------------------
    # LiDAR ray casting
    # ------------------------------------------------------------------
    def raycast(self, ox: float, oy: float, angle_rad: float) -> float:
        """Distance along a ray to the first hit, or +inf when unobstructed."""
        dx, dy = math.cos(angle_rad), math.sin(angle_rad)
        best = float("inf")
        for segment in self.all_segments():
            dist = ray_segment_distance(ox, oy, dx, dy, *segment)
            if dist is not None and dist < best:
                best = dist
        return best

    def spawn_temporary_obstacle(
        self,
        x: float,
        y: float,
        width: float,
        height: float,
        duration: float,
        now: float,
        name: str = "Temporary obstacle",
    ) -> Optional[Obstacle]:
        """Add a transient rectangular obstacle inside the building."""
        if not self.point_inside(x, y):
            return None
        half_w, half_h = width / 2.0, height / 2.0
        obstacle = Obstacle(
            name=name,
            bounds=(x - half_w, y - half_h, x + half_w, y + half_h),
            dynamic=True,
            expires_at=now + duration,
        )
        self._dynamic_obstacles.append(obstacle)
        return obstacle

    def update(self, now: float) -> None:
        """Remove dynamic obstacles whose lifetime has elapsed."""
        self._dynamic_obstacles = [
            o for o in self._dynamic_obstacles if (o.expires_at or float("inf")) > now
        ]

    # ------------------------------------------------------------------
    # serialisation (used by the /simulation/map endpoint)
    # ------------------------------------------------------------------
    def to_dict(self, dock: Tuple[float, float, float] = (3.5, 3.5, 0.0)) -> Dict[str, Any]:
        return {
            "name": self.name,
            "size": list(self.size),
            "rooms": [{"name": r.name, "bounds": list(r.bounds)} for r in self.rooms],
            "walls": [list(w) for w in self.walls],
            "obstacles": [
                {"name": o.name, "bounds": list(o.bounds), "dynamic": o.dynamic}
                for o in self.obstacles + self._dynamic_obstacles
            ],
            "doors": self.doors,
            "dock": list(dock),
        }