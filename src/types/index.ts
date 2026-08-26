export type RobotStatus = 'cleaning' | 'charging' | 'ready' | 'attention' | 'offline' | 'paused' | 'completed'

export type IntensityOption = 'Low' | 'Standard' | 'High'

export interface Robot {
  id: string
  name: string
  model: string
  status: string
  location: string
  level: number
  battery: number
  water: number
  wasteBin: number
  progress: number
  currentTask: string
  estimatedCompletion: string
  connectivity: 'Online' | 'Offline'
  lastCommunication: string
  lastMaintenance: string
  nextInspection: string
  operatingHours: number
  nextTaskAt?: string
  cleaningMode?: CleaningMode
  waterUsage?: IntensityOption
  suction?: IntensityOption
  paused?: boolean
  mapProgress?: number
}

export type CleaningMode = 'standard' | 'deep' | 'spot'

export type TaskStatus = 'scheduled' | 'active' | 'completed'

export interface CleaningTask {
  id: string
  robotId: string
  robotName: string
  zone: string
  floor: string
  mode: CleaningMode
  waterUsage: IntensityOption
  suction: IntensityOption
  noGoZones: string[]
  scheduleType: 'now' | 'later' | 'recurring'
  startTime: string
  estimatedDuration: string
  status: TaskStatus
  progress: number
  areaSqft?: number
}

export type AlertSeverity = 'warning' | 'maintenance' | 'success' | 'critical' | 'info'

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
  time: string
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
  response: string
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

export interface AlertItem {
  id: string
  title: string
  robotId: string
  severity: AlertSeverity
  message: string
  time: string
  action: 'View Robot' | 'View Maintenance' | 'View Report' | 'View Location'
  resolved?: boolean
}

export type ZoneStatus = 'cleaned' | 'in-progress' | 'uncleaned'

export interface FacilityZone {
  id: string
  name: string
  status: ZoneStatus
  x: number
  y: number
  w: number
  h: number
  label?: string
}

export interface NoGoZone {
  id: string
  floor: 'Level 1' | 'Level 2'
  name: string
  x: number
  y: number
  w: number
  h: number
}

export interface MaintenanceItem {
  id: string
  robotId: string
  robotName: string
  part: string
  status: 'Inspection Recommended' | 'Due Soon' | 'Overdue' | 'Inspected'
  operatingHours: number
  lastInspection: string
  suggestedAction: string
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
