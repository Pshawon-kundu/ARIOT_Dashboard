import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BatteryMedium,
  Bot,
  ChartPie,
  ChevronRight,
  Clock,
  Droplets,
  Play,
  TriangleAlert,
  Trash2,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { FacilityMap } from '../components/map/FacilityMap'
import { RobotVisual } from '../components/robots/RobotVisual'
import { useApp } from '../context/AppContext'
import type { AlertSeverity } from '../types'

const alertIcon: Record<AlertSeverity, { icon: LucideIcon; tile: string }> = {
  warning: { icon: TriangleAlert, tile: 'bg-warning-pale text-warning' },
  maintenance: { icon: Wrench, tile: 'bg-warning-pale text-warning' },
  success: { icon: ChartPie, tile: 'bg-success-pale text-success' },
  critical: { icon: TriangleAlert, tile: 'bg-danger-pale text-danger' },
  info: { icon: ChartPie, tile: 'bg-brand-pale text-brand' },
}

export function OverviewPage() {
  const { robots, alerts, tasks, openTaskModal } = useApp()
  const navigate = useNavigate()

  const cb01 = robots.find((r) => r.id === 'CB01')!
  const cleaningNow =
    robots.filter((r) => r.status === 'cleaning' || r.status === 'paused').length +
    tasks.filter((t) => t.status === 'scheduled' && t.startTime.includes('Today')).length
  const coverage = 78

  const needsAttentionCount = robots.filter(
    (r) => r.water < 30 || r.wasteBin > 80 || r.status === 'attention',
  ).length

  const attentionAlerts = useMemo(
    () =>
      alerts.filter(
        (a) => !a.resolved && (a.severity === 'warning' || a.severity === 'maintenance'),
      ),
    [alerts],
  )

  const previewAlerts = useMemo(
    () => alerts.filter((a) => a.severity === 'success').slice(0, 3),
    [alerts],
  )

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
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Robots"
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
          label="Needs Attention"
          value={String(needsAttentionCount)}
          subtext={needsAttentionCount > 0 ? 'Action required' : 'All clear'}
          subtextClass="text-danger"
          iconClass="bg-danger-pale text-danger"
          icon={<TriangleAlert size={22} />}
        />
        <StatCard
          label="Cleaned Today"
          value={`${Math.round(coverage)}%`}
          subtext="8,450 sq.ft completed"
          iconClass="bg-brand-pale text-brand"
          icon={<ChartPie size={22} />}
        />
      </div>

      {/* Middle section: map + active robot */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <FacilityMap />
        </div>

        {/* Active robot card */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-ink">{cb01.name}</h2>
            <StatusBadge status={cb01.status} />
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-2xl border border-line bg-app">
              <RobotVisual size={80} />
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-secondary">
                Level 1 • East Wing
              </p>
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
                value={`${cb01.wasteBin}% full`}
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
              About
            </span>
            <span className="text-[15px] font-bold text-brand-dark">
              {cb01.estimatedCompletion} remaining
            </span>
          </div>
          <button
            onClick={() => navigate(`/robots/${cb01.id}`)}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-brand text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
          >
            View Robot
          </button>
        </Card>
      </div>

      {/* Bottom section: fleet + needs attention */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* Fleet summary */}
        <Card padded={false} className="col-span-2">
          <div className="flex items-center justify-between px-6 pb-2 pt-5">
            <h2 className="text-[16px] font-bold text-ink">Robot Fleet</h2>
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
                        <p className="text-[13.5px] font-semibold text-ink">{robot.name}</p>
                        <p className="text-[11px] text-ink-muted">{robot.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={robot.status} />
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-secondary">{robot.location}</td>
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
                        color={robot.status === 'charging' ? 'bg-warning' : 'bg-brand'}
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

        {/* Needs attention */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-ink">Needs Attention</h2>
            {needsAttentionCount > 0 && (
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-danger px-1.5 text-[12px] font-bold text-white">
                {needsAttentionCount}
              </span>
            )}
          </div>
          <div className="mt-3 flex-1 space-y-2.5">
            {attentionAlerts.length === 0 ? (
              <p className="rounded-xl bg-success-pale/60 px-4 py-3 text-[13px] font-medium text-[#18794E]">
                Nothing needs your attention right now.
              </p>
            ) : (
              attentionAlerts.map((alert) => {
                const cfg = alertIcon[alert.severity]
                const Icon = cfg.icon
                const isMaintenance = alert.severity === 'maintenance'
                return (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-line bg-app/50 p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.tile}`}>
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-ink">{alert.title}</p>
                        <p className="text-[11.5px] font-medium text-ink-muted">{alert.robotId}</p>
                        <p className="mt-1 text-[12px] leading-snug text-ink-secondary">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        isMaintenance
                          ? navigate(`/alerts`)
                          : navigate(`/robots/${alert.robotId}`)
                      }
                      className="mt-2.5 w-full rounded-lg bg-white py-1.5 text-[12.5px] font-semibold text-brand ring-1 ring-line transition-colors hover:bg-brand-pale"
                    >
                      {isMaintenance ? 'View Maintenance' : 'View Robot'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
          {previewAlerts.length > 0 && (
            <div className="mt-3 border-t border-line pt-3">
              <button
                onClick={() => navigate('/alerts')}
                className="flex w-full items-center justify-center gap-1 text-[13px] font-semibold text-brand transition-colors hover:text-brand-dark"
              >
                View all alerts
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Global primary action */}
      <button
        onClick={() => openTaskModal()}
        className="mt-4 flex h-[46px] w-full items-center justify-center gap-2 rounded-[10px] bg-brand text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
      >
        <Play size={17} className="fill-current" />
        Start Cleaning
      </button>
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
