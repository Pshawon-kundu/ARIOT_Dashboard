import { useState, useMemo, Fragment } from 'react'
import { ChevronDown, RefreshCw } from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { EmptyState } from '../components/ui/EmptyState'
import {
  getCleaningJobs,
  getCleaningJobDetail,
  useApi,
  type CleaningJob,
  type CleaningJobDetail,
} from '../services/api'

type StatusFilter = 'all' | 'completed' | 'other'
type DateFilter = 'all' | 'today' | '7d' | '30d'

function isSameDay(iso: string | null): boolean {
  if (!iso) return false
  const d = new Date(iso)
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

function isWithinDays(iso: string | null, days: number): boolean {
  if (!iso) return false
  const d = new Date(iso)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return d >= cutoff
}

function calcDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return 'N/A'
  const start = new Date(startedAt).getTime()
  const end = new Date(completedAt).getTime()
  if (isNaN(start) || isNaN(end) || end < start) return 'N/A'
  const mins = Math.round((end - start) / 60000)
  if (mins < 1) return '<1 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDate(iso: string | null): string {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-[8px] border border-line bg-white pl-3 pr-7 text-[13px] font-medium text-ink shadow-card focus:border-brand focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted"
      />
    </div>
  )
}

export function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [robotFilter, setRobotFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const [detail, setDetail] = useState<CleaningJobDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const { data: allJobs, loading, error } = useApi(
    () => getCleaningJobs(),
    [refreshTick],
  )

  const robots = useMemo(() => {
    if (!allJobs) return []
    const names = new Set<string>()
    allJobs.forEach((j) => { if (j.robot_name) names.add(j.robot_name) })
    return Array.from(names).sort()
  }, [allJobs])

  const filtered = useMemo(() => {
    if (!allJobs) return []
    return allJobs.filter((j) => {
      if (statusFilter === 'completed' && j.status?.toLowerCase() !== 'completed') return false
      if (statusFilter === 'other' && j.status?.toLowerCase() === 'completed') return false
      if (robotFilter !== 'all' && j.robot_name !== robotFilter) return false
      if (dateFilter === 'today' && !isSameDay(j.started_at)) return false
      if (dateFilter === '7d' && !isWithinDays(j.started_at, 7)) return false
      if (dateFilter === '30d' && !isWithinDays(j.started_at, 30)) return false
      return true
    })
  }, [allJobs, statusFilter, robotFilter, dateFilter])

  const completedJobs = useMemo(
    () => (allJobs ?? []).filter((j) => j.status?.toLowerCase() === 'completed'),
    [allJobs],
  )

  const todayJobs = useMemo(
    () => (allJobs ?? []).filter((j) => isSameDay(j.started_at)),
    [allJobs],
  )

  const avgCoverage = useMemo(() => {
    const vals = completedJobs
      .map((j) => j.coverage)
      .filter((v): v is number => v != null && isFinite(v))
    if (vals.length === 0) return 'N/A'
    const sum = vals.reduce((a, b) => a + b, 0)
    return `${Math.round(sum / vals.length)}%`
  }, [completedJobs])

  const statusOptions = useMemo(() => {
    const hasOther = (allJobs ?? []).some((j) => j.status?.toLowerCase() !== 'completed')
    const opts = [{ value: 'all', label: 'All Status' }]
    opts.push({ value: 'completed', label: 'Completed' })
    if (hasOther) opts.push({ value: 'other', label: 'In Progress' })
    return opts
  }, [allJobs])

  const robotOptions = useMemo(
    () => [
      { value: 'all', label: 'All Robots' },
      ...robots.map((n) => ({ value: n, label: n })),
    ],
    [robots],
  )

  const dateOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
  ]

  const handleRefresh = () => setRefreshTick((t) => t + 1)

  const handleRowClick = async (job: CleaningJob) => {
    if (expandedJobId === job.id) {
      setExpandedJobId(null)
      setDetail(null)
      return
    }
    setExpandedJobId(job.id)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    try {
      const d = await getCleaningJobDetail(job.id)
      setDetail(d)
    } catch {
      setDetailError('Job details unavailable.')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleClearFilters = () => {
    setStatusFilter('all')
    setRobotFilter('all')
    setDateFilter('all')
  }

  const hasFilters = statusFilter !== 'all' || robotFilter !== 'all' || dateFilter !== 'all'

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Historical cleaning performance and job records."
      >
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="flex items-center gap-3 py-3 px-4">
          <div>
            <p className="text-[11px] font-medium text-ink-secondary">Total Jobs</p>
            <p className="text-[22px] font-bold text-ink">{allJobs?.length ?? 0}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 py-3 px-4">
          <div>
            <p className="text-[11px] font-medium text-ink-secondary">Completed</p>
            <p className="text-[22px] font-bold text-ink">{completedJobs.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 py-3 px-4">
          <div>
            <p className="text-[11px] font-medium text-ink-secondary">Jobs Today</p>
            <p className="text-[22px] font-bold text-ink">{todayJobs.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 py-3 px-4">
          <div>
            <p className="text-[11px] font-medium text-ink-secondary">Avg Coverage</p>
            <p className="text-[22px] font-bold text-ink">{avgCoverage}</p>
          </div>
        </Card>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Dropdown
          value={statusFilter}
          options={statusOptions}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />
        <Dropdown
          value={robotFilter}
          options={robotOptions}
          onChange={setRobotFilter}
        />
        <Dropdown
          value={dateFilter}
          options={dateOptions}
          onChange={(v) => setDateFilter(v as DateFilter)}
        />
        {hasFilters && (
          <button
            onClick={handleClearFilters}
            className="ml-1 text-[12px] font-medium text-brand hover:underline"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[12px] text-ink-muted">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading && (
        <Card className="py-10 text-center text-[13px] text-ink-secondary">
          Loading reports…
        </Card>
      )}

      {error && !loading && (
        <Card className="py-10 text-center text-[13px] text-ink-secondary">
          Reports are temporarily unavailable.
        </Card>
      )}

      {!loading && !error && filtered.length === 0 && !hasFilters && (
        <Card className="py-10">
          <EmptyState
            icon={null}
            title="No cleaning history yet"
            description="Completed cleaning missions will appear here."
          />
        </Card>
      )}

      {!loading && !error && filtered.length === 0 && hasFilters && (
        <Card className="py-10">
          <EmptyState
            icon={null}
            title="No jobs match the current filters"
            description="Try adjusting or clearing the filters."
          />
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-app text-left text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
                  <th className="whitespace-nowrap px-4 py-3">Robot</th>
                  <th className="whitespace-nowrap px-4 py-3">Location</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3">Progress</th>
                  <th className="whitespace-nowrap px-4 py-3">Coverage</th>
                  <th className="whitespace-nowrap px-4 py-3">Started</th>
                  <th className="whitespace-nowrap px-4 py-3">Completed</th>
                  <th className="whitespace-nowrap px-4 py-3">Duration</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => (
                  <Fragment key={job.id}>
                    <tr
                      onClick={() => handleRowClick(job)}
                      className={`cursor-pointer border-b border-line transition-colors hover:bg-idle-pale ${
                        expandedJobId === job.id ? 'bg-brand-pale' : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">
                        {job.robot_name || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-secondary">
                        {job.zone || job.floor || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge
                          status={
                            job.status?.toLowerCase() === 'completed'
                              ? 'completed'
                              : 'in_progress'
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-secondary">
                        {job.progress != null ? `${job.progress}%` : 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-secondary">
                        {job.coverage != null ? `${job.coverage}%` : 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-secondary">
                        {formatDate(job.started_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-secondary">
                        {job.completed_at ? formatDate(job.completed_at) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-secondary">
                        {calcDuration(job.started_at, job.completed_at)}
                      </td>
                    </tr>
                    {expandedJobId === job.id && (
                      <tr key={`${job.id}-detail`}>
                        <td colSpan={8} className="bg-brand-pale px-6 py-4">
                          {detailLoading && (
                            <p className="text-[12.5px] text-ink-secondary">
                              Loading job details…
                            </p>
                          )}
                          {detailError && !detailLoading && (
                            <p className="text-[12.5px] text-danger">{detailError}</p>
                          )}
                          {detail && !detailLoading && (
                            <div className="flex flex-wrap gap-6">
                              <DetailField
                                label="Floor"
                                value={detail.floor || 'N/A'}
                              />
                              <DetailField
                                label="Zone"
                                value={detail.zone || 'N/A'}
                              />
                              <DetailField
                                label="Progress"
                                value={
                                  detail.progress != null
                                    ? `${detail.progress}%`
                                    : 'N/A'
                                }
                              />
                              <DetailField
                                label="Coverage"
                                value={
                                  detail.coverage != null
                                    ? `${detail.coverage}%`
                                    : 'N/A'
                                }
                              />
                              <DetailField
                                label="Started"
                                value={formatDateTime(detail.started_at)}
                              />
                              <DetailField
                                label="Completed"
                                value={
                                  detail.completed_at
                                    ? formatDateTime(detail.completed_at)
                                    : '—'
                                }
                              />
                              <DetailField
                                label="Duration"
                                value={calcDuration(
                                  detail.started_at,
                                  detail.completed_at,
                                )}
                              />
                              {detail.path && (
                                <DetailField
                                  label="Path"
                                  value={detail.path}
                                />
                              )}
                              <div>
                                <p className="text-[11px] font-medium text-ink-secondary">
                                  Events
                                </p>
                                <p className="mt-1 text-[13px] text-ink">
                                  {detail.detected_events &&
                                  detail.detected_events.length > 0
                                    ? detail.detected_events.join(', ')
                                    : 'No recorded events'}
                                </p>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-ink-secondary">{label}</p>
      <p className="mt-1 text-[13px] text-ink">{value}</p>
    </div>
  )
}
