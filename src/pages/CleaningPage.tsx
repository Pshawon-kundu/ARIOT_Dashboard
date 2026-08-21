import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { FacilityMap } from '../components/map/FacilityMap'
import { RobotVisual } from '../components/robots/RobotVisual'
import { useApp } from '../context/AppContext'

import type { CleaningMode } from '../types'

const modeLabel: Record<CleaningMode, string> = {
  standard: 'Standard',
  deep: 'Deep Clean',
  spot: 'Spot Clean',
}

export function CleaningPage() {
  const { robots, tasks, openTaskModal } = useApp()
  const navigate = useNavigate()

  const activeRobots = robots.filter((r) => r.status === 'cleaning')
  const scheduled = tasks.filter((t) => t.status === 'scheduled')

  return (
    <div>
      <PageHeader
        title="Cleaning Operations"
        subtitle="Create, schedule and monitor cleaning tasks"
      >
        <Button icon={<Plus size={16} />} onClick={() => openTaskModal()}>
          New Cleaning Task
        </Button>
      </PageHeader>

      {/* Active cleaning */}
      <h2 className="mb-3 text-[15px] font-bold text-ink">Active Cleaning</h2>
      {activeRobots.length === 0 ? (
        <Card className="mb-6">
          <EmptyState
            icon={<Sparkles size={22} />}
            title="No cleaning in progress"
            description="Start a cleaning task to see live progress here."
          />
          <div className="flex justify-center pb-6">
            <Button onClick={() => openTaskModal()}>Start Cleaning</Button>
          </div>
        </Card>
      ) : (
        <div className="mb-6 grid grid-cols-3 gap-4">
          {activeRobots.map((robot) => (
            <Card key={robot.id} className="col-span-2">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-idle-pale">
                        <RobotVisual size={46} />
                      </span>
                      <div>
                        <p className="text-[15px] font-bold text-ink">
                          {robot.name}
                        </p>
                        <p className="text-xs text-ink-muted">{robot.id}</p>
                      </div>
                    </div>
                    <StatusBadge status={robot.status} />
                  </div>
                  <p className="mt-3.5 flex items-center gap-1.5 text-[13px] text-ink-secondary">
                    <MapPin size={14} className="shrink-0 text-ink-muted" />
                    {robot.location}
                  </p>
                  <p className="mt-3 text-[13px] font-semibold text-ink">
                    {robot.currentTask}
                  </p>

                  <div className="mt-5 space-y-3">
                    <div>
                      <div className="mb-1.5 flex justify-between text-[12.5px]">
                        <span className="font-medium text-ink-secondary">
                          Complete
                        </span>
                        <span className="font-bold text-ink">
                          {robot.progress}%
                        </span>
                      </div>
                      <ProgressBar value={robot.progress} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-brand-pale/60 px-3.5 py-2.5">
                      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-secondary">
                        <Clock size={13} className="text-brand" />
                        Remaining
                      </span>
                      <span className="text-[14px] font-bold text-brand-dark">
                        {robot.estimatedCompletion}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={() => navigate(`/robots/${robot.id}`)}
                  >
                    View Details
                  </Button>
                </div>
                <div className="rounded-xl border border-line bg-app/50 p-2">
                  <FacilityMap />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Scheduled tasks */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-ink">Scheduled Tasks</h2>
        <span className="text-[13px] text-ink-muted">
          {scheduled.length} upcoming
        </span>
      </div>
      {scheduled.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays size={22} />}
            title="No scheduled tasks"
            description="Schedule a cleaning task and it will appear here."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {scheduled.map((task) => {
            const robot = robots.find((r) => r.id === task.robotId)
            return (
              <Card key={task.id} hoverable>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pale text-brand">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <p className="text-[14px] font-bold text-ink">
                        {task.zone}
                      </p>
                      <p className="text-xs text-ink-muted">{task.floor}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-idle-pale px-2.5 py-1 text-[11px] font-semibold text-ink-secondary">
                    {modeLabel[task.mode]}
                  </span>
                </div>

                <div className="mt-4 space-y-2 rounded-xl border border-line bg-app/50 px-3.5 py-3">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <RobotVisual size={26} />
                    {task.robotName}
                    {robot && <StatusBadge status={robot.status} dot={false} />}
                  </p>
                  <p className="flex items-center gap-2 text-[13px] text-ink-secondary">
                    <CalendarDays size={14} className="text-ink-muted" />
                    {task.startTime}
                  </p>
                  <p className="flex items-center gap-2 text-[13px] text-ink-secondary">
                    <Clock size={14} className="text-ink-muted" />
                    Est. {task.estimatedDuration}
                  </p>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openTaskModal(task.robotId)}
                  >
                    Reschedule
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
