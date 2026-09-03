import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Activity,
  BatteryMedium,
  Bell,
  Bot,
  ChartPie,
  Clock,
  Droplets,
  MapPin,
  Play,
  Radio,
  Trash2,
  TriangleAlert,
  Wifi,
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
import { getDashboardOverview, getDashboardMetrics, getRobotLive, getRobotSituation, getSimulatorRobot, useApi, usePolling, type ApiCleaningEvent, type ApiNotification } from '../services/api'
import type { MapDetection } from '../types'

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
  const { openStartCleaningModal } = useApp()
  const navigate = useNavigate()
  const { data: overview, loading, error } = useApi(getDashboardOverview, [])
  const { data: metrics } = usePolling(getDashboardMetrics, 3000, [])
  const { data: simInfo } = useApi(getSimulatorRobot, [])

  const simulatorRobotId = simInfo?.available ? String(simInfo.robot_id) : null
  const fleet = overview?.robots ?? []
  const activeRobot = simulatorRobotId ? fleet.find((r) => r.id === simulatorRobotId) ?? null : null

  const { data: liveTelemetry } = usePolling(
    () => getRobotLive(simulatorRobotId ?? ''),
    1000,
    [simulatorRobotId],
  )

  const { data: situation } = useApi(
    () => getRobotSituation(simulatorRobotId ?? ''),
    [simulatorRobotId],
  )

  const detections: MapDetection[] = situation?.detections.map((d) => ({
    id: d.id ?? String(Math.random()),
    floor: 'Level 1' as const,
    type: (d.type as MapDetection['type']) ?? 'dirt',
    x: 0,
    y: 0,
    location: d.location,
    time: d.created_at,
    response: d.response,
  })) ?? []

  const events = overview?.recent_cleaning_events ?? []
  const notifications = overview?.active_notifications ?? []

  const needsAttentionCount = metrics?.attention_required ?? 0

  const liveBattery = liveTelemetry?.battery ?? null
  const liveWater = liveTelemetry?.water_level ?? null
  const liveWaste = liveTelemetry?.waste_level ?? null
  const liveProgress = liveTelemetry?.cleaning_progress ?? null
  const liveLocation = liveTelemetry?.current_room || activeRobot?.location || 'N/A'

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
            {liveTelemetry && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-pale px-3 py-1 text-[12px] font-semibold text-brand-dark">
                <Radio size={12} className="animate-pulse" />
                Live Telemetry
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-secondary">
            See how today's cleaning is going.
          </p>
        </div>
      </div>

      <OperationStatusBanner
        needsAttention={needsAttentionCount}
        activeCleaning={metrics?.active_cleaning ?? 0}
        onReview={() => navigate('/alerts')}
      />

      <div className="mt-4 grid grid-cols-4 gap-4">
        <StatCard
          label="Robots"
          value={String(metrics?.total_robots ?? 'N/A')}
          subtext="All connected"
          subtextClass="text-success"
          iconClass="bg-brand-pale text-brand"
          icon={<Bot size={22} />}
        />
        <StatCard
          label="Cleaning Now"
          value={String(metrics?.active_cleaning ?? 'N/A')}
          subtext="Currently working"
          subtextClass="text-success"
          iconClass="bg-success-pale text-success"
          icon={<Play size={21} className="fill-current" />}
        />
        <StatCard
          label="Needs Attention"
          value={String(metrics?.attention_required ?? 'N/A')}
          subtext={needsAttentionCount > 0 ? 'One action required' : 'All clear'}
          subtextClass="text-danger"
          iconClass="bg-danger-pale text-danger"
          icon={<TriangleAlert size={22} />}
        />
        <StatCard
          label="Cleaning Progress"
          value={metrics?.cleaning_progress_today != null ? `${Math.round(metrics.cleaning_progress_today)}%` : 'N/A'}
          subtext={metrics?.area_cleaned_today ? `Est. ${metrics.area_cleaned_today} sq.ft cleaned today` : 'No cleaning data'}
          iconClass="bg-brand-pale text-brand"
          icon={<ChartPie size={22} />}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <FacilityMap liveTelemetry={liveTelemetry} detections={detections} robotName={activeRobot?.name} />
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-ink">{activeRobot?.name ?? 'Primary Robot'}</h2>
              <StatusBadge status={liveTelemetry?.status ?? activeRobot?.status ?? 'N/A'} />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-2xl border border-line bg-app">
                <RobotVisual size={80} />
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-secondary">
                  <MapPin size={12} className="text-ink-muted" />
                  {liveLocation}
                </p>
                <MetricRow
                  icon={<BatteryMedium size={14} className="text-success" />}
                  label="Battery"
                  value={liveBattery !== null ? `${liveBattery}%` : 'N/A'}
                  bar={liveBattery !== null ? <ProgressBar value={liveBattery} color="bg-success" /> : undefined}
                />
                <MetricRow
                  icon={<Droplets size={14} className="text-water" />}
                  label="Water"
                  value={liveWater !== null ? `${liveWater}%` : 'N/A'}
                  bar={liveWater !== null ? <ProgressBar value={liveWater} color="bg-water" /> : undefined}
                />
                <MetricRow
                  icon={<Trash2 size={14} className="text-ink-secondary" />}
                  label="Waste Bin"
                  value={liveWaste !== null ? `${liveWaste}% full` : 'N/A'}
                  bar={
                    liveWaste !== null ? (
                      <ProgressBar
                        value={liveWaste}
                        color={liveWaste >= 80 ? 'bg-danger' : 'bg-warning'}
                      />
                    ) : undefined
                  }
                />
                <MetricRow
                  icon={<Clock size={14} className="text-brand" />}
                  label="Job Progress"
                  value={liveProgress !== null ? `${liveProgress}%` : 'N/A'}
                  bar={liveProgress !== null ? <ProgressBar value={liveProgress} /> : undefined}
                />
              </div>
            </div>
            {liveTelemetry?.current_task && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-pale/60 px-4 py-2.5">
                <span className="flex items-center gap-2 text-[13px] font-medium text-ink-secondary">
                  <Activity size={14} className="text-brand" />
                  Current Task
                </span>
                <span className="text-[13px] font-bold text-brand-dark truncate max-w-[180px]">
                  {liveTelemetry.current_task}
                </span>
              </div>
            )}
            {liveTelemetry && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-app/40 px-3 py-2">
                <Wifi size={13} className="text-success" />
                <span className="text-[12px] font-semibold text-success">
                  {liveTelemetry.tick_hz} Hz telemetry
                </span>
                <span className="text-[12px] text-ink-muted ml-auto">
                  {liveTelemetry.cleaning_mode}
                </span>
              </div>
            )}
            <button
              onClick={() => navigate(`/robots/${activeRobot?.id ?? simulatorRobotId}`)}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-brand text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
            >
              View Robot
            </button>
          </Card>
          <AutomaticCleaningBadge isActive={liveTelemetry?.status === 'cleaning'} />
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
                    <StatusBadge status={robot.status ?? 'N/A'} />
                  </button>
                ))}
              </div>
            </Card>
          </ApiPanel>
        </div>

        <div className="flex flex-col gap-4">
          <RecentEventsCard loading={loading} error={error} events={events} />
          <NotificationsCard loading={loading} error={error} notifications={notifications} />
        </div>
      </div>

      <button
        onClick={() => openStartCleaningModal(activeRobot?.id ?? simulatorRobotId ?? undefined)}
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
  events: ApiCleaningEvent[]
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
  notifications: ApiNotification[]
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

function MetricRow({
  icon,
  label,
  value,
  bar,
}: {
  icon: ReactNode
  label: string
  value: string
  bar?: ReactNode
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
      {bar && <div className="mt-1">{bar}</div>}
    </div>
  )
}
