import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
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
import { reports } from '../data/mockData'
import type { CleaningMode } from '../types'

const modeLabel: Record<CleaningMode, string> = {
  standard: 'Standard',
  deep: 'Deep Clean',
  spot: 'Spot Clean',
}

type Tab = 'active' | 'scheduled' | 'completed'

const tabs: { id: Tab; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'completed', label: 'Completed' },
]

export function CleaningPage() {
  const { robots, tasks, openTaskModal } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('active')

  const activeRobots = robots.filter((r) => r.status === 'cleaning')
  const scheduled = tasks.filter((t) => t.status === 'scheduled')
  const completed = reports

  return (
    <div>
      <PageHeader
        title="Cleaning"
        subtitle="Start, schedule, and follow cleaning jobs"
      >
        <Button icon={<Plus size={16} />} onClick={() => openTaskModal()}>
          Start Cleaning
        </Button>
      </PageHeader>

      {/* Tabs */}
      <div className="mb-5 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              tab === t.id
                ? 'bg-ink text-white'
                : 'bg-white text-ink-secondary ring-1 ring-line hover:bg-idle-pale'
            }`}
          >
            {t.label}
            {t.id === 'scheduled' && scheduled.length > 0 && ` (${scheduled.length})`}
            {t.id === 'completed' && completed.length > 0 && ` (${completed.length})`}
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <>
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
                            <p className="text-[15px] font-bold text-ink">{robot.name}</p>
                            <p className="text-xs text-ink-muted">{robot.id}</p>
                          </div>
                        </div>
                        <StatusBadge status={robot.status} />
                      </div>
                      <p className="mt-3.5 flex items-center gap-1.5 text-[13px] text-ink-secondary">
                        <MapPin size={14} className="shrink-0 text-ink-muted" />
                        {robot.location}
                      </p>
                      <p className="mt-3 text-[13px] font-semibold text-ink">{robot.currentTask}</p>

                      <div className="mt-5 space-y-3">
                        <div>
                          <div className="mb-1.5 flex justify-between text-[12.5px]">
                            <span className="font-medium text-ink-secondary">Complete</span>
                            <span className="font-bold text-ink">{robot.progress}%</span>
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
                        View Live Cleaning
                      </Button>
                    </div>
                    <div className="rounded-xl border border-line bg-app/50 p-2">
                      <FacilityMap title="Live Map" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'scheduled' && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-ink">Scheduled Cleaning</h2>
            <span className="text-[13px] text-ink-muted">{scheduled.length} upcoming</span>
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
                          <p className="text-[14px] font-bold text-ink">{task.zone}</p>
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
                        Edit
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'completed' && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-ink">Completed Cleaning</h2>
            <span className="text-[13px] text-ink-muted">{completed.length} this week</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {completed.map((report) => (
              <Card key={report.id} hoverable>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-pale text-success">
                      <CheckCircle2 size={18} />
                    </span>
                    <div>
                      <p className="text-[14px] font-bold text-ink">{report.title}</p>
                      <p className="text-xs text-ink-muted">{report.date}</p>
                    </div>
                  </div>
                  <StatusBadge status="completed" />
                </div>

                <div className="mt-4 space-y-2 rounded-xl border border-line bg-app/50 px-3.5 py-3">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <RobotVisual size={26} />
                    {report.robotName}
                  </p>
                  <p className="flex items-center gap-2 text-[13px] text-ink-secondary">
                    <Sparkles size={14} className="text-ink-muted" />
                    {report.coverage}% coverage
                  </p>
                  <p className="flex items-center gap-2 text-[13px] text-ink-secondary">
                    <MapPin size={14} className="text-ink-muted" />
                    {report.area}
                  </p>
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
        </>
      )}
    </div>
  )
}
