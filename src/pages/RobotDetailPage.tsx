import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Play,
  RotateCcw,
  Square,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { FacilityMap } from '../components/map/FacilityMap'
import { CurrentSituationCard } from '../components/situation/CurrentSituationCard'
import { CleanBotDecisions } from '../components/situation/CleanBotDecisions'
import { WhatCleanBotNoticed } from '../components/situation/WhatCleanBotNoticed'
import { useApp } from '../context/AppContext'
import {
  getRobotSituation,
  getRobotLive,
  getRobotLidar,
  startRobot,
  stopRobot,
  resetRobot,
  usePolling,
} from '../services/api'
import type { ApiSituation } from '../services/api'
import type {
  AutonomousDecision,
  CleaningDetection,
  Robot,
} from '../types'

function mapDetectionType(t?: string): CleaningDetection['type'] {
  switch (t) {
    case 'heavy_dirt': return 'dirt'
    case 'spill': return 'spill'
    case 'obstacle': return 'obstacle'
    case 'stain': return 'stain'
    case 'solid_waste': return 'solid-waste'
    default: return 'dirt'
  }
}

function mapSituation(sit: ApiSituation): {
  path: string
  floorCondition: string
  nearbyObstacle: string
  restrictedArea: string
  response: string | undefined
} {
  const cs = sit.current_situation
  return {
    path: cs.location ?? 'Unknown',
    floorCondition: cs.floor_condition ?? 'Unknown',
    nearbyObstacle: cs.nearby_obstacle ?? 'None',
    restrictedArea: cs.restricted_area ?? 'None',
    response: cs.response,
  }
}

function mapDetections(sit: ApiSituation, robotId: string): CleaningDetection[] {
  return sit.detections.map((d, i) => ({
    id: String(d.id ?? i),
    robotId,
    type: mapDetectionType(d.type),
    title: d.type ?? 'Observation',
    location: d.location ?? 'Unknown',
    timestamp: d.created_at ?? '',
    response: d.response ?? d.description ?? 'CleanBot responded automatically.',
    outcome: d.handled_automatically ? 'auto' : 'monitoring',
  }))
}

function mapDecisions(sit: ApiSituation, robotId: string): AutonomousDecision[] {
  return sit.decisions.map((dec, i) => ({
    id: String(i),
    robotId,
    time: dec.created_at ?? '',
    notice: dec.action,
    location: dec.location ?? dec.reason ?? '',
    response: dec.response ?? dec.action,
    outcome: 'auto',
    why: dec.reason,
  }))
}

function LiveIndicator({ tickHz }: { tickHz: number | undefined }) {
  if (tickHz === undefined) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-pale px-2.5 py-1 text-xs font-semibold text-[#18794E]">
      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
      LIVE · {tickHz} Hz
    </span>
  )
}

function DiagnosticCard({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <h3 className="text-[13px] font-semibold text-ink-secondary uppercase tracking-wide mb-3">
        {title}
      </h3>
      {children}
    </Card>
  )
}

function DiagRow({
  label,
  value,
  unit,
}: {
  label: string
  value: string | number | undefined
  unit?: string
}) {
  if (value === undefined || value === null) return null
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-line/40 last:border-0">
      <span className="text-[12.5px] text-ink-secondary">{label}</span>
      <span className="text-[12.5px] font-semibold text-ink">
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  )
}

export function RobotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { robots, showToast } = useApp()

  const robotId = id ?? ''

  const { data: situation, loading: situationLoading } = usePolling(
    () => getRobotSituation(robotId),
    3000,
    [robotId],
  )

  const { data: liveTelemetry } = usePolling(
    () => getRobotLive(robotId),
    1000,
    [robotId],
  )

  const { data: lidarData } = usePolling(
    () => getRobotLidar(robotId, 10),
    2000,
    [robotId],
  )

  const identityRobot = robots.find((r) => r.id === id)

  const robotName = situation?.robot?.name ?? identityRobot?.name ?? 'Robot'
  const robotModel = situation?.robot?.model ?? identityRobot?.model ?? 'N/A'
  const robotStatus = liveTelemetry?.status ?? 'N/A'

  const apiSituation = situation ? mapSituation(situation) : undefined
  const apiDetections = situation ? mapDetections(situation, robotId) : []
  const apiDecisions = situation ? mapDecisions(situation, robotId) : []

  if (!id) {
    return (
      <Card>
        <EmptyState
          icon={<MapPin size={22} />}
          title="No robot specified"
          description="Navigate to a robot from the fleet list."
        />
        <div className="flex justify-center pb-6">
          <Button variant="secondary" onClick={() => navigate('/robots')}>
            Back to Robots
          </Button>
        </div>
      </Card>
    )
  }

  if (situationLoading && !situation && !identityRobot) {
    return (
      <Card>
        <div className="py-16 text-center text-[13px] text-ink-secondary">
          Loading robot data…
        </div>
      </Card>
    )
  }

  const handleStart = async () => {
    try {
      await startRobot(robotId)
      showToast('success', 'Simulation started', `${robotName} is now running.`)
    } catch {
      showToast('error', 'Start failed', 'Could not start the simulator.')
    }
  }

  const handleStop = async () => {
    try {
      await stopRobot(robotId)
      showToast('info', 'Simulation stopped', `${robotName} has been stopped.`)
    } catch {
      showToast('error', 'Command failed', 'Could not stop the simulator.')
    }
  }

  const handleReset = async () => {
    try {
      await resetRobot(robotId)
      showToast('info', 'Simulation reset', `${robotName} has been reset to factory state.`)
    } catch {
      showToast('error', 'Reset failed', 'Could not reset the simulator.')
    }
  }

  const isRunning = robotStatus === 'cleaning' || robotStatus === 'running'

  return (
    <div className="space-y-4">
      <Link
        to="/robots"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-secondary transition-colors hover:text-brand"
      >
        <ArrowLeft size={15} /> Back to Robots
      </Link>

      {/* SECTION 1: COMPACT HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white px-5 py-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
        <div className="flex items-center gap-4 min-w-0">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[20px] font-bold tracking-tight text-ink truncate">
                {robotName}
              </h1>
              <StatusBadge status={robotStatus} />
              <LiveIndicator tickHz={liveTelemetry?.tick_hz} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-secondary">
              <span>{robotModel}</span>
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-ink-muted" />
                {liveTelemetry?.current_room ?? identityRobot?.location ?? 'N/A'}
              </span>
              <span
                className="font-mono text-[11px] text-ink-muted"
                title={id}
              >
                ID: {id.slice(0, 8)}…
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            icon={<Play size={15} />}
            onClick={handleStart}
            disabled={isRunning}
          >
            Start
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={<Square size={14} />}
            onClick={handleStop}
            disabled={!isRunning}
          >
            Stop
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<RotateCcw size={15} />}
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* SECTION 2: MAIN OPERATIONS ROW */}
      <div className="grid grid-cols-12 gap-4">
        {/* LEFT: LIVE FACILITY MAP */}
        <div className="col-span-12 lg:col-span-8">
          <FacilityMap
            title="Live Facility Map"
            liveTelemetry={liveTelemetry}
            robotId={robotId}
            robotName={robotName}
            detections={[]}
          />
        </div>

        {/* RIGHT: MISSION & RESOURCES */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Robot State Card */}
          <Card>
            <h3 className="text-[13px] font-semibold text-ink-secondary uppercase tracking-wide mb-3">
              Robot State
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                <span className="text-[12.5px] text-ink-secondary">Engine</span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {liveTelemetry?.engine_state ?? 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                <span className="text-[12.5px] text-ink-secondary">Mode</span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {liveTelemetry?.cleaning_mode ?? 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                <span className="text-[12.5px] text-ink-secondary">Room</span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {liveTelemetry?.current_room ?? 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[12.5px] text-ink-secondary">Tick Rate</span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {liveTelemetry ? `${liveTelemetry.tick_hz} Hz` : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* Mission Card */}
          <Card>
            <h3 className="text-[13px] font-semibold text-ink-secondary uppercase tracking-wide mb-3">
              Mission
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-[12px] text-ink-muted mb-1">Current Task</p>
                <p className="text-[13.5px] font-semibold text-ink">
                  {liveTelemetry?.current_task ?? 'No active task'}
                </p>
              </div>
              {liveTelemetry?.target_waypoint && (
                <div>
                  <p className="text-[12px] text-ink-muted mb-1">Target</p>
                  <p className="text-[13.5px] font-semibold text-ink">
                    {liveTelemetry.target_waypoint.label
                      ?? `(${liveTelemetry.target_waypoint.x?.toFixed(1)}, ${liveTelemetry.target_waypoint.y?.toFixed(1)})`}
                  </p>
                </div>
              )}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] text-ink-muted">Progress</span>
                  <span className="text-[12.5px] font-bold text-ink">
                    {liveTelemetry?.cleaning_progress !== undefined ? `${liveTelemetry.cleaning_progress}%` : 'N/A'}
                  </span>
                </div>
                {liveTelemetry?.cleaning_progress !== undefined && (
                  <ProgressBar value={liveTelemetry.cleaning_progress} />
                )}
              </div>
              <div className="flex items-center justify-between py-1.5 border-t border-line/40">
                <span className="text-[12.5px] text-ink-secondary">Distance</span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {liveTelemetry?.meters_cleaned !== undefined
                    ? `${Math.round(liveTelemetry.meters_cleaned)}m`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* Resources Card */}
          <Card>
            <h3 className="text-[13px] font-semibold text-ink-secondary uppercase tracking-wide mb-3">
              Resources
            </h3>
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] text-ink-muted">Battery</span>
                  <span className="text-[12.5px] font-bold text-ink">
                    {liveTelemetry?.battery !== undefined ? `${liveTelemetry.battery}%` : 'N/A'}
                  </span>
                </div>
                {liveTelemetry?.battery !== undefined && (
                  <ProgressBar
                    value={liveTelemetry.battery}
                    color={liveTelemetry.battery < 30 ? 'bg-danger' : 'bg-success'}
                  />
                )}
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] text-ink-muted">Water</span>
                  <span className="text-[12.5px] font-bold text-ink">
                    {liveTelemetry?.water_level !== undefined ? `${liveTelemetry.water_level}%` : 'N/A'}
                  </span>
                </div>
                {liveTelemetry?.water_level !== undefined && (
                  <ProgressBar
                    value={liveTelemetry.water_level}
                    color={liveTelemetry.water_level < 30 ? 'bg-danger' : 'bg-water'}
                  />
                )}
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] text-ink-muted">Waste Bin</span>
                  <span className="text-[12.5px] font-bold text-ink">
                    {liveTelemetry?.waste_level !== undefined ? `${liveTelemetry.waste_level}% full` : 'N/A'}
                  </span>
                </div>
                {liveTelemetry?.waste_level !== undefined && (
                  <ProgressBar
                    value={liveTelemetry.waste_level}
                    color={liveTelemetry.waste_level > 80 ? 'bg-danger' : 'bg-warning'}
                  />
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* SECTION 3: DIAGNOSTICS ROW */}
      <div className="grid grid-cols-12 gap-4">
        {/* A: NAVIGATION & MOTION */}
        <div className="col-span-12 md:col-span-4">
          <DiagnosticCard title="Navigation & Motion">
            <div className="space-y-0">
              <DiagRow
                label="X"
                value={liveTelemetry?.position?.x !== undefined ? liveTelemetry.position.x.toFixed(2) : 'N/A'}
                unit="m"
              />
              <DiagRow
                label="Y"
                value={liveTelemetry?.position?.y !== undefined ? liveTelemetry.position.y.toFixed(2) : 'N/A'}
                unit="m"
              />
              <DiagRow
                label="Heading"
                value={
                  liveTelemetry?.position?.yaw !== undefined
                    ? ((liveTelemetry.position.yaw * 180) / Math.PI).toFixed(1)
                    : 'N/A'
                }
                unit="°"
              />
              <DiagRow
                label="Room"
                value={liveTelemetry?.current_room ?? 'N/A'}
              />
              <DiagRow
                label="Target X"
                value={liveTelemetry?.target_waypoint?.x?.toFixed(2)}
                unit="m"
              />
              <DiagRow
                label="Target Y"
                value={liveTelemetry?.target_waypoint?.y?.toFixed(2)}
                unit="m"
              />
              <DiagRow
                label="Planned Route"
                value={
                  liveTelemetry?.planned_route?.length !== undefined
                    ? `${liveTelemetry.planned_route.length} waypoints`
                    : 'N/A'
                }
              />
              <DiagRow
                label="Path History"
                value={
                  liveTelemetry?.path_history?.length !== undefined
                    ? `${liveTelemetry.path_history.length} points`
                    : 'N/A'
                }
              />
            </div>
          </DiagnosticCard>
        </div>

        {/* B: LIVE SENSORS */}
        <div className="col-span-12 md:col-span-4">
          <DiagnosticCard title="Live Sensors">
            <div className="space-y-0">
              <DiagRow
                label="Wheel Left"
                value={
                  liveTelemetry?.sensors?.wheels?.left_speed_mps !== undefined
                    ? liveTelemetry.sensors.wheels.left_speed_mps.toFixed(3)
                    : 'N/A'
                }
                unit="m/s"
              />
              <DiagRow
                label="Wheel Right"
                value={
                  liveTelemetry?.sensors?.wheels?.right_speed_mps !== undefined
                    ? liveTelemetry.sensors.wheels.right_speed_mps.toFixed(3)
                    : 'N/A'
                }
                unit="m/s"
              />
              <DiagRow
                label="Linear Velocity"
                value={
                  liveTelemetry?.sensors?.wheels?.velocity_mps !== undefined
                    ? liveTelemetry.sensors.wheels.velocity_mps.toFixed(3)
                    : 'N/A'
                }
                unit="m/s"
              />
              <DiagRow
                label="Angular Velocity"
                value={
                  liveTelemetry?.sensors?.wheels?.angular_velocity_radps !== undefined
                    ? ((liveTelemetry.sensors.wheels.angular_velocity_radps * 180) / Math.PI).toFixed(1)
                    : 'N/A'
                }
                unit="°/s"
              />
              <DiagRow
                label="Travelled"
                value={
                  liveTelemetry?.sensors?.wheels?.travelled_m !== undefined
                    ? liveTelemetry.sensors.wheels.travelled_m.toFixed(1)
                    : 'N/A'
                }
                unit="m"
              />
              <DiagRow
                label="LiDAR Scan"
                value={lidarData ? 'Available' : 'N/A'}
              />
              <DiagRow
                label="LiDAR Beams"
                value={lidarData?.beam_count ?? 'N/A'}
              />
              <DiagRow
                label="LiDAR Range"
                value={
                  lidarData
                    ? `${lidarData.range_min}–${lidarData.range_max}`
                    : 'N/A'
                }
                unit="m"
              />
            </div>
          </DiagnosticCard>
        </div>

        {/* C: ROBOT / SYSTEM INFO */}
        <div className="col-span-12 md:col-span-4">
          <DiagnosticCard title="System Info">
            <div className="space-y-0">
              <DiagRow label="Name" value={robotName} />
              <DiagRow label="Model" value={robotModel} />
              <DiagRow label="Engine" value={liveTelemetry?.engine_state ?? 'N/A'} />
              <DiagRow label="Status" value={liveTelemetry?.status ?? 'N/A'} />
              <DiagRow
                label="Connectivity"
                value={liveTelemetry ? 'Online' : 'Offline'}
              />
              <DiagRow label="Tick Rate" value={liveTelemetry?.tick_hz ?? 'N/A'} unit="Hz" />
              <DiagRow
                label="Robot ID"
                value={id?.slice(0, 8) + '…'}
              />
            </div>
          </DiagnosticCard>
        </div>
      </div>

      {/* SECTION 4: AUTONOMY ROW */}
      <div className="grid grid-cols-12 gap-4">
        {/* LEFT: CURRENT SITUATION */}
        <div className="col-span-12 lg:col-span-6">
          {apiSituation ? (
            <CurrentSituationCard
              robot={{} as Robot}
              situation={{
                robotId,
                path: apiSituation.path,
                floorCondition: apiSituation.floorCondition,
                nearbyObstacle: apiSituation.nearbyObstacle,
                restrictedArea: apiSituation.restrictedArea,
                response: apiSituation.response ?? 'No response recorded.',
              }}
              showRobot={false}
            />
          ) : (
            <Card>
              <div className="py-8 text-center text-[13px] text-ink-secondary">
                {situationLoading ? 'Loading situation…' : 'No situation data available.'}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT: RECENT AUTONOMOUS ACTIVITY */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          {apiDetections.length > 0 && (
            <WhatCleanBotNoticed detections={apiDetections} />
          )}
          {apiDecisions.length > 0 && (
            <CleanBotDecisions decisions={apiDecisions} />
          )}
          {apiDetections.length === 0 && apiDecisions.length === 0 && (
            <Card>
              <div className="py-8 text-center text-[13px] text-ink-secondary">
                No recent autonomy events.
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
