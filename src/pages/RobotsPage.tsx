import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  ChevronDown,
  MapPin,
  Radio,
  Search,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { RobotVisual } from '../components/robots/RobotVisual'
import { useApp } from '../context/AppContext'
import {
  getSimulatorRobot,
  getRobotLive,
  useApi,
  usePolling,
  type ApiRobot,
} from '../services/api'
import type { LiveTelemetry } from '../types'

export function RobotsPage() {
  const { robots } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: simInfo, loading } = useApi(getSimulatorRobot, [])
  const simulatorRobotId = simInfo?.available ? simInfo.robot_id : null

  const simulatorRobot = useMemo(
    () => robots.find((r) => r.id === simulatorRobotId) ?? null,
    [robots, simulatorRobotId],
  )

  const { data: liveTelemetry } = usePolling(
    () => getRobotLive(simulatorRobotId ?? ''),
    3000,
    [simulatorRobotId],
  )

  const otherRobots = useMemo(
    () => robots.filter((r) => r.id !== simulatorRobotId),
    [robots, simulatorRobotId],
  )

  const uniqueStatuses = useMemo(() => {
    const s = new Set<string>()
    robots.forEach((r) => { if (r.status) s.add(r.status) })
    return ['all', ...Array.from(s).sort()]
  }, [robots])

  const statusLabel: Record<string, string> = {
    all: 'All',
    cleaning: 'Cleaning',
    charging: 'Charging',
    ready: 'Ready',
    attention: 'Needs Attention',
    paused: 'Paused',
    offline: 'Offline',
    completed: 'Completed',
  }

  const filteredAll = useMemo(() => {
    return robots.filter((r) => {
      const matchesQuery =
        !query.trim() ||
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.model?.toLowerCase().includes(query.toLowerCase()) ||
        r.id.toLowerCase().includes(query.toLowerCase()) ||
        (r.location ?? '').toLowerCase().includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [robots, query, statusFilter])

  const filteredSimRobot = simulatorRobot && filteredAll.includes(simulatorRobot) ? simulatorRobot : null
  const filteredOtherRobots = otherRobots.filter((r) => filteredAll.includes(r))

  const hasLiveRobot = simulatorRobotId && simulatorRobot

  return (
    <div>
      <PageHeader
        title="Robots"
        subtitle="View registered robots and live operational status."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search robots, models, locations..."
            className="h-10 w-[260px] rounded-[10px] border border-line bg-white pl-10 pr-3 text-sm text-ink shadow-card placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 appearance-none rounded-[10px] border border-line bg-white pl-3 pr-7 text-[13px] font-medium text-ink shadow-card focus:border-brand focus:outline-none"
          >
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s] ?? s}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
        </div>
        <span className="text-[12px] text-ink-muted">
          {filteredAll.length} of {robots.length} registered
        </span>
      </div>

      {robots.length === 0 && !loading && (
        <Card>
          <EmptyState
            icon={<Bot size={22} />}
            title="No robots registered"
            description="Robots will appear here when added to the system."
          />
        </Card>
      )}

      {loading && robots.length > 0 && (
        <Card className="py-8 text-center text-[13px] text-ink-secondary">
          Loading robot data…
        </Card>
      )}

      {!loading && robots.length > 0 && filteredAll.length === 0 && (
        <Card>
          <EmptyState
            icon={<Bot size={22} />}
            title="No robots match your filters"
            description="Try a different search term or status filter."
          />
        </Card>
      )}

      {!loading && filteredAll.length > 0 && (
        <>
          {hasLiveRobot && filteredSimRobot && (
            <LiveRobotCard
              robot={filteredSimRobot}
              live={liveTelemetry}
              onViewDetails={() => navigate(`/robots/${simulatorRobotId}`)}
            />
          )}

          {!hasLiveRobot && filteredAll.length > 0 && (
            <Card className="mb-4">
              <p className="text-[13px] text-ink-secondary">
                Live simulator unavailable — showing registered robots only.
              </p>
            </Card>
          )}

          {filteredOtherRobots.length > 0 && (
            <RegisteredRobotsTable
              robots={filteredOtherRobots}
              onViewDetails={(id) => navigate(`/robots/${id}`)}
            />
          )}
        </>
      )}
    </div>
  )
}

function LiveRobotCard({
  robot,
  live,
  onViewDetails,
}: {
  robot: ApiRobot
  live: LiveTelemetry | null
  onViewDetails: () => void
}) {
  return (
    <Card className="mb-4">
      <div className="mb-3 flex items-center gap-2">
        <Radio size={14} className="animate-pulse text-success" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-success">
          Live Digital Twin
        </span>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-4">
        <div className="col-span-12 lg:col-span-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-pale">
              <RobotVisual size={46} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-ink">{robot.name}</p>
              <p className="text-xs text-ink-muted">{robot.model ?? 'N/A'}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <StatusBadge status={live?.status ?? robot.status ?? 'N/A'} />
            <span className="text-[12px] text-ink-secondary">
              <MapPin size={12} className="mr-0.5 inline" />
              {robot.location ?? 'N/A'}
            </span>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
            Mission
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] text-ink-muted">Room</p>
              <p className="text-[13px] font-semibold text-ink">{live?.current_room || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-muted">Task</p>
              <p className="truncate text-[13px] font-semibold text-ink">
                {live?.current_task || '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-ink-muted">Mode</p>
              <p className="text-[13px] font-semibold text-ink">
                {live?.cleaning_mode || '—'}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-medium text-ink-secondary">Progress</span>
              <span className="text-[12px] font-bold text-ink">
                {live?.cleaning_progress !== undefined ? `${live.cleaning_progress}%` : 'N/A'}
              </span>
            </div>
            {live?.cleaning_progress !== undefined && (
              <ProgressBar value={live.cleaning_progress} />
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
            Resources
          </p>
          <div className="space-y-2.5">
            <ResourceBar
              label="Battery"
              value={live?.battery}
              highColor="bg-success"
            />
            <ResourceBar
              label="Water"
              value={live?.water_level}
              highColor="bg-water"
            />
            <ResourceBar
              label="Waste"
              value={live?.waste_level}
              highColor={live?.waste_level != null && live.waste_level >= 80 ? 'bg-danger' : 'bg-warning'}
            />
          </div>
        </div>

        <div className="col-span-12 flex items-end justify-end lg:col-span-1">
          <Button variant="secondary" size="sm" onClick={onViewDetails}>
            View Details
          </Button>
        </div>
      </div>
    </Card>
  )
}

function ResourceBar({
  label,
  value,
  highColor,
}: {
  label: string
  value: number | undefined
  highColor: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium text-ink-secondary">{label}</span>
        <span className="text-[12px] font-bold text-ink">
          {value !== undefined ? `${value}%` : 'N/A'}
        </span>
      </div>
      {value !== undefined && <ProgressBar value={value} color={highColor} />}
    </div>
  )
}

function RegisteredRobotsTable({
  robots,
  onViewDetails,
}: {
  robots: ApiRobot[]
  onViewDetails: (id: string) => void
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-ink-secondary">
        Registered Robots
      </p>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-app text-left text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
                <th className="whitespace-nowrap px-4 py-3">Robot</th>
                <th className="whitespace-nowrap px-4 py-3">Model</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-4 py-3">Location</th>
                <th className="whitespace-nowrap px-4 py-3">Live Telemetry</th>
                <th className="whitespace-nowrap px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {robots.map((robot) => (
                <tr
                  key={robot.id}
                  className="border-b border-line transition-colors hover:bg-idle-pale"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-idle-pale">
                        <RobotVisual size={28} />
                      </span>
                      <div>
                        <p className="font-semibold text-ink">{robot.name}</p>
                        <p className="text-[11px] text-ink-muted">{robot.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-secondary">
                    {robot.model ?? 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={robot.status ?? 'N/A'} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-secondary">
{robot.location ?? 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12px] text-ink-muted">
                    Not connected
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onViewDetails(robot.id)}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
