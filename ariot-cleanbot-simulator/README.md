# ARIOT CleanBot Digital Twin Simulator

A realistic, ROS2-free Python simulation of the future ARIOT industrial
cleaning robot. It behaves like the physical hardware — differential drive,
wheel encoders, IMU, LiDAR, autonomous navigation and on-the-fly situation
handling — and exposes a REST API that the existing ARIOT React dashboard
can consume.

```
   Robot Simulation Engine                 FastAPI Backend
   (this project, port 8100)          (ariot-cleanbot-backend, port 8000)
 ┌───────────────────────────┐               │
 │  differential drive       │  /simulation/* │
 │  wheel encoders           │───────────────►│  existing ARIOT
 │  IMU                      │  JSON          │  React Dashboard
 │  LiDAR (360°)             │                │  (port 5173)
 │  autonomous navigation    │                │
 │  event generator          │                │
 └───────────────────────────┘                ┘
```

---

## How the simulator works

A single `SimulationEngine` runs on a background thread at **10 Hz
(100 ms)** and orchestrates every sub-component. Each sub-component is a
pure class in `app/sim/`, so it can be unit-tested in isolation and later
swapped for the real ROS2 stack.

| Component | File | What it does |
|-----------|------|--------------|
| **State simulator** | `app/sim/state.py` | Robot status, cleaning modes, planar pose helpers. |
| **Environment** | `app/sim/environment.py` | Virtual indoor map: rooms, walls, obstacles, doorways; ray-cast geometry used by LiDAR. |
| **Motion simulator** | `app/sim/motion.py` | Differential-drive kinematics `v=(vl+vr)/2`, `ω=(vr−vl)/wheel_base` with acceleration limiting. |
| **Encoder simulator** | `app/sim/encoders.py` | Wheel ticks (tick noise + quantization) and dead-reckoned odometry that drifts like the real thing. |
| **IMU simulator** | `app/sim/imu.py` | Accelerometer (gravity + linear/centripetal accel), gyro (bias + noise), gyro-integrated orientation. |
| **LiDAR simulator** | `app/sim/lidar.py` | 360-beam laser scan by ray casting; Gaussian range noise + drop-outs. |
| **Navigation simulator** | `app/sim/navigation.py` | Autonomous waypoint follower (Lobby → Corridor A → East Wing → back) with a heading P-controller and dock management. |
| **Event generator** | `app/sim/events.py` | Heavy dirt, spills, temporary obstacles and solid waste — each with detection + decision data. |
| **Engine** | `app/sim/engine.py` | 100 ms loop: battery / water / waste, charging, event effects, 1 s dashboard snapshots, path history. |
| **API** | `app/api/routes.py` | REST endpoints for the dashboard. |

### The virtual facility

The map is a small L-shaped facility (30 m × 14 m) with three rooms:

```
        y=14
  +--------------------------------+
  |  Lobby        │   Corridor A   │
  |  x 2..10      │   x 10..20     │   East Wing
  |  y 2..12      │   y 8..11      │   x 20..28
  |          door ╔═════╗          │   y 2..12
  |                ║pillar║        │
  |   ╭─── desk ───╨─────╨─── door╔═══════════╗
  |   │              │             ║  tables   ║
  +--------------------------------╚═══════════╝
        y=0
```

Walls are line segments; obstacles are rectangles; the doorways are gaps in
the walls that LiDAR sees through and navigation drives through. The robot
sweeps the Lobby, transits through Corridor A, sweeps the East Wing, then
returns — repeating forever, returning to its charging dock automatically
when the battery or water runs low.

### Data update frequency

- **Internal sensor tick** — 100 ms (`sensor_dt: 0.1`): motion, encoders,
  IMU, LiDAR and events are simulated.
- **Robot state / dashboard refresh** — 1 s (`state_publish_dt: 1.0`):
  the status snapshot and path history are published once per second.

### Events

Each detected situation carries structured **detection** and **decision**
blocks (matching the vocabulary used by `ariot-cleanbot-backend`):

| Event | Detection | Autonomous decision | Effect |
|-------|-----------|---------------------|--------|
| `heavy_dirt` | floor dust sensor | **Increase cleaning intensity** | cleaning mode → `INTENSE` for 30 s |
| `spill_detected` | moisture sensor | **Extra cleaning pass started** | cleaning mode → `BOOST` for 45 s, extra water usage |
| `temporary_obstacle` | LiDAR clusters | **Route adjusted automatically** | 0.5 m obstacle appears in the map for 15 s |
| `solid_waste` | vision classifier | **Picked up and stored in waste container** | waste container level increases |

---

## How to run

```bash
# 1. create a virtual environment (optional but recommended)
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS / Linux

# 2. install dependencies
pip install -r requirements.txt

# 3. start the simulator (FastAPI on http://127.0.0.1:8100)
python run.py

# alternative without the launcher
uvicorn app.main:app --reload
```

The simulator starts automatically (``autostart: true`` in `config.yaml`).
Open the interactive docs at **http://127.0.0.1:8100/docs**.

Try it in the terminal:

```bash
curl http://127.0.0.1:8100/simulation/status
curl http://127.0.0.1:8100/simulation/sensors
curl http://127.0.0.1:8100/simulation/lidar
curl http://127.0.0.1:8100/simulation/events
curl -X POST http://127.0.0.1:8100/simulation/start
curl -X POST http://127.0.0.1:8100/simulation/stop
curl -X POST http://127.0.0.1:8100/simulation/reset
```

---

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/simulation/status` | Robot state: status, battery, water, waste, cleaning mode, current task, pose, current room, cleaning progress, path history. |
| `GET`  | `/simulation/sensors` | Wheel encoders (ticks, tick velocity, distance, odometry), IMU (accelerometer, gyroscope, orientation), wheel speeds. |
| `GET`  | `/simulation/lidar?downsample=N` | 360-beam laser scan (angles + ranges). `downsample` returns every N-th beam for lighter payloads. |
| `GET`  | `/simulation/events?limit=N` | Most recent detected situations (detection + decision blocks). |
| `GET`  | `/simulation/map` | Floor plan for map rendering: rooms, walls, obstacles, doors, dock, cleaning route, robot pose. |
| `POST` | `/simulation/start` | Start (or resume) the simulation loop. |
| `POST` | `/simulation/stop` | Pause the simulation; state is preserved. |
| `POST` | `/simulation/reset` | Reset the twin to factory state. |

## Configuration

Everything is defined in `config.yaml` — no code changes needed:

- `simulation` — robot id, tick/publish frequencies, seed
- `robot` — wheel base, wheel radius, speed/acceleration limits
- `battery` / `water` / `waste` — levels, drain/charge rates, thresholds
- `cleaning` — default mode, intensity multipliers, event mode overrides
- `encoders` / `imu` / `lidar` — noise, bias, resolution, failure rates
- `environment` — rooms, walls, obstacles, doors (the virtual facility)
- `navigation` — dock position and the cleaning route waypoints
- `events` — probabilities, confidence ranges, obstacle lifetime
- `api` — host, port, CORS origins

Point the server at a different file with the `ARIOT_SIM_CONFIG` env var.

## Running the tests

```bash
pip install -r requirements-dev.txt
pytest tests -v
```

The suite covers the differential-drive kinematics, encoder tick/odometry
math, IMU noise & drift, LiDAR ray casting against the map, waypoint
navigation across all three rooms, event generation/effects, the engine
lifecycle (including the low-battery → dock → charge cycle) and the full
REST API via `TestClient`.

---

## Integrating with the existing ARIOT dashboard

The simulator is a standalone twin service on **port 8100**, separate from
the existing Supabase-backed backend on **port 8000**. Two clean options:

1. **Point the dashboard directly at the twin.** The dashboard's
   `src/services/api.ts` reads `VITE_API_BASE_URL` — set it to
   `http://127.0.0.1:8100` for a live data demo (CORS already allows
   `localhost:5173`).
2. **Feed the existing backend.** Have `ariot-cleanbot-backend` poll
   `/simulation/*` (e.g. once per second) and write the robot situation
   into its database, so the dashboard keeps using its normal endpoints.

Either way the twin keeps the dashboard alive without Supabase data.

## Future replacement with the real ROS2 robot

The simulator is deliberately written behind thin interfaces so the
physical robot can swap in without touching the REST layer or the
dashboard:

| Simulator class | ROS2 replacement |
|-----------------|------------------|
| `DifferentialDrive` | `cmd_vel` → real base driver; odometry from wheel encoders |
| `EncoderSimulator` | wheel encoder drivers → `/odom` (real ticks) |
| `ImuSimulator` | IMU driver → `/imu/data` (REP-103) |
| `LidarSimulator` | LiDAR driver → `/scan` (`sensor_msgs/LaserScan`) |
| `VirtualFacility` | Nav2 costmap from the SLAM-built map (pgm/yaml) |
| `NavigationSimulator` | Nav2 `NavigateThroughPoses` / behaviour tree server |
| `EventGenerator` | perception nodes (dust/moisture/vision) publishing events |

The `SimulationEngine` plays the role of the future **robot application**
node: it owns battery/water/waste state, service decisions and charging.
When the real robot arrives, a thin ROS2 node with the same `/simulation/*`
interface (or a bridge) can serve the identical payloads to the dashboard
— only the physics inside changes.

## Project layout

```
ariot-cleanbot-simulator/
├── config.yaml            # all tunable parameters
├── run.py                 # convenience launcher
├── requirements.txt       # runtime deps
├── requirements-dev.txt   # test deps
├── README.md
├── app/
│   ├── main.py            # FastAPI app (CORS, lifespan, engine injection)
│   ├── core/config.py     # typed YAML loader (dataclasses)
│   ├── api/routes.py      # /simulation/* REST endpoints
│   └── sim/
│       ├── state.py       # status enums, pose, angle helpers
│       ├── environment.py # virtual facility + ray casting
│       ├── motion.py      # differential drive
│       ├── encoders.py    # wheel encoders + odometry
│       ├── imu.py         # accelerometer / gyroscope / orientation
│       ├── lidar.py       # 360° laser scanner
│       ├── navigation.py  # autonomous cleaning path + dock
│       ├── events.py      # situation detection + decisions
│       └── engine.py      # 100 ms orchestration thread + snapshots
└── tests/                 # pytest suite (51 tests)
```