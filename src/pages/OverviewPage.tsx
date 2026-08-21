import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BatteryMedium,
  Bot,
  CalendarDays,
  ChartPie,
  ChevronRight,
  Clock,
  Droplets,
  Play,
  Trash2,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { CircularProgress } from '../components/dashboard/CircularProgress'
import { FacilityMap } from '../components/map/FacilityMap'
import { RobotVisual } from '../components/robots/RobotVisual'
import { useApp } from '../context/AppContext'

import type { AlertSeverity } from '../types'
import { CheckCircle2, TriangleAlert, Wrench } from 'lucide-react'

const alertIcon: Record<AlertSeverity, { icon: LucideIcon; tile: string }> = {
  warning: { icon: TriangleAlert, tile: 'bg-warning-pale text-warning' },
  maintenance: { icon: Wrench, tile: 'bg-warning-pale text-warning' },
  success: { icon: CheckCircle2, tile: 'bg-success-pale text-success' },
  critical: { icon: TriangleAlert, tile: 'bg-danger-pale text-danger' },
  info: { icon: CheckCircle2, tile: 'bg-brand-pale text-brand' },
}

export function OverviewPage() {
  const { robots, alerts, tasks, openTaskModal } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const cb01 = robots.find((r) => r.id === 'CB01')!
  const cleaningNow =
    robots.filter((r) => r.status === 'cleaning' || r.status === 'paused').length +
    tasks.filter((t) => t.status === 'scheduled' && t.startTime.includes('Today'))
      .length
  const chargingCount = robots.filter((r) => r.status === 'charging').length
  const coverage = 78

  const previewAlerts = useMemo(() => alerts.slice(0, 3), [alerts])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim()) navigate(`/robots?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
              Overview
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-pale px-3 py-1 text-[12px] font-semibold text-[#18794E]">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Today
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-secondary">
            See what your cleaning robots are doing right now.
          </p>
        </div>
        <form onSubmit={handleSearch} className="relative">
          <Bot
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a robot..."
            className="h-10 w-[240px] rounded-[10px] border border-line bg-white pl-10 pr-3 text-sm text-ink shadow-card placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </form>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Robots"
          value={String(robots.length)}
          subtext="All systems ready"
          subtextClass="text-success"
          iconClass="bg-brand-pale text-brand"
          icon={<Bot size={22} />}
        />
        <StatCard
          label="Cleaning Now"
          value={String(cleaningNow)}
          subtext="Currently working"
          subtextClass="text-success"
          iconClass="bg-success-pale text-success"
          icon={<Play size={21} className="fill-current" />}
        />
        <StatCard
          label="Charging"
          value={String(chargingCount)}
          subtext="At charging dock"
          subtextClass="text-warning"
          iconClass="bg-warning-pale text-warning"
          icon={<Zap size={22} className="fill-current" />}
        />
        <StatCard
          label="Cleaned Today"
          value={`${Math.round(coverage)}%`}
          subtext="8,450 sq.ft completed"
          iconClass="bg-brand-pale text-brand"
          icon={<ChartPie size={22} />}
        />
      </div>

      {/* Middle section */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* Live Facility Map */}
        <Card className="col-span-2">
          <FacilityMap />
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* CleanBot 01 status */}
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-ink">CleanBot 01</h2>
              <StatusBadge status={cb01.status} />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-2xl border border-line bg-app">
                <RobotVisual size={80} />
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                <MetricRow
                  icon={<BatteryMedium size={14} className="text-success" />}
                  label="Battery"
                  value={`${cb01.battery}%`}
                  bar={<ProgressBar value={cb01.battery} color="bg-success" />}
                />
                <MetricRow
                  icon={<Droplets size={14} className="text-water" />}
                  label="Water"
                  value={`${cb01.water}%`}
                  bar={<ProgressBar value={cb01.water} color="bg-water" />}
                />
                <MetricRow
                  icon={<Trash2 size={14} className="text-ink-secondary" />}
                  label="Waste Bin"
                  value={`${cb01.wasteBin}% Full`}
                  bar={
                    <ProgressBar
                      value={cb01.wasteBin}
                      color={cb01.wasteBin >= 80 ? 'bg-danger' : 'bg-warning'}
                    />
                  }
                />
                <MetricRow
                  icon={<Clock size={14} className="text-brand" />}
                  label="Job Progress"
                  value={`${cb01.progress}%`}
                  bar={<ProgressBar value={cb01.progress} />}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-pale/60 px-4 py-2.5">
              <span className="flex items-center gap-2 text-[13px] font-medium text-ink-secondary">
                <Clock size={14} className="text-brand" />
                Finishes in about
              </span>
              <span className="text-[15px] font-bold text-brand-dark">
                {cb01.estimatedCompletion}
              </span>
            </div>
          </Card>

          {/* Today's Cleaning */}
          <Card className="flex-1">
            <h2 className="text-[16px] font-bold text-ink">Today's Cleaning</h2>
            <div className="mt-4 flex items-center gap-5">
              <CircularProgress value={coverage} size={104} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Cleaned Area
                </p>
                <p className="mt-0.5 text-[24px] font-bold leading-tight text-brand-dark">
                  8,450 sq.ft
                </p>
                <p className="text-xs text-ink-muted">of 10,800 sq.ft planned</p>
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Next Cleaning
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[14.5px] font-bold text-ink">Level 2 Lobby</p>
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary">
                  <CalendarDays size={13} className="text-ink-muted" />
                  3:00 PM
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom section */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* Fleet summary */}
        <Card padded={false} className="col-span-2">
          <div className="flex items-center justify-between px-6 pb-2 pt-5">
            <h2 className="text-[16px] font-bold text-ink">Robot Fleet Summary</h2>
            <button
              onClick={() => navigate('/robots')}
              className="flex items-center gap-1 text-[13px] font-semibold text-brand transition-colors hover:text-brand-dark"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          <table className="mt-2 w-full text-left">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                <th className="px-6 py-2.5">Robot</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5">Battery</th>
                <th className="px-4 py-2.5">Water</th>
                <th className="px-6 py-2.5">Progress</th>
              </tr>
            </thead>
            <tbody>
              {robots.map((robot) => (
                <tr
                  key={robot.id}
                  onClick={() => navigate(`/robots/${robot.id}`)}
                  className="cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-app/70"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-idle-pale">
                        <RobotVisual size={34} />
                      </span>
                      <div>
                        <p className="text-[13.5px] font-semibold text-ink">
                          {robot.name}
                        </p>
                        <p className="text-[11px] text-ink-muted">{robot.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={robot.status} />
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-secondary">
                    {robot.location}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                      <BatteryMedium size={14} className="text-ink-muted" />
                      {robot.battery}%
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                      <Droplets size={14} className="text-ink-muted" />
                      {robot.water}%
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex w-28 items-center gap-2">
                      <ProgressBar
                        value={robot.progress}
                        color={
                          robot.status === 'charging' ? 'bg-warning' : 'bg-brand'
                        }
                      />
                      <span className="w-9 text-[12.5px] font-semibold text-ink-secondary">
                        {robot.progress}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Alerts + CTA */}
        <div className="flex flex-col gap-4">
          <Card padded={false} className="flex-1">
            <div className="flex items-center justify-between px-5 pb-1 pt-5">
              <h2 className="text-[16px] font-bold text-ink">Alerts</h2>
              <button
                onClick={() => navigate('/alerts')}
                className="text-[13px] font-semibold text-brand transition-colors hover:text-brand-dark"
              >
                View All
              </button>
            </div>
            <div className="mt-1 divide-y divide-line/80">
              {previewAlerts.map((alert) => {
                const cfg = alertIcon[alert.severity]
                const Icon = cfg.icon
                return (
                  <button
                    key={alert.id}
                    onClick={() => navigate('/alerts')}
                    className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-app/70"
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.tile}`}
                    >
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">
                        {alert.title}
                        <span className="font-medium text-ink-muted">
                          {' '}
                          - {alert.robotId}
                        </span>
                      </span>
                      <span className="text-xs text-ink-muted">{alert.time}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          <button
            onClick={() => openTaskModal()}
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[10px] bg-brand text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
          >
            <Play size={17} className="fill-current" />
            Start Cleaning
          </button>
        </div>
      </div>
    </div>
  )
}

function MetricRow({
  icon,
  label,
  value,
  bar,
}: {
  icon: ReactNode
  label: string
  value: string
  bar: ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-secondary">
          {icon}
          {label}
        </span>
        <span className="text-[12.5px] font-bold text-ink">{value}</span>
      </div>
      <div className="mt-1">{bar}</div>
    </div>
  )
}
