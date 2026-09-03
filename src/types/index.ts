export type RobotStatus = 'cleaning' | 'charging' | 'ready' | 'attention' | 'offline' | 'paused' | 'completed'

export type IntensityOption = 'Low' | 'Standard' | 'High'

export interface Robot {
  id: string
  name: string
  model?: string
  status?: string
  location?: string
  battery?: number
  water?: number
  wasteBin?: number
  progress?: number
  currentTask?: string
  estimatedCompletion?: string
  connectivity?: 'Online' | 'Offline'
  lastCommunication?: string
  lastMaintenance?: string
  nextInspection?: string
  operatingHours?: number
  nextTaskAt?: string
  cleaningMode?: CleaningMode
  waterUsage?: IntensityOption
  suction?: IntensityOption
  paused?: boolean
  mapProgress?: number
}

export type CleaningMode = 'standard' | 'deep' | 'spot'

export type TaskStatus = 'scheduled' | 'active' | 'completed'

/* ===== Autonomous awareness (robot makes decisions itself) ===== */

export type DetectionType = 'dirt' | 'stain' | 'spill' | 'solid-waste' | 'obstacle'

export type OutcomeState = 'auto' | 'monitoring' | 'attention'

export interface CleaningDetection {
  id: string
  robotId: string
  type: DetectionType
  title: string
  location: string
  timestamp: string
  response: string
  outcome: OutcomeState
}

export interface AutonomousDecision {
  id: string
  robotId: string
  time?: string
  notice: string
  location: string
  response: string
  outcome: OutcomeState
  why?: string
}

export interface RobotSituation {
  robotId: string
  path: string
  floorCondition: string
  nearbyObstacle: string
  restrictedArea: string
  response?: string
}

export interface AroundCleanBot {
  robotId: string
  ahead: string
  left: string
  right: string
  nearby: string
  floor: string
}

export interface MapDetection {
  id: string
  floor: 'Level 1' | 'Level 2'
  type: DetectionType
  x: number
  y: number
  location?: string
  time?: string
  response?: string
  outcome?: OutcomeState
}

export interface FrequentDirtyArea {
  rank: number
  name: string
  detail: string
  events: string
}

export interface CleaningReport {
  id: string
  title: string
  robotName: string
  status: 'Completed' | 'In Progress'
  coverage: number
  area: string
  duration: string
  hotspots: number
  missedAreas: number
  water: string
  date: string
}

export interface ToastMessage {
  id: number
  title: string
  description?: string
  tone: 'success' | 'info' | 'warning' | 'error'
}

/* ===== Digital Twin Simulator live types ===== */

export interface LiveTelemetry {
  robot_id: string
  status: string
  sim_status: string
  engine_state: string
  battery: number
  water_level: number
  waste_level: number
  position: { x: number; y: number; yaw: number }
  orientation: number
  sensors: {
    encoder: Record<string, unknown>
    imu: Record<string, unknown>
    wheels: {
      left_speed_mps: number
      right_speed_mps: number
      velocity_mps: number
      angular_velocity_radps: number
      travelled_m: number
    }
  }
  cleaning_progress: number
  meters_cleaned: number
  current_task: string
  current_room: string
  cleaning_mode: string
  path_history: Array<{ x: number; y: number; yaw: number; t: number }>
  planned_route?: Array<{ x: number; y: number; label?: string }>
  tick_hz: number
  target_waypoint?: { x: number; y: number; label?: string } | null
  lidar?: {
    ranges: (number | null)[]
    angles: number[]
    range_max: number
  }
}

export interface LidarScan {
  robot_id: string
  scan: (number | null)[]
  angles: number[]
  beam_count: number
  range_max: number
  range_min: number
  pose: { x: number; y: number; yaw: number }
  room: string
  timestamp: string
}

export interface SimulatorCommandResult {
  robot_id: string
  command: string
  status: string
  message: string
}

/* ===== Simulator Map (from /simulation/map endpoint) ===== */

export interface SimulationMapRoom {
  name: string
  bounds: [number, number, number, number]
}

export interface SimulationMapObstacle {
  name: string
  bounds: [number, number, number, number]
  dynamic: boolean
  restricted?: boolean
}

export interface SimulationMapDoor {
  name: string
  position_x: number
  y_min: number
  y_max: number
}

export interface SimulationMapData {
  name: string
  size: [number, number]
  rooms: SimulationMapRoom[]
  walls: number[][]
  obstacles: SimulationMapObstacle[]
  doors: SimulationMapDoor[]
  dock: [number, number, number]
}

export interface SimulationMap {
  robot_id: string
  map: SimulationMapData
}

/* ===== Dashboard Metrics (from /dashboard/metrics endpoint) ===== */

export interface DashboardMetrics {
  total_robots: number
  active_cleaning: number
  attention_required: number
  cleaning_progress_today: number
  area_cleaned_today: number
  facility_status: string
}
