import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  BatteryMedium,
  Bell,
  Bot,
  ChartPie,
  Clock,
  Droplets,
  Play,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { FacilityMap } from '../components/map/FacilityMap'
import { RobotVisual } from '../components/robots/RobotVisual'
import { OperationStatusBanner } from '../components/situation/OperationStatusBanner'
import { AutomaticCleaningBadge } from '../components/situation/AutomaticCleaningBadge'
import { useApp } from '../context/AppContext'
import { getDashboardOverview, useApi } from '../services/api'
import type { AlertSeverity } from '../types'

const alertIcon: Record<AlertSeverity, { icon: LucideIcon; tile: string }> = {
  warning: { icon: TriangleAlert, tile: 'bg-warning-pale text-warning' },
  maintenance: { icon: TriangleAlert, tile: 'bg-warning-pale text-warning' },
  success: { icon: ChartPie, tile: 'bg-success-pale text-success' },
  critical: { icon: TriangleAlert, tile: 'bg-danger-pale text-danger' },
  info: { icon: ChartPie, tile: 'bg-brand-pale text-brand' },
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

export function OverviewPage() {
  const { robots, alerts, tasks, openTaskModal } = useApp()
  const navigate = useNavigate()
  const { data: overview, loading, error } = useApi(getDashboardOverview, [])

  const fleet = overview?.robots ?? []
  const events = overview?.recent_cleaning_events ?? []
  const notifications = overview?.active_notifications ?? []

  const activeRobot = overview?.robots?.[0]
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

  return (
    <div>
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
            See how today's cleaning is going.
          </p>
        </div>
      </div>

      <OperationStatusBanner
        needsAttention={needsAttentionCount}
        topAlert={attentionAlerts[0]}
        onReview={() => navigate('/alerts')}
      />

      <div className="mt-4 grid grid-cols-4 gap-4">
        <StatCard
          label="Robots"
          value={String(fleet.length || robots.length)}
          subtext="All connected"
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
          subtext={needsAttentionCount > 0 ? 'One action required' : 'All clear'}
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

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <FacilityMap />
        </div>

        <div className="flex flex-col gap-4">
          <ApiPanel
            loading={loading}
            error={error}
            isEmpty={!activeRobot}
            empty={
              <EmptyState
                icon={<Bot size={22} />}
                title="No active robot"
                description="Connect a robot to see its live status here."
              />
            }
          >
            <ActiveRobotCard
              name={activeRobot?.name ?? ''}
              location={activeRobot?.location ?? 'Unknown'}
              battery={0}
              water={0}
              wasteBin={0}
              progress={0}
              remaining="—"
              onView={() => navigate(`/robots/${activeRobot?.id}`)}
            />
          </ApiPanel>
          <AutomaticCleaningBadge />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <ApiPanel
            loading={loading}
            error={error}
            isEmpty={fleet.length === 0}
            empty={
              <EmptyState
                icon={<Bot size={22} />}
                title="No robots found"
                description="No robots are connected to the fleet right now."
              />
            }
          >
            <Card className="flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-ink">Robot Fleet</h2>
                <button
                  onClick={() => navigate('/robots')}
                  className="text-[13px] font-semibold text-brand transition-colors hover:text-brand-dark"
                >
                  View all robots
                </button>
              </div>
              <div className="mt-3 space-y-2.5">
                {fleet.map((robot) => (
                  <button
                    key={robot.id}
                    onClick={() => navigate(`/robots/${robot.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl border border-line bg-app/40 px-3 py-2.5 text-left transition-colors hover:border-[#CBD5E1]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-idle-pale">
                      <RobotVisual size={34} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink">{robot.name}</p>
                      <p className="text-[11px] text-ink-muted">{robot.location}</p>
                    </div>
                    <StatusBadge status={robot.status ?? 'ready'} />
                  </button>
                ))}
              </div>
            </Card>
          </ApiPanel>
        </div>

        <div className="flex flex-col gap-4">
          {needsAttentionCount > 0 && (
            <Card className="flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-ink">Needs Your Attention</h2>
                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-danger px-1.5 text-[12px] font-bold text-white">
                  {needsAttentionCount}
                </span>
              </div>
              <div className="mt-3 space-y-2.5">
                {attentionAlerts.map((alert) => {
                  const cfg = alertIcon[alert.severity]
                  const Icon = cfg.icon
                  const isMaintenance = alert.severity === 'maintenance'
                  return (
                    <div key={alert.id} className="rounded-xl border border-line bg-app/50 p-3">
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
                })}
              </div>
              <button
                onClick={() => navigate('/alerts')}
                className="mt-3 border-t border-line pt-3 text-[13px] font-semibold text-brand transition-colors hover:text-brand-dark"
              >
                View all alerts
              </button>
            </Card>
          )}

          <RecentEventsCard loading={loading} error={error} events={events} />
          <NotificationsCard loading={loading} error={error} notifications={notifications} />
        </div>
      </div>

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

function RecentEventsCard({
  loading,
  error,
  events,
}: {
  loading: boolean
  error: string | null
  events: { id?: number; type?: string; location?: string; description?: string; response?: string; created_at?: string }[]
}) {
  return (
    <ApiPanel
      loading={loading}
      error={error}
      isEmpty={events.length === 0}
      empty={
        <EmptyState
          icon={<Activity size={22} />}
          title="No recent cleaning events"
          description="CleanBot hasn't logged new events yet."
        />
      }
    >
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-ink">Recent Cleaning Events</h2>
        </div>
        <div className="mt-3 space-y-2.5">
          {events.map((e, i) => (
            <div key={e.id ?? i} className="rounded-xl border border-line bg-app/40 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13.5px] font-semibold text-ink">
                  {e.type ?? 'event'}
                </p>
                {e.created_at && (
                  <span className="shrink-0 text-[11.5px] font-medium text-ink-muted">
                    {e.created_at}
                  </span>
                )}
              </div>
              {e.location && (
                <p className="text-[11px] text-ink-muted">{e.location}</p>
              )}
              <p className="mt-1 text-[12.5px] leading-snug text-ink-secondary">
                {e.description ?? e.response ?? ''}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </ApiPanel>
  )
}

function NotificationsCard({
  loading,
  error,
  notifications,
}: {
  loading: boolean
  error: string | null
  notifications: { id?: number; message?: string; created_at?: string; read?: boolean }[]
}) {
  return (
    <ApiPanel
      loading={loading}
      error={error}
      isEmpty={notifications.length === 0}
      empty={
        <EmptyState
          icon={<Bell size={22} />}
          title="No active notifications"
          description="You're all caught up. CleanBot will notify you when needed."
        />
      }
    >
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-ink">Notifications</h2>
          {notifications.length > 0 && (
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-brand px-1.5 text-[12px] font-bold text-white">
              {notifications.length}
            </span>
          )}
        </div>
        <div className="mt-3 space-y-2.5">
          {notifications.map((n, i) => (
            <div key={n.id ?? i} className="rounded-xl border border-line bg-app/40 px-3 py-2.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-pale text-brand">
                  <Bell size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-ink">{n.message}</p>
                  {n.created_at && (
                    <p className="mt-0.5 text-[11px] text-ink-muted">{n.created_at}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </ApiPanel>
  )
}

function ActiveRobotCard({
  name,
  location,
  battery,
  water,
  wasteBin,
  progress,
  remaining,
  onView,
}: {
  name: string
  location: string
  battery: number
  water: number
  wasteBin: number
  progress: number
  remaining: string
  onView: () => void
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-ink">{name}</h2>
        <StatusBadge status="cleaning" label="Cleaning normally" />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-2xl border border-line bg-app">
          <RobotVisual size={80} />
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-secondary">
            {location}
          </p>
          <MetricRow
            icon={<BatteryMedium size={14} className="text-success" />}
            label="Battery"
            value={`${battery}%`}
            bar={<ProgressBar value={battery} color="bg-success" />}
          />
          <MetricRow
            icon={<Droplets size={14} className="text-water" />}
            label="Water"
            value={`${water}%`}
            bar={<ProgressBar value={water} color="bg-water" />}
          />
          <MetricRow
            icon={<Trash2 size={14} className="text-ink-secondary" />}
            label="Waste Bin"
            value={`${wasteBin}% full`}
            bar={
              <ProgressBar
                value={wasteBin}
                color={wasteBin >= 80 ? 'bg-danger' : 'bg-warning'}
              />
            }
          />
          <MetricRow
            icon={<Clock size={14} className="text-brand" />}
            label="Job Progress"
            value={`${progress}%`}
            bar={<ProgressBar value={progress} />}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-pale/60 px-4 py-2.5">
        <span className="flex items-center gap-2 text-[13px] font-medium text-ink-secondary">
          <Clock size={14} className="text-brand" />
          About
        </span>
        <span className="text-[15px] font-bold text-brand-dark">
          {remaining} remaining
        </span>
      </div>
      <button
        onClick={onView}
        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-brand text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
      >
        View Robot
      </button>
    </Card>
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
