"""Coverage grid for real spatial cleaning progress tracking.

The CoverageGrid discretizes the facility into cells and tracks which
cleanable cells have been visited by the robot's cleaning mechanism.

Cell states:
  NON_CLEANABLE - outside floor space, obstacles, restricted areas
  UNCLEANED     - cleanable but not yet cleaned
  CLEANED      - visited by the robot's cleaning path
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum
from typing import Dict, Iterator, List, Optional, Set, Tuple

from app.core.config import Config, CoverageSection, EnvironmentSection
from app.sim.environment import VirtualFacility


class CellState(Enum):
    NON_CLEANABLE = 0
    UNCLEANED = 1
    CLEANED = 2


@dataclass(frozen=True)
class GridCell:
    """Immutable grid cell coordinate."""
    i: int
    j: int

    def neighbours_4(self) -> List["GridCell"]:
        return [
            GridCell(self.i - 1, self.j),
            GridCell(self.i + 1, self.j),
            GridCell(self.i, self.j - 1),
            GridCell(self.i, self.j + 1),
        ]

    def neighbours_8(self) -> List["GridCell"]:
        return [
            GridCell(self.i - 1, self.j - 1), GridCell(self.i - 1, self.j), GridCell(self.i - 1, self.j + 1),
            GridCell(self.i, self.j - 1),                             GridCell(self.i, self.j + 1),
            GridCell(self.i + 1, self.j - 1), GridCell(self.i + 1, self.j), GridCell(self.i + 1, self.j + 1),
        ]

    def to_world(self, origin_x: float, origin_y: float, resolution: float) -> Tuple[float, float]:
        return (origin_x + self.i * resolution, origin_y + self.j * resolution)

    @staticmethod
    def from_world(wx: float, wy: float, origin_x: float, origin_y: float, resolution: float) -> "GridCell":
        return GridCell(int((wx - origin_x) / resolution), int((wy - origin_y) / resolution))


class CoverageGrid:
    """Grid-based coverage tracking for the cleaning mission."""

    def __init__(
        self,
        environment: VirtualFacility,
        coverage_cfg: CoverageSection,
        robot_cfg: Config.robot,
    ) -> None:
        self.resolution = coverage_cfg.grid_resolution
        self.cleaning_width = coverage_cfg.cleaning_width
        self.lane_overlap = coverage_cfg.lane_overlap
        self.safety_clearance = coverage_cfg.safety_clearance

        self.origin_x = 0.0
        self.origin_y = 0.0
        self.size_i = int(environment.size[0] / self.resolution) + 1
        self.size_j = int(environment.size[1] / self.resolution) + 1

        self.robot_clearance = robot_cfg.footprint_radius
        self.total_clearance = self.robot_clearance + self.safety_clearance

        self._cells: Dict[GridCell, CellState] = {}
        self._room_cells: Dict[str, List[GridCell]] = {room.name: [] for room in environment.rooms}

        self._build_grid(environment)

        self.total_cleanable = sum(
            1 for s in self._cells.values() if s == CellState.UNCLEANED
        )
        self._cleaned_cells: Set[GridCell] = set()

    # ------------------------------------------------------------------
    # grid construction
    # ------------------------------------------------------------------
    def _build_grid(self, env: VirtualFacility) -> None:
        """Classify every cell as cleanable or non-cleanable."""
        all_static_segments = env.static_segments()
        all_obs = env.obstacles + env.restricted_areas

        for i in range(self.size_i):
            for j in range(self.size_j):
                wx, wy = self._world_from_grid(i, j)
                cell = GridCell(i, j)

                if not self._is_cell_cleanable(wx, wy, all_static_segments, all_obs, env):
                    self._cells[cell] = CellState.NON_CLEANABLE
                    continue

                self._cells[cell] = CellState.UNCLEANED

                for room in env.rooms:
                    xmin, ymin, xmax, ymax = room.bounds
                    if xmin <= wx <= xmax and ymin <= wy <= ymax:
                        self._room_cells[room.name].append(cell)
                        break

    def _is_cell_cleanable(
        self,
        wx: float,
        wy: float,
        walls: List[Tuple[float, float, float, float]],
        obstacles: List,  # Obstacle list
        env: VirtualFacility,
    ) -> bool:
        """Check if a world-coordinate point is cleanable."""
        margin = self.total_clearance

        if not env.point_inside(wx, wy, margin):
            return False

        if env._point_in_obstacle(wx, wy, margin):
            return False

        for seg in walls:
            if env._point_to_segment_distance(wx, wy, *seg) < margin:
                return False

        return True

    # ------------------------------------------------------------------
    # coverage marking
    # ------------------------------------------------------------------
    def mark_cleaned(self, robot_x: float, robot_y: float) -> int:
        """Mark all cells within cleaning_width/2 radius of (x,y) as cleaned.

        Returns the number of newly cleaned cells.
        """
        radius = self.cleaning_width / 2.0
        radius_cells = int(math.ceil(radius / self.resolution)) + 1

        cell = GridCell.from_world(robot_x, robot_y, self.origin_x, self.origin_y, self.resolution)
        newly_cleaned = 0

        for di in range(-radius_cells, radius_cells + 1):
            for dj in range(-radius_cells, radius_cells + 1):
                c = GridCell(cell.i + di, cell.j + dj)
                if c not in self._cells:
                    continue

                wx, wy = c.to_world(self.origin_x, self.origin_y, self.resolution)
                dist = math.hypot(wx - robot_x, wy - robot_y)

                if dist <= radius and self._cells[c] == CellState.UNCLEANED:
                    self._cells[c] = CellState.CLEANED
                    self._cleaned_cells.add(c)
                    newly_cleaned += 1

        return newly_cleaned

    def mark_cleaned_path(self, x1: float, y1: float, x2: float, y2: float) -> int:
        """Mark all cells along a path segment as cleaned.

        Uses linear interpolation between points.
        """
        dist = math.hypot(x2 - x1, y2 - y1)
        if dist < 0.001:
            return self.mark_cleaned(x1, y1)

        steps = max(1, int(dist / (self.resolution / 2.0)))
        newly_cleaned = 0

        for s in range(steps + 1):
            t = s / steps
            px = x1 + (x2 - x1) * t
            py = y1 + (y2 - y1) * t
            newly_cleaned += self.mark_cleaned(px, py)

        return newly_cleaned

    # ------------------------------------------------------------------
    # coverage queries
    # ------------------------------------------------------------------
    def coverage_percent(self) -> float:
        """Overall coverage percentage 0..100."""
        if self.total_cleanable == 0:
            return 100.0
        return len(self._cleaned_cells) / self.total_cleanable * 100.0

    def coverage_by_room(self) -> Dict[str, float]:
        """Per-room coverage percentages."""
        result = {}
        for room_name, cells in self._room_cells.items():
            if not cells:
                result[room_name] = 100.0
                continue
            cleaned = sum(1 for c in cells if c in self._cleaned_cells)
            result[room_name] = cleaned / len(cells) * 100.0
        return result

    def total_cleaned_cells(self) -> int:
        return len(self._cleaned_cells)

    def total_cleanable_cells(self) -> int:
        return self.total_cleanable

    def is_complete(self) -> bool:
        """True when all cleanable cells have been cleaned."""
        return len(self._cleaned_cells) >= self.total_cleanable

    # ------------------------------------------------------------------
    # reset
    # ------------------------------------------------------------------
    def reset(self) -> None:
        """Clear all cleaned cells (start a new mission)."""
        for cell in self._cleaned_cells:
            self._cells[cell] = CellState.UNCLEANED
        self._cleaned_cells.clear()

    # ------------------------------------------------------------------
    # helpers
    # ------------------------------------------------------------------
    def _world_from_grid(self, i: int, j: int) -> Tuple[float, float]:
        return (self.origin_x + i * self.resolution, self.origin_y + j * self.resolution)

    def iter_cleanable(self) -> Iterator[GridCell]:
        for cell, state in self._cells.items():
            if state == CellState.UNCLEANED:
                yield cell

    def __len__(self) -> int:
        return len(self._cells)


def generate_boustrophedon_lanes(
    room_bounds: Tuple[float, float, float, float],
    cleaning_width: float,
    lane_overlap: float,
    safety_clearance: float,
    robot_clearance: float,
) -> List[List[Tuple[float, float]]]:
    """Generate boustrophedon (back-and-forth) cleaning lanes for a rectangular room.

    Returns a list of lane segments, where each segment is a list of (x,y) points.
    """
    xmin, ymin, xmax, ymax = room_bounds
    lane_spacing = cleaning_width - lane_overlap

    total_clearance = robot_clearance + safety_clearance

    clean_x_min = xmin + total_clearance
    clean_x_max = xmax - total_clearance
    clean_y_min = ymin + total_clearance
    clean_y_max = ymax - total_clearance

    if clean_x_max <= clean_x_min or clean_y_max <= clean_y_min:
        return []

    width = clean_x_max - clean_x_min
    height = clean_y_max - clean_y_min

    lanes: List[List[Tuple[float, float]]] = []

    if width >= height:
        num_lanes = max(1, int(height / lane_spacing))
        actual_spacing = height / num_lanes if num_lanes > 0 else height

        for lane_idx in range(num_lanes):
            y = clean_y_min + (lane_idx + 0.5) * actual_spacing
            y = min(y, clean_y_max)

            lane = []
            if lane_idx % 2 == 0:
                lane.append((clean_x_min, y))
                lane.append((clean_x_max, y))
            else:
                lane.append((clean_x_max, y))
                lane.append((clean_x_min, y))
            lanes.append(lane)
    else:
        num_lanes = max(1, int(width / lane_spacing))
        actual_spacing = width / num_lanes if num_lanes > 0 else width

        for lane_idx in range(num_lanes):
            x = clean_x_min + (lane_idx + 0.5) * actual_spacing
            x = min(x, clean_x_max)

            lane = []
            if lane_idx % 2 == 0:
                lane.append((x, clean_y_min))
                lane.append((x, clean_y_max))
            else:
                lane.append((x, clean_y_max))
                lane.append((x, clean_y_min))
            lanes.append(lane)

    return lanes


def split_lanes_by_obstacles(
    lanes: List[List[Tuple[float, float]]],
    obstacles: List,  # Obstacle list with bounds
    cleaning_width: float,
    robot_clearance: float,
) -> List[List[Tuple[float, float]]]:
    """Split lanes where they intersect obstacles, returning clean segments only."""
    radius = cleaning_width / 2.0 + robot_clearance
    result: List[List[Tuple[float, float]]] = []

    if not obstacles:
        for lane in lanes:
            if len(lane) < 2:
                continue
            for i in range(len(lane) - 1):
                if math.hypot(lane[i + 1][0] - lane[i][0], lane[i + 1][1] - lane[i][1]) >= 0.1:
                    result.append([lane[i], lane[i + 1]])
        return result

    for lane in lanes:
        if len(lane) < 2:
            continue

        segments = [(lane[0], lane[1])]

        for obs in obstacles:
            new_segments: List[Tuple[Tuple[float, float], Tuple[float, float]]] = []

            oxmin, oymin, oxmax, oymax = obs.bounds
            expanded_min = (oxmin - radius, oymin - radius)
            expanded_max = (oxmax + radius, oymax + radius)

            for (x1, y1), (x2, y2) in segments:
                if _segment_intersects_expanded_obs(x1, y1, x2, y2, expanded_min, expanded_max):
                    split = _split_segment_at_obs(x1, y1, x2, y2, expanded_min, expanded_max)
                    new_segments.extend(split)
                else:
                    new_segments.append(((x1, y1), (x2, y2)))

            segments = new_segments

        for (x1, y1), (x2, y2) in segments:
            if math.hypot(x2 - x1, y2 - y1) >= 0.1:
                result.append([(x1, y1), (x2, y2)])

    return result


def _segment_intersects_expanded_obs(
    x1: float, y1: float,
    x2: float, y2: float,
    omin: Tuple[float, float],
    omax: Tuple[float, float],
) -> bool:
    """Check if segment AB intersects the expanded obstacle rectangle."""
    oxmin, oymin = omin
    oxmax, oymax = omax

    if (min(x1, x2) > oxmax or max(x1, x2) < oxmin or
            min(y1, y2) > oymax or max(y1, y2) < oymin):
        return False

    if (oxmin <= x1 <= oxmax and oymin <= y1 <= oymax):
        return True
    if (oxmin <= x2 <= oxmax and oymin <= y2 <= oymax):
        return True

    return _line_intersects_rect(x1, y1, x2, y2, oxmin, oymin, oxmax, oymax)


def _line_intersects_rect(
    x1: float, y1: float,
    x2: float, y2: float,
    rxmin: float, rymin: float,
    rxmax: float, rymax: float,
) -> bool:
    """Check if line segment intersects axis-aligned rectangle."""
    if (x1 >= rxmin and x1 <= rxmax and y1 >= rymin and y1 <= rymax):
        return True
    if (x2 >= rxmin and x2 <= rxmax and y2 >= rymin and y2 <= rymax):
        return True

    return (_segment_intersects_segment(x1, y1, x2, y2, rxmin, rymin, rxmax, rymin) or
            _segment_intersects_segment(x1, y1, x2, y2, rxmax, rymin, rxmax, rymax) or
            _segment_intersects_segment(x1, y1, x2, y2, rxmin, rymax, rxmax, rymax) or
            _segment_intersects_segment(x1, y1, x2, y2, rxmin, rymin, rxmin, rymax))


def _segment_intersects_segment(
    x1: float, y1: float,
    x2: float, y2: float,
    x3: float, y3: float,
    x4: float, y4: float,
) -> bool:
    """Check if segment (x1,y1)-(x2,y2) intersects segment (x3,y3)-(x4,y4)."""
    denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if abs(denom) < 1e-12:
        return False

    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

    return 0.0 <= t <= 1.0 and 0.0 <= u <= 1.0


def _split_segment_at_obs(
    x1: float, y1: float,
    x2: float, y2: float,
    omin: Tuple[float, float],
    omax: Tuple[float, float],
) -> List[Tuple[Tuple[float, float], Tuple[float, float]]]:
    """Split a segment at obstacle intersection points."""
    oxmin, oymin = omin
    oxmax, oymax = omax

    t_enter: Optional[float] = None
    t_exit: Optional[float] = None

    for t, px, py in [
        ((oxmin - x1) / (x2 - x1) if x2 != x1 else None, oxmin, None),
        ((oxmax - x1) / (x2 - x1) if x2 != x1 else None, oxmax, None),
        (None, None, oymin) if y2 == y1 else ((oymin - y1) / (y2 - y1), None, oymin),
        (None, None, oymax) if y2 == y1 else ((oymax - y1) / (y2 - y1), None, oymax),
    ]:
        if t is None or t is not None and not (0.0 <= t <= 1.0):
            continue

        py_use = py if px is None else None
        px_use = px if py is None else None

        ix = x1 + t * (x2 - x1)
        iy = y1 + t * (y2 - y1)

        if ix < oxmin - 1e-9 or ix > oxmax + 1e-9 or iy < oymin - 1e-9 or iy > oymax + 1e-9:
            continue

        if t_enter is None or t < t_enter:
            t_enter = t
        if t_exit is None or t > t_exit:
            t_exit = t

    if t_enter is None and t_exit is None:
        return [((x1, y1), (x2, y2))]

    result = []
    if t_enter is not None and t_enter > 0.0:
        result.append(((x1, y1), (x1 + t_enter * (x2 - x1), y1 + t_enter * (y2 - y1))))
    if t_exit is not None and t_exit < 1.0:
        result.append(((x1 + t_exit * (x2 - x1), y1 + t_exit * (y2 - y1)), (x2, y2)))

    return result
