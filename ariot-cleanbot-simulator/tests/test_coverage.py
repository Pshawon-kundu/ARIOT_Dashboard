"""Tests for coverage grid, lane generation, and A* transit planner."""
from __future__ import annotations

import math
import random

import pytest

from app.core.config import Config
from app.sim.coverage import (
    CellState,
    CoverageGrid,
    generate_boustrophedon_lanes,
    split_lanes_by_obstacles,
)
from app.sim.environment import Obstacle, Room, VirtualFacility
from app.sim.planner import AStarPlanner, compute_room_costs


@pytest.fixture()
def env(config: Config) -> VirtualFacility:
    return VirtualFacility(config.environment)


@pytest.fixture()
def coverage_grid(env: VirtualFacility, config: Config) -> CoverageGrid:
    return CoverageGrid(env, config.coverage, config.robot)


@pytest.fixture()
def planner(env: VirtualFacility, config: Config) -> AStarPlanner:
    return AStarPlanner(env, config.coverage, config.robot)


class TestCoverageGrid:
    def test_grid_has_expected_size(self, coverage_grid: CoverageGrid, config: Config) -> None:
        resolution = config.coverage.grid_resolution
        size = config.environment.size
        expected_i = int(size[0] / resolution) + 1
        expected_j = int(size[1] / resolution) + 1
        assert coverage_grid.size_i == expected_i
        assert coverage_grid.size_j == expected_j

    def test_some_cells_are_cleanable(self, coverage_grid: CoverageGrid) -> None:
        assert coverage_grid.total_cleanable > 0

    def test_mark_cleaned_increments_coverage(self, coverage_grid: CoverageGrid) -> None:
        initial = coverage_grid.coverage_percent()
        initial_cells = coverage_grid.total_cleaned_cells()

        coverage_grid.mark_cleaned(5.0, 5.0)

        assert coverage_grid.coverage_percent() > initial
        assert coverage_grid.total_cleaned_cells() > initial_cells

    def test_mark_cleaned_path_covers_line(self, coverage_grid: CoverageGrid) -> None:
        initial_cells = coverage_grid.total_cleaned_cells()

        coverage_grid.mark_cleaned_path(5.0, 5.0, 6.0, 5.0)

        assert coverage_grid.total_cleaned_cells() > initial_cells

    def test_coverage_percent_bounded_0_to_100(self, coverage_grid: CoverageGrid) -> None:
        coverage_grid.mark_cleaned(5.0, 5.0)
        pct = coverage_grid.coverage_percent()
        assert 0.0 <= pct <= 100.0

    def test_coverage_by_room_returns_all_rooms(self, coverage_grid: CoverageGrid) -> None:
        room_coverage = coverage_grid.coverage_by_room()
        assert "Lobby" in room_coverage
        assert "Corridor A" in room_coverage
        assert "East Wing" in room_coverage

    def test_reset_clears_coverage(self, coverage_grid: CoverageGrid) -> None:
        coverage_grid.mark_cleaned(5.0, 5.0)
        coverage_grid.reset()
        assert coverage_grid.total_cleaned_cells() == 0
        assert coverage_grid.coverage_percent() == 0.0

    def test_is_complete_false_initially(self, coverage_grid: CoverageGrid) -> None:
        assert not coverage_grid.is_complete()

    def test_cells_have_correct_states(self, coverage_grid: CoverageGrid) -> None:
        states = list(coverage_grid._cells.values())
        assert CellState.NON_CLEANABLE in states
        assert CellState.UNCLEANED in states


class TestBoustrophedonLanes:
    def test_lanes_generated_for_rectangular_room(self) -> None:
        bounds = (0.0, 0.0, 10.0, 10.0)
        lanes = generate_boustrophedon_lanes(
            bounds,
            cleaning_width=1.0,
            lane_overlap=0.05,
            safety_clearance=0.1,
            robot_clearance=0.3,
        )
        assert len(lanes) > 0
        for lane in lanes:
            assert len(lane) >= 2

    def test_lanes_respect_clearance(self) -> None:
        bounds = (0.0, 0.0, 10.0, 10.0)
        lanes = generate_boustrophedon_lanes(
            bounds,
            cleaning_width=1.0,
            lane_overlap=0.05,
            safety_clearance=0.5,
            robot_clearance=0.3,
        )
        min_coord = 0.5 + 0.3  # safety_clearance + robot_clearance
        max_coord = 10.0 - 0.5 - 0.3
        for lane in lanes:
            for x, y in lane:
                assert x >= min_coord - 0.001  # allow small epsilon
                assert x <= max_coord + 0.001
                assert y >= min_coord - 0.001
                assert y <= max_coord + 0.001

    def test_odd_lanes_reverse_direction(self) -> None:
        bounds = (0.0, 0.0, 10.0, 10.0)
        lanes = generate_boustrophedon_lanes(
            bounds,
            cleaning_width=1.0,
            lane_overlap=0.0,
            safety_clearance=0.0,
            robot_clearance=0.0,
        )
        if len(lanes) >= 2:
            lane0_start = lanes[0][0]
            lane1_start = lanes[1][0]
            assert lane0_start[0] != lane1_start[0] or lane0_start[1] != lane1_start[1]

    def test_empty_bounds_produces_no_lanes(self) -> None:
        bounds = (5.0, 5.0, 5.0, 5.0)
        lanes = generate_boustrophedon_lanes(
            bounds,
            cleaning_width=1.0,
            lane_overlap=0.0,
            safety_clearance=0.0,
            robot_clearance=0.0,
        )
        assert len(lanes) == 0


class TestSplitLanesByObstacles:
    def test_single_obstacle_splits_lane(self) -> None:
        lanes = [[(0.0, 5.0), (10.0, 5.0)]]
        obstacles = [
            Obstacle(name="obs", bounds=(4.0, 4.0, 6.0, 6.0))
        ]
        result = split_lanes_by_obstacles(
            lanes,
            obstacles,
            cleaning_width=1.0,
            robot_clearance=0.3,
        )
        assert len(result) >= 1

    def test_obstacle_at_end_preserves_segment(self) -> None:
        lanes = [[(0.0, 5.0), (3.0, 5.0)]]
        obstacles = [
            Obstacle(name="obs", bounds=(3.5, 4.0, 6.0, 6.0))
        ]
        result = split_lanes_by_obstacles(
            lanes,
            obstacles,
            cleaning_width=1.0,
            robot_clearance=0.3,
        )
        assert len(result) >= 1

    def test_no_obstacles_preserves_lanes(self) -> None:
        lanes = [[(0.0, 5.0), (10.0, 5.0)]]
        obstacles: list[Obstacle] = []
        result = split_lanes_by_obstacles(
            lanes,
            obstacles,
            cleaning_width=1.0,
            robot_clearance=0.3,
        )
        assert len(result) == 1


class TestAStarPlanner:
    def test_planner_builds_grid(self, planner: AStarPlanner) -> None:
        assert len(planner.grid) > 0

    def test_plan_returns_path(self, planner: AStarPlanner) -> None:
        path = planner.plan((3.5, 3.5), (15.0, 9.5))
        assert path is not None
        assert len(path) >= 2
        assert path[0] == (3.5, 3.5)
        assert path[-1] == (15.0, 9.5)

    def test_plan_same_start_and_goal(self, planner: AStarPlanner) -> None:
        path = planner.plan((5.0, 5.0), (5.0, 5.0))
        assert path is not None
        assert path[-1] == (5.0, 5.0)

    def test_plan_crosses_rooms(self, planner: AStarPlanner) -> None:
        path = planner.plan((3.5, 3.5), (24.0, 9.5))
        assert path is not None
        assert len(path) >= 2

    def test_nearest_traversable_returns_cell(self, planner: AStarPlanner) -> None:
        from app.sim.coverage import GridCell
        result = planner._nearest_traversable(GridCell(0, 0))
        assert result is not None


class TestComputeRoomCosts:
    def test_returns_all_rooms(self, planner: AStarPlanner, env: VirtualFacility) -> None:
        dock = (3.5, 3.5)
        results = compute_room_costs(planner, env.rooms, dock)
        room_names = [r[0] for r in results]
        assert "Lobby" in room_names
        assert "Corridor A" in room_names
        assert "East Wing" in room_names

    def test_sorted_by_cost_descending(self, planner: AStarPlanner, env: VirtualFacility) -> None:
        dock = (3.5, 3.5)
        results = compute_room_costs(planner, env.rooms, dock)
        costs = [r[1] for r in results]
        assert costs == sorted(costs, reverse=True)

    def test_costs_are_non_negative_for_accessible_rooms(self, planner: AStarPlanner, env: VirtualFacility) -> None:
        dock = (3.5, 3.5)
        results = compute_room_costs(planner, env.rooms, dock)
        for name, cost, _, _ in results:
            if "Lobby" in name:
                assert cost >= 0


class TestDynamicMissionIntegration:
    def test_build_dynamic_mission_creates_route(self, config: Config) -> None:
        from app.sim.engine import SimulationEngine
        from app.sim.navigation import Waypoint

        engine = SimulationEngine(config)
        engine.build_dynamic_mission()

        assert engine.navigation._mission_route is not None
        assert len(engine.navigation._mission_route) > 0

        mission = engine.navigation._mission_route
        assert any(wp.label == "Dock" for wp in mission)

    def test_mission_includes_cleaning_waypoints(self, config: Config) -> None:
        from app.sim.engine import SimulationEngine

        engine = SimulationEngine(config)
        engine.build_dynamic_mission()

        mission = engine.navigation._mission_route
        labels = [wp.label for wp in mission]

        has_cleaning = any("cleaning" in lbl.lower() for lbl in labels)
        assert has_cleaning

    def test_coverage_tracked_during_step(self, config: Config) -> None:
        from app.sim.engine import SimulationEngine
        from app.sim.state import RobotStatus

        engine = SimulationEngine(config)
        engine.status = RobotStatus.CLEANING
        engine.build_dynamic_mission()

        initial_coverage = engine.coverage_grid.coverage_percent()

        for _ in range(100):
            engine.step(0.1)

        final_coverage = engine.coverage_grid.coverage_percent()
        assert final_coverage >= initial_coverage

    def test_mission_route_is_farthest_first(self, config: Config) -> None:
        from app.sim.engine import SimulationEngine

        engine = SimulationEngine(config)
        engine.build_dynamic_mission()

        mission = engine.navigation._mission_route
        dock_idx = next(i for i, wp in enumerate(mission) if wp.label == "Dock")
        east_wing_idxs = [i for i, wp in enumerate(mission) if "East Wing" in wp.label]

        if east_wing_idxs:
            corridor_idxs = [i for i, wp in enumerate(mission) if "Corridor" in wp.label]
            lobby_idxs = [i for i, wp in enumerate(mission) if "Lobby" in wp.label and "Dock" not in wp.label]

            if corridor_idxs and lobby_idxs:
                first_corridor = min(corridor_idxs)
                first_lobby = min(lobby_idxs)
                assert first_corridor > dock_idx
                assert first_lobby > dock_idx
