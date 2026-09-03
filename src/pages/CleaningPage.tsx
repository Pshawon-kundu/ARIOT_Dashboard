import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
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
import { useApp } from '../context/AppContext'
import {
  getCleaningJobs,
  getRobotLive,
  getSimulatorRobot,
  stopRobot,
  resetRobot,
  useApi,
  usePolling,
} from '../services/api'

type Tab = 'active' | 'history'

export function CleaningPage() {
  const { robots, showToast, openStartCleaningModal } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('active')
  const [confirmReset, setConfirmReset] = useState(false)

  const { data: simInfo } = useApi(getSimulatorRobot, [])
  const robotId = simInfo?.available ? String(simInfo.robot_id) : undefined
  const identityRobot = robotId ? robots.find((r) => r.id === robotId) ?? null : null

  const { data: liveTelemetry } = usePolling(
    () => getRobotLive(robotId ?? ''),
    1000,
    [robotId],
  )

  const { data: cleaningJobs } = useApi(getCleaningJobs, [])

  const isActive = liveTelemetry?.status === 'cleaning'

  const handleStart = () => {
    openStartCleaningModal(robotId)
  }

  const handleStop = async () => {
    if (!robotId) return
    try {
      await stopRobot(robotId)
      showToast('info', 'Cleaning stopped', `${identityRobot?.name ?? 'Robot'} has been stopped.`)
    } catch {
      showToast('error', 'Command failed', 'Could not stop the cleaning mission.')
    }
  }

  const handleReset = async () => {
    if (!robotId) return
    try {
      await resetRobot(robotId)
      showToast('info', 'Simulation reset', `${identityRobot?.name ?? 'Robot'} has been reset to factory state.`)
      setConfirmReset(false)
    } catch {
      showToast('error', 'Reset failed', 'Could not reset the simulation.')
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink">Cleaning</h1>
          <p className="mt-0.5 text-[13px] text-ink-secondary">
            Start, monitor, and review cleaning missions.
          </p>
        </div>
        <Button icon={<Play size={15} />} onClick={handleStart}>
          Start Cleaning
        </Button>
      </div>

      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setTab('active')}
          className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
            tab === 'active'
              ? 'bg-ink text-white'
              : 'bg-white text-ink-secondary ring-1 ring-line hover:bg-idle-pale'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setTab('history')}
          className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
            tab === 'history'
              ? 'bg-ink text-white'
              : 'bg-white text-ink-secondary ring-1 ring-line hover:bg-idle-pale'
          }`}
        >
          History
        </button>
      </div>

      {tab === 'active' && (
        <>
          {isActive ? (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 lg:col-span-8">
                  <FacilityMap
                    title="Live Facility Map"
                    liveTelemetry={liveTelemetry}
                    robotId={robotId}
                    robotName={identityRobot?.name}
                    detections={[]}
                  />
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-4">
                  <Card>
                    <h3 className="text-[13px] font-semibold text-ink-secondary uppercase tracking-wide mb-3">
                      Current Mission
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                        <span className="text-[12.5px] text-ink-secondary">Robot</span>
                        <span className="text-[12.5px] font-semibold text-ink">
                          {identityRobot?.name ?? 'Robot'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                        <span className="text-[12.5px] text-ink-secondary">Status</span>
                        <StatusBadge status={liveTelemetry?.status ?? 'unknown'} />
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                        <span className="text-[12.5px] text-ink-secondary">Room</span>
                        <span className="text-[12.5px] font-semibold text-ink">
                          {liveTelemetry?.current_room ?? 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                        <span className="text-[12.5px] text-ink-secondary">Task</span>
                        <span className="text-[12.5px] font-semibold text-ink">
                          {liveTelemetry?.current_task ?? 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                        <span className="text-[12.5px] text-ink-secondary">Mode</span>
                        <span className="text-[12.5px] font-semibold text-ink">
                          {liveTelemetry?.cleaning_mode ?? 'N/A'}
                        </span>
                      </div>
                      {liveTelemetry?.target_waypoint?.label && (
                        <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                          <span className="text-[12.5px] text-ink-secondary">Target</span>
                          <span className="text-[12.5px] font-semibold text-ink">
                            {liveTelemetry.target_waypoint.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>

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
                      <div className="flex items-center justify-between border-t border-line/40 pt-3">
                        <span className="text-[12px] text-ink-muted">Distance</span>
                        <span className="text-[12.5px] font-bold text-ink">
                          {liveTelemetry?.meters_cleaned !== undefined
                            ? `${Math.round(liveTelemetry.meters_cleaned)}m`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <h3 className="text-[13px] font-semibold text-ink-secondary uppercase tracking-wide mb-3">
                      Mission Progress
                    </h3>
                    <div className="mb-3">
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<Square size={13} />}
                        onClick={handleStop}
                        fullWidth
                      >
                        Stop
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<RotateCcw size={13} />}
                        onClick={() => setConfirmReset(true)}
                        fullWidth
                      >
                        Reset
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-8">
                <Card>
                  <div className="py-16 text-center">
                    <p className="text-[14px] font-semibold text-ink">
                      {identityRobot?.name ?? 'Robot'} is idle.
                    </p>
                    <p className="mt-1.5 text-[13px] text-ink-secondary">
                      {liveTelemetry
                        ? `Current state: ${liveTelemetry.engine_state ?? 'idle'}`
                        : 'Waiting for robot telemetry…'}
                    </p>
                    <Button className="mt-5" icon={<Play size={15} />} onClick={handleStart}>
                      Start Cleaning
                    </Button>
                  </div>
                </Card>
              </div>

              <div className="col-span-12 lg:col-span-4">
                <Card>
                  <h3 className="text-[13px] font-semibold text-ink-secondary uppercase tracking-wide mb-3">
                    Robot Status
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                      <span className="text-[12.5px] text-ink-secondary">Name</span>
                      <span className="text-[12.5px] font-semibold text-ink">
                        {identityRobot?.name ?? 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                      <span className="text-[12.5px] text-ink-secondary">Status</span>
                      <StatusBadge status={liveTelemetry?.status ?? 'unknown'} />
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                      <span className="text-[12.5px] text-ink-secondary">Battery</span>
                      <span className="text-[12.5px] font-semibold text-ink">
                        {liveTelemetry?.battery !== undefined ? `${liveTelemetry.battery}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-line/40">
                      <span className="text-[12.5px] text-ink-secondary">Water</span>
                      <span className="text-[12.5px] font-semibold text-ink">
                        {liveTelemetry?.water_level !== undefined ? `${liveTelemetry.water_level}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[12.5px] text-ink-secondary">Waste</span>
                      <span className="text-[12.5px] font-semibold text-ink">
                        {liveTelemetry?.waste_level !== undefined ? `${liveTelemetry.waste_level}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          {(!cleaningJobs || cleaningJobs.length === 0) ? (
            <Card>
              <EmptyState
                icon={<CheckCircle2 size={22} />}
                title="No cleaning history"
                description="Completed cleaning jobs will appear here."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cleaningJobs.map((job) => (
                <Card key={job.id} hoverable>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-pale text-success">
                        <CheckCircle2 size={18} />
                      </span>
                      <div>
                        <p className="text-[14px] font-bold text-ink">
                          {job.zone || job.floor || 'Cleaning Job'}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {job.completed_at
                            ? new Date(job.completed_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={job.status === 'completed' ? 'completed' : 'in_progress'} />
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
                      <MapPin size={13} className="shrink-0 text-ink-muted" />
                      {job.robot_name}
                    </div>
                    {job.progress !== undefined && job.progress !== null && (
                      <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
                        Progress: {job.progress}%
                      </div>
                    )}
                    {job.coverage !== undefined && job.coverage !== null && (
                      <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
                        Coverage: {job.coverage}%
                      </div>
                    )}
                    {job.started_at && (
                      <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary">
                        Started: {new Date(job.started_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/reports')}
                    >
                      View Report
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="mx-4 w-full max-w-sm p-6">
            <h3 className="text-[16px] font-bold text-ink">Reset Robot?</h3>
            <p className="mt-2 text-[13px] text-ink-secondary">
              This will reset {identityRobot?.name ?? 'the robot'} to factory state. Current cleaning progress will be lost.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button variant="danger" icon={<RotateCcw size={14} />} onClick={handleReset}>
                Reset
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
