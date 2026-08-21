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
import { useApp } from '../context/AppContext'
import type { CleaningMode, IntensityOption } from '../types'

const modes: { id: CleaningMode; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'deep', label: 'Deep Clean' },
  { id: 'spot', label: 'Spot Clean' },
]
const intensities: IntensityOption[] = ['Low', 'Standard', 'High']

export function RobotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { robots, updateRobot, showToast, openTaskModal } = useApp()
  const [confirm, setConfirm] = useState<'stop' | 'dock' | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const robot = robots.find((r) => r.id === id)

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
        {/* Left column: hero + large live map */}
        <div className="col-span-2 space-y-4">
          {/* Hero */}
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

          {/* Large live facility map */}
          <FacilityMap title="Live Facility Map" />
        </div>

        {/* Right column: current cleaning + controls + maintenance */}
        <div className="space-y-4">
          {/* Current cleaning */}
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

              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-white py-2.5 text-[13px] font-semibold text-ink-secondary transition-colors hover:bg-app"
              >
                {showSettings ? 'Hide cleaning settings' : 'Cleaning settings'}
                <ChevronDown size={15} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </button>

              {showSettings && (
                <div className="mt-3 space-y-4 animate-fade-in">
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

          {/* Live controls */}
          <Card>
            <h2 className="text-[16px] font-bold text-ink">Live Controls</h2>
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

          {/* Maintenance */}
          <Card>
            <div className="flex items-center gap-2">
              <Wrench size={17} className="text-warning" />
              <h2 className="text-[16px] font-bold text-ink">Maintenance</h2>
            </div>
            <div className="mt-4 space-y-3.5">
              <DetailRow label="Last maintenance" value={robot.lastMaintenance} />
              <DetailRow label="Next recommended inspection" value={robot.nextInspection} valueClass="text-warning" />
              <DetailRow label="Operating hours" value={`${robot.operatingHours}h`} />
              <DetailRow label="Last communication" value={robot.lastCommunication} />
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmations */}
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

function DetailRow({
  label,
  value,
  valueClass = 'text-ink',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-ink-secondary">{label}</span>
      <span className={`text-[13px] font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}
