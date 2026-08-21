import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Droplets,
  MapPin,
  Rocket,
  Sparkles,
  Timer,
  WandSparkles,
  X,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { RobotVisual } from '../robots/RobotVisual'
import { LevelOneFloorPlan } from '../map/LevelOneFloorPlan'
import { LevelTwoFloorPlan } from '../map/LevelTwoFloorPlan'
import { CleaningModeCard, type ModeOption } from './CleaningModeCard'
import { ScheduleSelector, type ScheduleType } from './ScheduleSelector'
import { useApp } from '../../context/AppContext'
import { level2Zones, zonesLevel1 } from '../../data/mockData'
import type { CleaningMode, FacilityZone, IntensityOption } from '../../types'

const steps = ['Area', 'Robot', 'Mode', 'When', 'Review']

const modeOptions: ModeOption[] = [
  {
    id: 'standard',
    title: 'Standard',
    description: 'Best for regular daily cleaning.',
    icon: <Sparkles size={19} />,
  },
  {
    id: 'deep',
    title: 'Deep Clean',
    description: 'For busy or dirtier areas that need more attention.',
    icon: <WandSparkles size={19} />,
  },
  {
    id: 'spot',
    title: 'Spot Clean',
    description: 'For spills or a small dirty area.',
    icon: <Rocket size={19} />,
  },
]

const durationByMode: Record<CleaningMode, string> = {
  standard: '42 min',
  deep: '1h 10m',
  spot: '25 min',
}

const defaultIntensity: Record<CleaningMode, { water: IntensityOption; suction: IntensityOption }> = {
  standard: { water: 'Standard', suction: 'Standard' },
  deep: { water: 'High', suction: 'High' },
  spot: { water: 'Standard', suction: 'High' },
}

const intensities: IntensityOption[] = ['Low', 'Standard', 'High']

function defaultDate(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function AreaSelector({
  floor,
  zones,
  selected,
  onToggle,
  noGo,
}: {
  floor: 'Level 1' | 'Level 2'
  zones: FacilityZone[]
  selected: string[]
  onToggle: (id: string) => void
  noGo: string[]
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      {floor === 'Level 1' ? <LevelOneFloorPlan /> : <LevelTwoFloorPlan />}
      <svg viewBox="0 0 820 500" className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <pattern id="taskNoGo" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="9" height="9" fill="#FDECEC" />
            <line x1="0" y1="0" x2="0" y2="9" stroke="#E5484D" strokeWidth="1.1" />
          </pattern>
        </defs>
        {zones.map((z) => {
          const isSel = selected.includes(z.id)
          const isNoGo = noGo.includes(z.id)
          return (
            <g
              key={z.id}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={() => onToggle(z.id)}
            >
              <rect
                x={z.x}
                y={z.y}
                width={z.w}
                height={z.h}
                rx={6}
                fill={isNoGo ? 'url(#taskNoGo)' : isSel ? 'rgba(23,105,224,0.14)' : 'transparent'}
                stroke={isNoGo ? '#E5484D' : isSel ? '#1769E0' : 'transparent'}
                strokeWidth={isNoGo || isSel ? 2.5 : 0}
              />
              {isNoGo && (
                <text
                  x={z.x + z.w / 2}
                  y={z.y + z.h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="11"
                  fontWeight={700}
                  fill="#E5484D"
                  fontFamily="Inter, sans-serif"
                >
                  Restricted
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function CleaningTaskModal() {
  const {
    taskModalOpen,
    taskModalRobotId,
    closeTaskModal,
    robots,
    addTask,
    updateRobot,
    showToast,
  } = useApp()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [robotId, setRobotId] = useState<string | null>(null)
  const [floor, setFloor] = useState<'Level 1' | 'Level 2'>('Level 1')
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['Z1'])
  const [entireFloor, setEntireFloor] = useState(false)
  const [noGo, setNoGo] = useState<string[]>([])
  const [mode, setMode] = useState<CleaningMode>('standard')
  const [water, setWater] = useState<IntensityOption>('Standard')
  const [suction, setSuction] = useState<IntensityOption>('Standard')
  const [scheduleType, setScheduleType] = useState<ScheduleType>('now')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('15:00')
  const [recurring, setRecurring] = useState('Weekdays')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const mapZones = floor === 'Level 1' ? zonesLevel1 : level2Zones
  const currentRobot = robots.find((r) => r.id === robotId) ?? null

  const recommendedRobot =
    robots.find((r) => r.status === 'ready') ??
    robots.find((r) => r.status === 'charging') ??
    null
  const recommendedId = recommendedRobot?.id ?? null

  const open = taskModalOpen

  useEffect(() => {
    if (!open) return
    if (taskModalRobotId) {
      setRobotId(taskModalRobotId)
    } else {
      setRobotId(recommendedId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const d = defaultIntensity[mode]
    setWater(d.water)
    setSuction(d.suction)
  }, [mode])

  const handleClose = () => {
    closeTaskModal()
    window.setTimeout(() => {
      setStep(0)
      setSubmitted(false)
      setEntireFloor(false)
      setSelectedAreas(['Z1'])
      setNoGo([])
      setScheduleType('now')
      setMode('standard')
      setShowAdvanced(false)
    }, 200)
  }

  const toggleArea = (id: string) => {
    setEntireFloor(false)
    setSelectedAreas((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))
  }

  const toggleNoGo = (id: string) => {
    setNoGo((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))
  }

  const areaNames = useMemo(() => {
    if (entireFloor) return [`${floor} — Entire Floor`]
    return selectedAreas
      .map((id) => mapZones.find((z) => z.id === id)?.name)
      .slice()
  }, [entireFloor, selectedAreas, mapZones])

  const areaLabel = areaNames.join(', ') || 'No area selected'

  const startDisplay =
    scheduleType === 'now'
      ? 'Today, as soon as possible'
      : scheduleType === 'later'
        ? `${formatDate(date)} · ${time}`
        : `Recurring · ${recurring}`

  const handleSubmit = () => {
    if (!currentRobot) return
    const taskId = `T-${Date.now() % 100000}`
    const scheduleLabel =
      scheduleType === 'now'
        ? 'Today'
        : scheduleType === 'later'
          ? formatDate(date)
          : `Recurring · ${recurring}`

    addTask({
      id: taskId,
      robotId: currentRobot.id,
      robotName: currentRobot.name,
      zone: areaLabel,
      floor,
      mode,
      waterUsage: water,
      suction,
      noGoZones: noGo.map((id) => mapZones.find((z) => z.id === id)?.name ?? id),
      scheduleType,
      startTime:
        scheduleType === 'now'
          ? 'Today'
          : scheduleType === 'later'
            ? `${formatDate(date)} ${time}`
            : `Weekdays ${time}`,
      estimatedDuration: durationByMode[mode],
      status: scheduleType === 'now' ? 'active' : 'scheduled',
      progress: scheduleType === 'now' ? 4 : 0,
    })

    if (scheduleType === 'now') {
      updateRobot(currentRobot.id, {
        status: 'cleaning',
        currentTask: `${areaLabel} Cleaning`,
        location: areaLabel,
        progress: 4,
        estimatedCompletion: durationByMode[mode],
        cleaningMode: mode,
        waterUsage: water,
        suction,
        nextTaskAt: undefined,
      })
      showToast('success', 'Cleaning started', `${currentRobot.name} is now cleaning ${areaLabel}.`)
    } else {
      showToast(
        'success',
        'Cleaning scheduled',
        `${currentRobot.name} will start cleaning ${areaLabel} (${scheduleLabel}).`,
      )
    }
    setSubmitted(true)
  }

  const canContinue =
    (step === 0 && (entireFloor || selectedAreas.length > 0)) ||
    (step === 1 && robotId !== null) ||
    step === 2 ||
    step === 3

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Cleaning Task"
      subtitle="Choose where to clean — we'll recommend the best robot"
      maxWidth="max-w-3xl"
    >
      {submitted ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-pale text-success">
            <CheckCircle2 size={34} />
          </span>
          <h3 className="mt-4 text-lg font-bold text-ink">Cleaning scheduled</h3>
          <p className="mt-1.5 max-w-sm text-sm text-ink-secondary">
            {currentRobot?.name} will start cleaning {areaLabel}
            {scheduleType === 'later' || scheduleType === 'recurring'
              ? ` ${startDisplay.toLowerCase()}.`
              : '.'}
          </p>
          <div className="mt-7 flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                handleClose()
                navigate('/cleaning')
              }}
            >
              View Task
            </Button>
            <Button
              onClick={() => {
                handleClose()
                navigate('/cleaning')
              }}
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Step indicator */}
          <div className="border-b border-line px-6 py-4">
            <div className="flex items-center">
              {steps.map((label, i) => (
                <div key={label} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        i < step
                          ? 'bg-success text-white'
                          : i === step
                            ? 'bg-brand text-white'
                            : 'bg-idle-pale text-ink-muted'
                      }`}
                    >
                      {i < step ? <Check size={13} strokeWidth={3} /> : i + 1}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        i <= step ? 'text-ink' : 'text-ink-muted'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`mx-2 mb-5 h-0.5 flex-1 rounded-full ${
                        i < step ? 'bg-success' : 'bg-line'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step content */}
          <div className="max-h-[54vh] overflow-y-auto px-6 py-5 scrollbar-thin">
            {step === 0 && (
              <div>
                <p className="mb-3 text-[13px] font-semibold text-ink-secondary">
                  Where should CleanBot clean?
                </p>
                <div className="mb-4 flex gap-2">
                  {(['Level 1', 'Level 2'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setFloor(f)
                        setSelectedAreas([])
                        setNoGo([])
                        setEntireFloor(false)
                      }}
                      className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                        floor === f
                          ? 'bg-brand text-white'
                          : 'bg-white text-ink-secondary ring-1 ring-line hover:bg-idle-pale'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setEntireFloor((v) => !v)
                      setSelectedAreas([])
                    }}
                    className={`ml-auto rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                      entireFloor
                        ? 'bg-brand text-white'
                        : 'bg-white text-ink-secondary ring-1 ring-line hover:bg-idle-pale'
                    }`}
                  >
                    Entire Floor
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_220px] gap-4">
                  <AreaSelector
                    floor={floor}
                    zones={mapZones}
                    selected={selectedAreas}
                    onToggle={toggleArea}
                    noGo={noGo}
                  />
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-ink-secondary">
                        Selected rooms
                      </p>
                      <div className="min-h-[60px] rounded-lg border border-line bg-app/50 p-2 text-[12.5px] text-ink">
                        {entireFloor ? (
                          <span className="font-medium">Whole {floor}</span>
                        ) : selectedAreas.length ? (
                          selectedAreas
                            .map((id) => mapZones.find((z) => z.id === id)?.name)
                            .join(', ')
                        ) : (
                          <span className="text-ink-muted">Tap rooms on the map</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-xs font-semibold text-ink-secondary">Restricted Areas</p>
                        <button
                          type="button"
                          onClick={() => {
                            const first = mapZones.find((z) => !noGo.includes(z.id))
                            if (first) toggleNoGo(first.id)
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:text-brand-dark"
                        >
                          <X size={11} className="rotate-45" /> Add Restricted Area
                        </button>
                      </div>
                      <p className="mb-1.5 text-[11px] leading-snug text-ink-muted">
                        The robot will not enter these areas.
                      </p>
                      <div className="space-y-1.5">
                        {mapZones.map((z) => {
                          const isNoGo = noGo.includes(z.id)
                          return (
                            <button
                              key={z.id}
                              onClick={() => toggleNoGo(z.id)}
                              className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-[12px] font-medium transition-all ${
                                isNoGo
                                  ? 'border-danger bg-danger-pale text-danger'
                                  : 'border-line bg-white text-ink-secondary hover:border-[#CBD5E1]'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <MapPin size={12} className="shrink-0" />
                                {z.name}
                              </span>
                              <span
                                className={`h-3.5 w-3.5 rounded-[3px] border ${
                                  isNoGo ? 'border-danger bg-danger' : 'border-line'
                                }`}
                              />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="mb-3 text-[13px] font-semibold text-ink-secondary">
                  Which robot should clean this area?
                </p>
                {recommendedRobot && (
                  <button
                    key={recommendedRobot.id}
                    onClick={() => setRobotId(recommendedRobot.id)}
                    className={`relative mb-3 flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-150 ${
                      robotId === recommendedRobot.id
                        ? 'border-brand bg-brand-pale/60 ring-1 ring-brand'
                        : 'border-line bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <span className="absolute right-3 top-3 rounded-full bg-success-pale px-2 py-0.5 text-[10px] font-bold text-[#18794E]">
                      Recommended
                    </span>
                    <RobotVisual size={60} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-bold text-ink">{recommendedRobot.name}</p>
                      <p className="text-[11px] text-ink-muted">{recommendedRobot.id}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-[12px] font-semibold text-ink-secondary">
                        <span className="flex items-center gap-1">
                          <BatteryMediumMini /> {recommendedRobot.battery}% battery
                        </span>
                        <span className="flex items-center gap-1">
                          <Droplets size={12} className="text-water" /> {recommendedRobot.water}% water
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] text-[#18794E]">
                        Recommended because this robot is ready and available.
                      </p>
                    </div>
                    <StatusBadge status={recommendedRobot.status} />
                  </button>
                )}

                <p className="mb-2 mt-1 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                  Other robots
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {robots
                    .filter((r) => r.id !== recommendedId)
                    .map((robot) => {
                      const selected = robotId === robot.id
                      return (
                        <button
                          key={robot.id}
                          onClick={() => setRobotId(robot.id)}
                          className={`flex flex-col items-center gap-1 rounded-xl border p-4 text-center transition-all duration-150 ${
                            selected
                              ? 'border-brand bg-brand-pale/60 ring-1 ring-brand'
                              : 'border-line bg-white hover:border-[#CBD5E1]'
                          }`}
                        >
                          <RobotVisual size={56} />
                          <span className="text-[13.5px] font-bold text-ink">{robot.name}</span>
                          <StatusBadge status={robot.status} />
                          <span className="text-[11px] text-ink-muted">
                            {robot.status === 'cleaning'
                              ? 'Cleaning now'
                              : robot.status === 'paused'
                                ? 'Paused'
                                : robot.status === 'ready'
                                  ? 'Ready to go'
                                  : robot.status === 'charging'
                                    ? 'Charging'
                                    : 'Needs attention'}
                          </span>
                        </button>
                      )
                    })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="mb-3 text-[13px] font-semibold text-ink-secondary">
                  How should this area be cleaned?
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {modeOptions.map((m) => (
                    <CleaningModeCard key={m.id} mode={m} selected={mode === m.id} onSelect={setMode} />
                  ))}
                </div>

                <div className="mt-5 rounded-xl bg-brand-pale/60 px-4 py-3 text-[12.5px] text-ink-secondary">
                  <span className="font-semibold text-brand-dark">Recommended settings</span>
                  {' · '}Water {defaultIntensity[mode].water}, Suction {defaultIntensity[mode].suction}.
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-white py-2.5 text-[13px] font-semibold text-ink-secondary transition-colors hover:bg-app"
                >
                  {showAdvanced ? 'Hide cleaning settings' : 'Adjust cleaning settings'}
                  <ChevronDown
                    size={15}
                    className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  />
                </button>

                {showAdvanced && (
                  <div className="mt-3 grid grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <p className="mb-2 text-[13px] font-semibold text-ink-secondary">Water Usage</p>
                      <div className="inline-flex w-full rounded-lg border border-line bg-app p-1">
                        {intensities.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setWater(opt)}
                            className={`flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-semibold transition-colors ${
                              water === opt ? 'bg-brand text-white shadow-sm' : 'text-ink-secondary hover:text-ink'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[13px] font-semibold text-ink-secondary">Suction</p>
                      <div className="inline-flex w-full rounded-lg border border-line bg-app p-1">
                        {intensities.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setSuction(opt)}
                            className={`flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-semibold transition-colors ${
                              suction === opt ? 'bg-brand text-white shadow-sm' : 'text-ink-secondary hover:text-ink'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <ScheduleSelector
                value={scheduleType}
                onChange={setScheduleType}
                date={date}
                onDateChange={setDate}
                time={time}
                onTimeChange={setTime}
                recurring={recurring}
                onRecurringChange={setRecurring}
              />
            )}

            {step === 4 && currentRobot && (
              <div>
                <p className="mb-3 text-[13px] font-semibold text-ink-secondary">
                  Review your cleaning task
                </p>
                <div className="overflow-hidden rounded-xl border border-line">
                  <SummaryRow label="Area" value={`${floor} · ${areaLabel}`} />
                  <SummaryRow label="Robot" value={`${currentRobot.name} (${currentRobot.id})`} />
                  <SummaryRow label="Mode" value={modeOptions.find((m) => m.id === mode)?.title ?? mode} />
                  <SummaryRow label="Water" value={water} />
                  <SummaryRow label="Suction" value={suction} />
                  <SummaryRow
                    label="Restricted Areas"
                    value={noGo.length ? `${noGo.length} added` : 'None'}
                    valueClass={noGo.length ? 'text-danger' : undefined}
                  />
                  <SummaryRow label="Start" value={startDisplay} last />
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-brand-pale/60 px-4 py-3">
                  <Bot size={18} className="shrink-0 text-brand" />
                  <p className="text-[13px] text-ink-secondary">
                    <span className="font-semibold text-brand-dark">
                      Estimated time: {durationByMode[mode]}
                    </span>
                    . The robot will skip any restricted areas you selected.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="ghost" icon={<ChevronLeft size={16} />} onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
              )}
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
            </div>
            {step < 4 ? (
              <Button
                icon={<ChevronRight size={16} className="text-white" />}
                disabled={!canContinue}
                onClick={() => setStep((s) => s + 1)}
              >
                Continue
              </Button>
            ) : (
              <Button
                size="lg"
                icon={scheduleType === 'now' ? <PlayIcon /> : <Timer size={16} className="text-white" />}
                onClick={handleSubmit}
              >
                {scheduleType === 'now' ? 'Start Cleaning' : 'Schedule Cleaning'}
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

function BatteryMediumMini() {
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />
}

function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l10.2-6.86a1.04 1.04 0 0 0 0-1.76L9.56 4.26A1.04 1.04 0 0 0 8 5.14Z" />
    </svg>
  )
}

function SummaryRow({
  label,
  value,
  last = false,
  valueClass,
}: {
  label: string
  value: string
  last?: boolean
  valueClass?: string
}) {
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3 ${last ? '' : 'border-b border-line'}`}>
      <span className="text-[13px] text-ink-secondary">{label}</span>
      <span className={`text-[13px] font-semibold ${valueClass ?? 'text-ink'}`}>{value}</span>
    </div>
  )
}
