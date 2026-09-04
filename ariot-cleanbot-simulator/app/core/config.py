"""ARIOT CleanBot Digital Twin - typed application configuration.

Loads ``config.yaml`` into immutable-style dataclasses so the simulation
logic never touches raw dictionaries. Missing keys fall back to the
defaults defined on each dataclass.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field, fields, is_dataclass
from pathlib import Path
from typing import (
    Any,
    Dict,
    List,
    Optional,
    Tuple,
    Union,
    get_args,
    get_origin,
    get_type_hints,
)

import yaml

DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[2] / "config.yaml"

_CONFIG_CACHE: Dict[str, "Config"] = {}


# ---------------------------------------------------------------------------
# dataclass <-> yaml helpers
# ---------------------------------------------------------------------------
def _from_dict(cls: Any, data: Any) -> Any:
    """Recursively coerce a yaml value into the target annotation type."""
    if data is None:
        return None

    origin = get_origin(cls)
    args = get_args(cls)

    # Optional[X] -> use the inner non-None type
    if origin is Union and type(None) in args:
        inners = [a for a in args if a is not type(None)]
        return _from_dict(inners[0], data) if inners else None

    if origin is tuple:
        if isinstance(data, (list, tuple)):
            inner = args[0] if args else Any
            return tuple(_from_dict(inner, v) for v in data)
        return data

    if origin in (list, set, frozenset):
        if isinstance(data, (list, tuple, set)):
            inner = args[0] if args else Any
            return [_from_dict(inner, v) for v in data]
        return data

    if origin in (dict,):
        key_type, value_type = args if len(args) == 2 else (Any, Any)
        if isinstance(data, dict):
            return {
                _from_dict(key_type, k): _from_dict(value_type, v)
                for k, v in data.items()
            }
        return data

    if is_dataclass(cls):
        return build_dataclass(cls, data)

    return data


def build_dataclass(cls: Any, data: Union[Dict[str, Any], Any]) -> Any:
    """Build a dataclass from a mapping, coercing each field's type."""
    if not isinstance(data, dict):
        return _from_dict(cls, data)
    # resolve string annotations (``from __future__ import annotations``)
    hints = get_type_hints(cls)
    kwargs: Dict[str, Any] = {}
    for f in fields(cls):  # type: ignore[arg-type]
        if f.name in data:
            kwargs[f.name] = _from_dict(hints.get(f.name, f.type), data[f.name])
    return cls(**kwargs)  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# Section configuration dataclasses
# ---------------------------------------------------------------------------
@dataclass
class SimulationSection:
    robot_id: str = "CLEANBOT-001"
    sensor_dt: float = 0.1
    state_publish_dt: float = 1.0
    autostart: bool = True
    random_seed: Optional[int] = 42


@dataclass
class RobotSection:
    init_position: Tuple[float, float, float] = (3.5, 3.5, 0.0)
    wheel_base: float = 0.45
    wheel_radius: float = 0.16
    max_speed: float = 1.2
    max_turn_rate: float = 1.5
    accel_limit: float = 1.0
    footprint_radius: float = 0.30


@dataclass
class BatterySection:
    start_level: float = 100.0
    drain_per_second: float = 0.06
    charge_per_second: float = 1.5
    low_threshold: float = 25.0
    critical_threshold: float = 10.0


@dataclass
class WaterSection:
    start_level: float = 100.0
    drain_per_second: float = 0.05
    spill_drain_multiplier: float = 1.6
    refill_at_dock: bool = True


@dataclass
class WasteSection:
    start_level: float = 0.0
    fill_per_second: float = 0.004
    solid_waste_fill: float = 2.5
    empty_at_dock: bool = True
    needs_empty_threshold: float = 90.0


@dataclass
class CleaningSection:
    default_mode: str = "STANDARD"
    intensity_multiplier: Dict[str, float] = field(
        default_factory=lambda: {
            "ECO": 0.6,
            "STANDARD": 1.0,
            "INTENSE": 1.5,
            "BOOST": 2.0,
        }
    )
    heavy_dirt_mode: str = "INTENSE"
    heavy_dirt_duration: float = 30.0
    spill_mode: str = "BOOST"
    spill_duration: float = 45.0
    waypoint_tolerance: float = 0.35
    base_speed: float = 1.0
    turn_gain: float = 2.5
    approach_slowdown: float = 1.2


@dataclass
class EncoderSection:
    ticks_per_revolution: int = 360
    noise_std: float = 1.5
    velocity_window_s: float = 0.5


@dataclass
class ImuSection:
    gravity: float = 9.81
    accel_noise_std: Tuple[float, float, float] = (0.06, 0.06, 0.06)
    gyro_noise_std: Tuple[float, float, float] = (0.001, 0.001, 0.01)
    gyro_bias: Tuple[float, float, float] = (0.0005, 0.0005, 0.002)
    yaw_drift_noise_std: float = 0.002


@dataclass
class LidarSection:
    range_min: float = 0.05
    range_max: float = 30.0
    angular_resolution_deg: float = 1.0
    noise_std: float = 0.02
    failure_rate: float = 0.01


@dataclass
class RoomData:
    bounds: Tuple[float, float, float, float] = (0.0, 0.0, 1.0, 1.0)


@dataclass
class EnvironmentSection:
    name: str = "ARIOT Demo Facility"
    size: Tuple[float, float] = (30.0, 14.0)
    rooms: Dict[str, RoomData] = field(default_factory=dict)
    walls: List[Tuple[float, float, float, float]] = field(default_factory=list)
    obstacles: List[Dict[str, Any]] = field(default_factory=list)
    doors: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class NavigationSection:
    dock_position: Tuple[float, float, float] = (3.5, 3.5, 0.0)
    waypoint_tolerance: float = 0.35
    cleaning_route: List[Tuple[float, float, str]] = field(default_factory=list)


@dataclass
class EventsSection:
    enabled: bool = True
    max_history: int = 120
    probabilities_per_second: Dict[str, float] = field(default_factory=dict)
    temporary_obstacle_duration: float = 15.0
    confidence_ranges: Dict[str, Tuple[float, float]] = field(default_factory=dict)


@dataclass
class CoverageSection:
    grid_resolution: float = 0.25
    cleaning_width: float = 0.60
    lane_overlap: float = 0.05
    safety_clearance: float = 0.10
    farthest_first: bool = True


@dataclass
class ApiSection:
    host: str = "127.0.0.1"
    port: int = 8100
    cors_origins: List[str] = field(default_factory=lambda: ["*"])


@dataclass
class Config:
    """Top-level typed configuration assembled from config.yaml sections."""

    simulation: SimulationSection = field(default_factory=SimulationSection)
    robot: RobotSection = field(default_factory=RobotSection)
    battery: BatterySection = field(default_factory=BatterySection)
    water: WaterSection = field(default_factory=WaterSection)
    waste: WasteSection = field(default_factory=WasteSection)
    cleaning: CleaningSection = field(default_factory=CleaningSection)
    encoders: EncoderSection = field(default_factory=EncoderSection)
    imu: ImuSection = field(default_factory=ImuSection)
    lidar: LidarSection = field(default_factory=LidarSection)
    environment: EnvironmentSection = field(default_factory=EnvironmentSection)
    navigation: NavigationSection = field(default_factory=NavigationSection)
    events: EventsSection = field(default_factory=EventsSection)
    coverage: CoverageSection = field(default_factory=CoverageSection)
    api: ApiSection = field(default_factory=ApiSection)

    @classmethod
    def load(cls, path: Optional[Path] = None) -> "Config":
        """Load configuration from a yaml file (defaults to config.yaml)."""
        path = path or _resolve_config_path()
        with path.open("r", encoding="utf-8") as handle:
            raw = yaml.safe_load(handle) or {}
        return build_dataclass(cls, raw)


def _resolve_config_path() -> Path:
    env_path = os.environ.get("ARIOT_SIM_CONFIG")
    if env_path:
        return Path(env_path)
    return DEFAULT_CONFIG_PATH


def get_config(path: Optional[Path] = None) -> Config:
    """Return a cached Config instance for the given path."""
    key = str(path or _resolve_config_path())
    if key not in _CONFIG_CACHE:
        _CONFIG_CACHE[key] = Config.load(Path(key))
    return _CONFIG_CACHE[key]