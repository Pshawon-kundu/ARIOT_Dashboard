import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  BatteryMedium,
  Bot,
  Clock,
  Droplets,
  MapPin,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Zap,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { RobotVisual } from '../components/robots/RobotVisual'
import { useApp } from '../context/AppContext'
import type { RobotStatus } from '../types'

const filters: (RobotStatus | 'all')[] = [
  'all',
  'cleaning',
  'charging',
  'ready',
  'attention',
]

const filterLabel: Record<string, string> = {
  all: 'All',
  cleaning: 'Cleaning',
  charging: 'Charging',
  ready: 'Ready',
  attention: 'Needs Attention',
}

export function RobotsPage() {
  const { robots, addRobot, showToast } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [filter, setFilter] = useState<RobotStatus | 'all'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newId, setNewId] = useState('')

  const filtered = useMemo(() => {
    return robots.filter((r) => {
      const matchesQuery =
        !query.trim() ||
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.id.toLowerCase().includes(query.toLowerCase()) ||
        r.location.toLowerCase().includes(query.toLowerCase())
      const matchesFilter = filter === 'all' || r.status === filter
      return matchesQuery && matchesFilter
    })
  }, [robots, query, filter])

  const counts = useMemo(() => {
    return {
      total: robots.length,
      cleaning: robots.filter((r) => r.status === 'cleaning').length,
      charging: robots.filter((r) => r.status === 'charging').length,
      ready: robots.filter((r) => r.status === 'ready').length,
      attention: robots.filter((r) => r.status === 'attention').length,
    }
  }, [robots])

  const handleAdd = () => {
    if (!newName.trim()) return
    const id = newId.trim().toUpperCase() || `CB${String(robots.length + 1).padStart(2, '0')}`
    addRobot({
      id,
      name: newName.trim(),
      status: 'ready',
      location: 'Charging Dock',
      level: 1,
      battery: 100,
      water: 100,
      wasteBin: 0,
      progress: 0,
      currentTask: 'No active task',
      estimatedCompletion: '—',
      connectivity: 'Online',
      lastCommunication: 'Just now',
      lastMaintenance: 'Never',
      nextInspection: 'In 90 days',
      operatingHours: 0,
    })
    showToast('success', `${newName.trim()} added`, 'Robot is ready and available.')
    setAddOpen(false)
    setNewName('')
    setNewId('')
  }

  return (
    <div>
      <PageHeader title="Robots" subtitle="Monitor and manage your CleanBot fleet">
        <Button icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
          Add Robot
        </Button>
      </PageHeader>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search robots"
            className="h-10 w-[260px] rounded-[10px] border border-line bg-white pl-10 pr-3 text-sm text-ink shadow-card placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                filter === f
                  ? 'bg-ink text-white'
                  : 'bg-white text-ink-secondary ring-1 ring-line hover:bg-idle-pale'
              }`}
            >
              {filterLabel[f]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI summary */}
      <div className="mb-5 grid grid-cols-5 gap-4">
        <StatCard
          label="Total Robots"
          value={String(counts.total)}
          subtext="In fleet"
          iconClass="bg-brand-pale text-brand"
          icon={<Bot size={22} />}
        />
        <StatCard
          label="Cleaning"
          value={String(counts.cleaning)}
          subtext="Active now"
          subtextClass="text-success"
          iconClass="bg-success-pale text-success"
          icon={<Bot size={22} />}
        />
        <StatCard
          label="Charging"
          value={String(counts.charging)}
          subtext="At the dock"
          subtextClass="text-warning"
          iconClass="bg-warning-pale text-warning"
          icon={<Zap size={22} />}
        />
        <StatCard
          label="Ready"
          value={String(counts.ready)}
          subtext="Ready to work"
          iconClass="bg-idle-pale text-idle"
          icon={<Clock size={22} />}
        />
        <StatCard
          label="Needs Attention"
          value={String(counts.attention)}
          subtext="Check required"
          subtextClass="text-danger"
          iconClass="bg-danger-pale text-danger"
          icon={<TriangleAlert size={22} />}
        />
      </div>

      {/* Robot cards */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bot size={22} />}
            title="No robots match your filters"
            description="Try a different search term or status filter."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((robot) => (
            <Card key={robot.id} hoverable className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
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

              <div className="mt-4 space-y-2.5">
                <div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 font-medium text-ink-secondary">
                      <BatteryMedium size={13} className="text-success" /> Battery
                    </span>
                    <span className="font-bold text-ink">{robot.battery}%</span>
                  </div>
                  <ProgressBar
                    value={robot.battery}
                    color="bg-success"
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 font-medium text-ink-secondary">
                      <Droplets size={13} className="text-water" /> Water
                    </span>
                    <span className="font-bold text-ink">{robot.water}%</span>
                  </div>
                  <ProgressBar
                    value={robot.water}
                    color="bg-water"
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 font-medium text-ink-secondary">
                      <Trash2 size={13} className="text-ink-secondary" /> Waste Bin
                    </span>
                    <span className="font-bold text-ink">{robot.wasteBin}% Full</span>
                  </div>
                  <ProgressBar
                    value={robot.wasteBin}
                    color={robot.wasteBin >= 80 ? 'bg-danger' : 'bg-warning'}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-app px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-ink">
                    {robot.currentTask}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    Comms {robot.lastCommunication.toLowerCase()}
                  </p>
                </div>
                {robot.status === 'cleaning' && (
                  <span className="ml-2 text-[12.5px] font-bold text-brand">
                    {robot.progress}%
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                {robot.status === 'cleaning' ? (
                  <ProgressBar value={robot.progress} className="flex-1" />
                ) : robot.nextTaskAt ? (
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-secondary">
                    <Clock size={12} className="text-ink-muted" />
                    Next task {robot.nextTaskAt.toLowerCase()}
                  </span>
                ) : (
                  <span className="text-[12px] text-ink-muted">
                    No task scheduled
                  </span>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/robots/${robot.id}`)}
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add robot modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Robot"
        subtitle="Register a new CleanBot to your facility"
      >
        <div className="space-y-4 px-6 pb-6 pt-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-secondary">
              Robot name
            </span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. CleanBot 04"
              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-secondary">
              Robot ID
            </span>
            <input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder={`e.g. CB${String(robots.length + 1).padStart(2, '0')}`}
              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!newName.trim()} onClick={handleAdd}>
              Add Robot
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
