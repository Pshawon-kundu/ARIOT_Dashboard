import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BatteryMedium,
  CalendarPlus,
  ChevronDown,
  Clock,
  Droplets,
  History,
  Home,
  MapPin,
  Pause,
  Play,
  Square,
  Trash2,
  TriangleAlert,
  Wifi,
  Wrench,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { EmptyState } from '../components/ui/EmptyState'
import { FacilityMap } from '../components/map/FacilityMap'
import { RobotVisual } from '../components/robots/RobotVisual'
import { CurrentSituationCard } from '../components/situation/CurrentSituationCard'
import { CleanBotDecisions } from '../components/situation/CleanBotDecisions'
import { WhatCleanBotNoticed } from '../components/situation/WhatCleanBotNoticed'
import { AutomaticCleaningBadge } from '../components/situation/AutomaticCleaningBadge'
import { detectionMeta } from '../components/situation/awareness'
import { useApp } from '../context/AppContext'
import { getRobotSituation, useApi } from '../services/api'
import type { ApiSituation } from '../services/api'
import type {
  AutonomousDecision,
  CleaningDetection,
  CleaningMode,
  DetectionType,
  IntensityOption,
  Robot,
  RobotSituation,
} from '../types'

const modes: { id: CleaningMode; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'deep', label: 'Deep Clean' },
  { id: 'spot', label: 'Spot Clean' },
]
const intensities: IntensityOption[] = ['Low', 'Standard', 'High']

/* ===== Map backend data into the shapes the UI components expect ===== */

function mapDetectionType(t?: string): DetectionType {
  switch (t) {
    case 'heavy_dirt':
      return 'dirt'
    case 'spill':
      return 'spill'
    case 'obstacle':
      return 'obstacle'
    default:
      return 'dirt'
  }
}

function mapApiRobotToRobot(api: { id: number; name: string; model?: string; status?: string }, sit?: ApiSituation): Robot {
  return {
    id: String(api.id),
    name: api.name,
    model: api.model ?? '',
    status: api.status ?? 'ready',
    location: sit?.current_situation?.location ?? 'Unknown',
    level: 1,
    battery: 0,
    water: 0,
    wasteBin: 0,
    progress: 0,
    currentTask: 'Live cleaning task',
    estimatedCompletion: '—',
    connectivity: 'Online',
    lastCommunication: '',
    lastMaintenance: '',
    nextInspection: '',
    operatingHours: 0,
  }
}

function mapSituation(sit: ApiSituation, robotId: string): RobotSituation {
  const cs = sit.current_situation
  return {
    robotId,
    path: cs.location ?? '—',
    floorCondition: cs.floor_condition ?? 'Unknown',
    nearbyObstacle: cs.nearby_obstacle ?? 'None',
    restrictedArea: cs.restricted_area ?? 'None',
    response: 'CleanBot is continuously monitoring and adjusting on its own.',
  }
}

function mapDetections(sit: ApiSituation, robotId: string): CleaningDetection[] {
  return sit.detections.map((d, i) => {
    const type = mapDetectionType(d.type)
    return {
      id: String(d.id ?? i),
      robotId,
      type,
      title: detectionMeta[type].label,
      location: d.location ?? '—',
      timestamp: d.created_at ?? '',
      response: d.response ?? d.description ?? 'CleanBot responded automatically.',
      outcome: d.handled_automatically ? 'auto' : 'monitoring',
    }
  })
}

function mapDecisions(sit: ApiSituation, robotId: string): AutonomousDecision[] {
  return sit.decisions.map((dec, i) => ({
    id: String(i),
    robotId,
    time: '',
    notice: dec.action,
    location: dec.reason ?? '',
    response: dec.action,
    outcome: 'auto',
    why: dec.reason,
  }))
}

function ApiPanel({
  loading,
  error,
  isEmpty,
  empty,
  children,
}: {
  loading: boolean
  error: string | null
  isEmpty?: boolean
  empty: ReactNode
  children: ReactNode
}) {
  if (loading) {
    return (
      <Card>
        <div className="py-10 text-center text-[13px] text-ink-secondary">
          Loading live data…
        </div>
      </Card>
    )
  }
  if (error) {
    return (
      <Card>
        <div className="py-10 text-center text-[13px] text-danger">
          Couldn’t load live data. {error}
        </div>
      </Card>
    )
  }
  if (isEmpty) {
    return <Card>{empty}</Card>
  }
  return <>{children}</>
}

export function RobotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { robots, maintenance, updateRobot, showToast, openTaskModal } = useApp()
  const [confirm, setConfirm] = useState<'stop' | 'dock' | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const { data: situation, loading, error } = useApi(
    () => getRobotSituation(id ?? ''),
    [id],
  )

  const localRobot = robots.find((r) => r.id === id)
  const apiRobot = situation?.robot
  const robotId = apiRobot ? String(apiRobot.id) : id ?? ''
  const robot: Robot | undefined =
    localRobot ?? (apiRobot ? mapApiRobotToRobot(apiRobot, situation ?? undefined) : undefined)

  const apiSituation = situation ? mapSituation(situation, robotId) : undefined
  const apiDetections = situation ? mapDetections(situation, robotId) : []
  const apiDecisions = situation ? mapDecisions(situation, robotId) : []

  if (loading && !localRobot) {
    return (
      <Card>
        <div className="py-16 text-center text-[13px] text-ink-secondary">
          Loading robot…
        </div>
      </Card>
    )
  }

  if (error && !localRobot) {
    return (
      <Card>
        <div className="py-16 text-center text-[13px] text-danger">
          Couldn’t load this robot. {error}
        </div>
      </Card>
    )
  }

  if (!robot) {
    return (
      <Card>
        <EmptyState
          icon={<Wrench size={22} />}
          title="Robot not found"
          description="This robot may have been removed from the fleet."
        />
        <div className="flex justify-center pb-6">
          <Button variant="secondary" onClick={() => navigate('/robots')}>
            Back to Robots
          </Button>
        </div>
      </Card>
    )
  }

  const isCleaning = robot.status === 'cleaning' || robot.status === 'paused'
  const around = undefined
  const robotMaintenance = maintenance.filter((m) => m.robotId === robot.id)

  const needsAttention = robot.water < 30 || robot.wasteBin > 80 || robot.status === 'attention'
  const attentionMessage = (() => {
    if (robot.water < 30) return `Water is running low — ${robot.water}% remaining. Refill before the next cleaning job.`
    if (robot.wasteBin > 80) return `The waste bin is nearly full — ${robot.wasteBin}% full. Empty it before the next cleaning job.`
    return 'This robot needs a quick check before its next job.'
  })()

  const handleStop = () => {
    updateRobot(robot.id, {
      status: 'ready',
      currentTask: 'No active task',
      estimatedCompletion: '—',
      progress: 0,
      paused: false,
    })
    showToast('info', `${robot.name} stopped`, 'Cleaning was stopped. The robot is now ready.')
  }

  const handleDock = () => {
    updateRobot(robot.id, {
      status: 'charging',
      location: 'Charging Dock',
      currentTask: 'No active task',
      estimatedCompletion: '—',
      progress: 0,
      paused: false,
    })
    showToast('info', `${robot.name} returning to dock`, 'The robot will dock and start charging.')
  }

  const handlePause = () => {
    updateRobot(robot.id, { status: 'paused', paused: true })
    showToast('warning', `${robot.name} paused`, 'Cleaning is paused. Resume whenever you are ready.')
  }

  const handleResume = () => {
    updateRobot(robot.id, { status: 'cleaning', paused: false })
    showToast('success', `${robot.name} resumed`, 'Cleaning has resumed.')
  }

  return (
    <div>
      <Link
        to="/robots"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-secondary transition-colors hover:text-brand"
      >
        <ArrowLeft size={15} /> Back to Robots
      </Link>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-5">
                <span className="flex h-[104px] w-[104px] items-center justify-center rounded-2xl border border-line bg-app">
                  <RobotVisual size={94} />
                </span>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-[22px] font-bold tracking-tight text-ink">{robot.name}</h1>
                    <StatusBadge status={robot.status} />
                  </div>
                  <p className="mt-1 text-[13px] text-ink-secondary">
                    Robot ID: <span className="font-semibold text-ink">{robot.id}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-secondary">
                    <MapPin size={13} className="text-ink-muted" />
                    {robot.location}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success-pale px-2.5 py-1 text-xs font-semibold text-[#18794E]">
                    <Wifi size={13} />
                    {robot.connectivity}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <FacilityMap title="Live Facility Map" />
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="text-[16px] font-bold text-ink">Current Cleaning</h2>
            {isCleaning ? (
              <>
                <div className="mt-3 rounded-xl border border-line bg-app/60 px-4 py-3.5">
                  <p className="text-[14.5px] font-bold text-ink">{robot.currentTask}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-secondary">{robot.location}</p>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-[12.5px]">
                    <span className="font-medium text-ink-secondary">Job progress</span>
                    <span className="font-bold text-ink">{robot.progress}%</span>
                  </div>
                  <ProgressBar value={robot.progress} />
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-pale/60 px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[13px] font-medium text-ink-secondary">
                    <Clock size={14} className="text-brand" />
                    About
                  </span>
                  <span className="text-[15px] font-bold text-brand-dark">
                    {robot.estimatedCompletion} remaining
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-3 rounded-xl bg-app/60 px-4 py-3.5 text-[13px] text-ink-secondary">
                {robot.status === 'charging'
                  ? 'This robot is charging and not cleaning right now.'
                  : 'This robot is ready and not cleaning right now.'}
              </p>
            )}

            <div className="mt-4 space-y-3 border-t border-line pt-4">
              <Metric label="Battery" value={`${robot.battery}%`} icon={<BatteryMedium size={14} className="text-success" />} bar={<ProgressBar value={robot.battery} color="bg-success" />} />
              <Metric label="Water" value={`${robot.water}%`} icon={<Droplets size={14} className="text-water" />} bar={<ProgressBar value={robot.water} color="bg-water" />} />
              <Metric
                label="Waste Bin"
                value={`${robot.wasteBin}% Full`}
                icon={<Trash2 size={14} className="text-ink-secondary" />}
                bar={<ProgressBar value={robot.wasteBin} color={robot.wasteBin >= 80 ? 'bg-danger' : 'bg-warning'} />}
              />
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink-secondary">Cleaning Mode</p>
                <StatusBadge
                  status=""
                  label={modes.find((m) => m.id === robot.cleaningMode)?.label ?? 'Standard'}
                  tone="blue"
                  dot={false}
                />
              </div>

              <div className="mt-3">
                <AutomaticCleaningBadge />
              </div>

              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-white py-2.5 text-[13px] font-semibold text-ink-secondary transition-colors hover:bg-app"
              >
                {showSettings ? 'Hide advanced settings' : 'Advanced settings'}
                <ChevronDown size={15} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </button>

              {showSettings && (
                <div className="mt-3 space-y-4 animate-fade-in">
                  <p className="text-[12px] leading-snug text-ink-muted">
                    Optional manual override. CleanBot normally adjusts these on its own.
                  </p>
                  <SettingRow label="Cleaning Mode">
                    <Segmented
                      options={modes.map((m) => m.label)}
                      value={modes.find((m) => m.id === robot.cleaningMode)?.label ?? 'Standard'}
                      onChange={(v) =>
                        updateRobot(robot.id, { cleaningMode: modes.find((m) => m.label === v)!.id })
                      }
                    />
                  </SettingRow>
                  <SettingRow label="Water Usage">
                    <Segmented
                      options={intensities}
                      value={robot.waterUsage ?? 'Standard'}
                      onChange={(v) => updateRobot(robot.id, { waterUsage: v as IntensityOption })}
                    />
                  </SettingRow>
                  <SettingRow label="Suction">
                    <Segmented
                      options={intensities}
                      value={robot.suction ?? 'Standard'}
                      onChange={(v) => updateRobot(robot.id, { suction: v as IntensityOption })}
                    />
                  </SettingRow>
                </div>
              )}
            </div>
          </Card>

          <ApiPanel
            loading={loading}
            error={error}
            isEmpty={!apiSituation}
            empty={
              <EmptyState
                icon={<TriangleAlert size={22} />}
                title="No situation data"
                description="CleanBot hasn't reported a current situation for this robot yet."
              />
            }
          >
            <CurrentSituationCard
              robot={robot}
              situation={apiSituation!}
              around={around}
              showRobot={false}
            />
          </ApiPanel>

          {needsAttention && (
            <Card className="border-warning/40 bg-warning-pale/40">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-pale text-warning">
                  <TriangleAlert size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[16px] font-bold text-ink">Needs Your Attention</h2>
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-secondary">
                    {attentionMessage}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/alerts')}
                    className="mt-2.5 w-full rounded-lg bg-white py-1.5 text-[12.5px] font-semibold text-brand ring-1 ring-line transition-colors hover:bg-brand-pale"
                  >
                    View Alerts
                  </button>
                </div>
              </div>
            </Card>
          )}

          <ApiPanel
            loading={loading}
            error={error}
            isEmpty={false}
            empty={<></>}
          >
            <WhatCleanBotNoticed detections={apiDetections} />
          </ApiPanel>

          <ApiPanel
            loading={loading}
            error={error}
            isEmpty={apiDecisions.length === 0}
            empty={
              <EmptyState
                icon={<TriangleAlert size={22} />}
                title="No recent decisions"
                description="CleanBot hasn't needed to change its behavior for this robot yet."
              />
            }
          >
            <CleanBotDecisions decisions={apiDecisions} />
          </ApiPanel>

          <Card>
            <div className="flex items-center gap-2">
              <Wrench size={17} className="text-warning" />
              <h2 className="text-[16px] font-bold text-ink">Robot Health</h2>
            </div>
            <div className="mt-4 space-y-3">
              <HealthRow label="Battery" value={`${robot.battery}%`} tone={robot.battery > 30 ? 'good' : 'warn'} />
              <HealthRow label="Water" value={`${robot.water}%`} tone={robot.water > 30 ? 'good' : 'warn'} />
              <HealthRow label="Waste Bin" value={`${robot.wasteBin}% full`} tone={robot.wasteBin < 80 ? 'good' : 'warn'} />
              <HealthRow
                label="Main Brush"
                value={robotMaintenance[0]?.status === 'Inspected' ? 'Good' : 'Check recommended'}
                tone={robotMaintenance[0]?.status === 'Inspected' ? 'good' : 'warn'}
              />
              <HealthRow label="Connectivity" value={robot.connectivity} tone={robot.connectivity === 'Online' ? 'good' : 'warn'} />
            </div>
          </Card>

          <Card>
            <h2 className="text-[16px] font-bold text-ink">Controls</h2>
            <p className="mt-1 text-[12px] text-ink-secondary">
              CleanBot handles normal operation itself. Use these for exceptions.
            </p>
            <div className="mt-4 space-y-2.5">
              {robot.status === 'paused' ? (
                <Button fullWidth icon={<Play size={16} />} onClick={handleResume}>
                  Resume Cleaning
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="secondary"
                  icon={<Pause size={16} />}
                  onClick={handlePause}
                  disabled={!isCleaning}
                >
                  Pause Cleaning
                </Button>
              )}
              <Button
                fullWidth
                variant="secondary"
                icon={<Home size={16} />}
                onClick={() => setConfirm('dock')}
                disabled={robot.status === 'charging'}
              >
                Return to Dock
              </Button>
              <Button
                fullWidth
                variant="danger"
                icon={<Square size={15} />}
                onClick={() => setConfirm('stop')}
                disabled={!isCleaning}
              >
                Stop Cleaning
              </Button>
              <Button
                fullWidth
                icon={<CalendarPlus size={16} />}
                onClick={() => openTaskModal(robot.id)}
              >
                Schedule Cleaning
              </Button>
              <Button
                fullWidth
                variant="secondary"
                icon={<MapPin size={16} />}
                onClick={() => navigate(`/robots/${robot.id}/map-setup`)}
              >
                Configure Floor Map
              </Button>
              <Button
                fullWidth
                variant="secondary"
                icon={<History size={16} />}
                onClick={() => {
                  navigate('/reports')
                  showToast('info', 'Cleaning history', `Showing recent reports for ${robot.name}.`)
                }}
              >
                View Cleaning History
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={confirm === 'stop'}
        onClose={() => setConfirm(null)}
        onConfirm={handleStop}
        danger
        title={`Stop ${robot.name}?`}
        description={`${robot.name} will stop cleaning and wait for your next instruction.`}
        confirmLabel="Stop Cleaning"
        icon={<Square size={20} />}
      />
      <ConfirmModal
        open={confirm === 'dock'}
        onClose={() => setConfirm(null)}
        onConfirm={handleDock}
        title={`Return ${robot.name} to the charging dock?`}
        description="The current cleaning job will pause while the robot makes its way back to the dock."
        confirmLabel="Return to Dock"
        icon={<Home size={20} />}
      />
    </div>
  )
}

function Metric({
  label,
  value,
  icon,
  bar,
}: {
  label: string
  value: string
  icon: ReactNode
  bar: ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="flex items-center gap-1.5 font-medium text-ink-secondary">{icon}{label}</span>
        <span className="font-bold text-ink">{value}</span>
      </div>
      <div className="mt-2">{bar}</div>
    </div>
  )
}

function HealthRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'good' | 'warn'
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-ink-secondary">{label}</span>
      <span
        className={`text-[13px] font-semibold ${
          tone === 'good' ? 'text-[#18794E]' : 'text-warning'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <div className="sm:w-[60%]">{children}</div>
    </div>
  )
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex w-full rounded-lg border border-line bg-app p-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-semibold transition-colors ${
            value === opt ? 'bg-brand text-white shadow-sm' : 'text-ink-secondary hover:text-ink'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
