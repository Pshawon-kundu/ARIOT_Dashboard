"""Grid-based A* transit planner for obstacle-aware pathfinding.

The planner operates on a grid overlaid on the facility, treating cells as
nodes and 8-connected movements as edges. It validates that each move
doesn't intersect walls or obstacles before including the edge.
"""
from __future__ import annotations

import heapq
import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

from app.core.config import Config, CoverageSection
from app.sim.coverage import GridCell
from app.sim.environment import VirtualFacility


@dataclass(frozen=True)
class AStarNode:
    cell: GridCell
    g: float
    h: float
    parent: Optional["AStarNode"]

    def f(self) -> float:
        return self.g + self.h

    def __lt__(self, other: "AStarNode") -> bool:
        return self.f() < other.f()


class AStarPlanner:
    """A* grid-based path planner for transit between waypoints."""

    def __init__(
        self,
        environment: VirtualFacility,
        coverage_cfg: CoverageSection,
        robot_cfg: Config.robot,
    ) -> None:
        self.resolution = coverage_cfg.grid_resolution
        self.safety_clearance = coverage_cfg.safety_clearance
        self.robot_clearance = robot_cfg.footprint_radius
        self.total_clearance = self.robot_clearance + self.safety_clearance

        self.env = environment
        self.grid: Dict[GridCell, bool] = {}

        self.origin_x = 0.0
        self.origin_y = 0.0
        self.size_i = int(environment.size[0] / self.resolution) + 1
        self.size_j = int(environment.size[1] / self.resolution) + 1

        self._build_grid()

    def _build_grid(self) -> None:
        """Build traversability grid from environment geometry."""
        all_static_segments = self.env.static_segments()
        all_obs = self.env.obstacles + self.env.restricted_areas

        for i in range(self.size_i):
            for j in range(self.size_j):
                wx, wy = self._world_from_grid(i, j)
                cell = GridCell(i, j)

                if self._is_traversable(wx, wy, all_static_segments, all_obs):
                    self.grid[cell] = True
                else:
                    self.grid[cell] = False

    def _is_traversable(
        self,
        wx: float,
        wy: float,
        walls: List[Tuple[float, float, float, float]],
        obstacles: List,
    ) -> bool:
        """Check if a world-coordinate point is traversable by robot center."""
        if not self.env.point_inside(wx, wy, self.total_clearance):
            return False

        if self.env._point_in_obstacle(wx, wy, self.total_clearance):
            return False

        for seg in walls:
            if self.env._point_to_segment_distance(wx, wy, *seg) < self.total_clearance:
                return False

        return True

    def _manhattan_heuristic(self, a: GridCell, b: GridCell) -> float:
        """8-connected Manhattan distance as heuristic."""
        return math.hypot(abs(a.i - b.i), abs(a.j - b.j))

    def _edge_valid(
        self,
        from_cell: GridCell,
        to_cell: GridCell,
    ) -> bool:
        """Check if movement from one cell to adjacent cell is valid.

        For diagonal moves, also validates that the diagonal doesn't
        clip through walls or obstacles.
        """
        if not self.grid.get(to_cell, False):
            return False

        if from_cell.i != to_cell.i and from_cell.j != to_cell.j:
            corner1 = GridCell(from_cell.i, to_cell.j)
            corner2 = GridCell(to_cell.i, from_cell.j)
            if not self.grid.get(corner1, False) or not self.grid.get(corner2, False):
                return False

        wx1, wy1 = from_cell.to_world(self.origin_x, self.origin_y, self.resolution)
        wx2, wy2 = to_cell.to_world(self.origin_x, self.origin_y, self.resolution)

        if self.env._path_crosses_wall(wx1, wy1, wx2, wy2):
            return False

        if not self.env.can_move(wx1, wy1, wx2, wy2, self.total_clearance):
            return False

        return True

    def plan(self, start: Tuple[float, float], goal: Tuple[float, float]) -> Optional[List[Tuple[float, float]]]:
        """Plan a path from start to goal using A*.

        Returns a list of world-coordinate waypoints, or None if no path exists.
        """
        start_cell = GridCell.from_world(start[0], start[1], self.origin_x, self.origin_y, self.resolution)
        goal_cell = GridCell.from_world(goal[0], goal[1], self.origin_x, self.origin_y, self.resolution)

        if not self.grid.get(start_cell, False):
            start_cell = self._nearest_traversable(start_cell)
            if start_cell is None:
                return None

        if not self.grid.get(goal_cell, False):
            goal_cell = self._nearest_traversable(goal_cell)
            if goal_cell is None:
                return None

        if start_cell == goal_cell:
            return [goal]

        open_set: List[AStarNode] = []
        start_node = AStarNode(
            cell=start_cell,
            g=0.0,
            h=self._manhattan_heuristic(start_cell, goal_cell),
            parent=None,
        )
        heapq.heappush(open_set, start_node)

        came_from: Dict[GridCell, Optional[GridCell]] = {start_cell: None}
        g_score: Dict[GridCell, float] = {start_cell: 0.0}

        while open_set:
            current = heapq.heappop(open_set)

            if current.cell == goal_cell:
                return self._reconstruct_path(came_from, current.cell, goal_cell, goal)

            for neighbor in current.cell.neighbours_8():
                if neighbor not in self.grid:
                    continue

                if not self._edge_valid(current.cell, neighbor):
                    continue

                tentative_g = g_score[current.cell] + self._move_cost(current.cell, neighbor)

                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current.cell
                    g_score[neighbor] = tentative_g
                    h = self._manhattan_heuristic(neighbor, goal_cell)
                    f = tentative_g + h
                    heapq.heappush(open_set, AStarNode(cell=neighbor, g=tentative_g, h=h, parent=None))

        return None

    def _nearest_traversable(self, cell: GridCell) -> Optional[GridCell]:
        """Find the nearest traversable cell to the given cell using BFS."""
        if self.grid.get(cell, False):
            return cell

        visited: Set[GridCell] = {cell}
        queue = [cell]

        while queue:
            current = queue.pop(0)
            for neighbor in current.neighbours_4():
                if neighbor in visited:
                    continue
                visited.add(neighbor)
                if self.grid.get(neighbor, False):
                    return neighbor
                queue.append(neighbor)

        return None

    def _move_cost(self, from_cell: GridCell, to_cell: GridCell) -> float:
        """Cost of moving from one cell to an adjacent cell."""
        if from_cell.i != to_cell.i and from_cell.j != to_cell.j:
            return math.sqrt(2) * self.resolution
        return self.resolution

    def _reconstruct_path(
        self,
        came_from: Dict[GridCell, Optional[GridCell]],
        goal_cell: GridCell,
        goal_grid_cell: GridCell,
        goal_world: Tuple[float, float],
    ) -> List[Tuple[float, float]]:
        """Reconstruct path from goal to start."""
        path: List[Tuple[float, float]] = [goal_world]
        current: Optional[GridCell] = goal_grid_cell

        while current is not None:
            wx, wy = current.to_world(self.origin_x, self.origin_y, self.resolution)
            path.append((wx, wy))
            current = came_from[current]

        path.reverse()
        return self._simplify_path(path)

    def _simplify_path(self, path: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Remove collinear intermediate points."""
        if len(path) <= 2:
            return path

        simplified = [path[0]]
        prev = path[0]

        for i in range(1, len(path) - 1):
            if not self._is_collinear(prev, path[i], path[i + 1]):
                simplified.append(path[i])
                prev = path[i]

        simplified.append(path[-1])
        return simplified

    def _is_collinear(
        self,
        p1: Tuple[float, float],
        p2: Tuple[float, float],
        p3: Tuple[float, float],
        epsilon: float = 0.01,
    ) -> bool:
        """Check if three points are approximately collinear."""
        dx1 = p2[0] - p1[0]
        dy1 = p2[1] - p1[1]
        dx2 = p3[0] - p2[0]
        dy2 = p3[1] - p2[1]
        return abs(dx1 * dy2 - dy1 * dx2) < epsilon

    def _world_from_grid(self, i: int, j: int) -> Tuple[float, float]:
        return (self.origin_x + i * self.resolution, self.origin_y + j * self.resolution)


def compute_room_costs(
    planner: AStarPlanner,
    rooms: List,  # List of Room objects with name and bounds
    dock: Tuple[float, float],
) -> List[Tuple[str, float, Tuple[float, float], Tuple[float, float, float, float]]]:
    """Compute A* path cost from dock to each room, returning sorted by cost descending.

    Returns list of (room_name, cost, reachable_point, bounds) sorted farthest-first.
    """
    results = []

    for room in rooms:
        xmin, ymin, xmax, ymax = room.bounds

        center_x = (xmin + xmax) / 2.0
        center_y = (ymin + ymax) / 2.0

        path = planner.plan(dock, (center_x, center_y))

        if path is not None:
            cost = sum(
                math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1])
                for i in range(len(path) - 1)
            )
        else:
            cost = -1.0

        results.append((room.name, cost, (center_x, center_y), room.bounds))

    results.sort(key=lambda x: x[1] if x[1] >= 0 else float("inf"), reverse=True)
    return results
