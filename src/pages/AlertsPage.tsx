import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  ShieldCheck,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { AlertItem } from '../components/alerts/AlertItem'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../context/AppContext'
import type { AlertItem as AlertItemType } from '../types'

type Tab = 'all' | 'attention' | 'maintenance' | 'resolved'

const tabs: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'attention', label: 'Needs Attention' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'resolved', label: 'Resolved' },
]

export function AlertsPage() {
  const {
    alerts,
    maintenance,
    markAlertResolved,
    markMaintenanceInspected,
    showToast,
  } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')

  const counts = useMemo(() => {
    return {
      attention: alerts.filter(
        (a) =>
          !a.resolved &&
          (a.severity === 'warning' || a.severity === 'critical'),
      ).length,
      maintenance: alerts.filter(
        (a) => a.severity === 'maintenance' && !a.resolved,
      ).length,
      resolved: alerts.filter((a) => a.resolved).length,
    }
  }, [alerts])

  const filtered = useMemo(() => {
    switch (tab) {
      case 'attention':
        return alerts.filter(
          (a) =>
            !a.resolved &&
            (a.severity === 'warning' || a.severity === 'critical'),
        )
      case 'maintenance':
        return alerts.filter((a) => a.severity === 'maintenance')
      case 'resolved':
        return alerts.filter((a) => a.resolved)
      default:
        return alerts
    }
  }, [alerts, tab])

  const handleAction = (alert: AlertItemType) => {
    if (alert.action === 'View Robot' || alert.action === 'View Location') {
      navigate(`/robots/${alert.robotId}`)
    } else if (alert.action === 'View Report') {
      navigate('/reports')
    } else {
      document
        .getElementById('maintenance-panel')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleResolve = (alert: AlertItemType) => {
    markAlertResolved(alert.id)
    showToast('success', 'Alert resolved', `"${alert.title}" marked as resolved.`)
  }

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="See problems, maintenance reminders, and completed actions"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Needs Attention"
          value={String(counts.attention)}
          subtext="Action recommended"
          subtextClass="text-warning"
          iconClass="bg-warning-pale text-warning"
          icon={<TriangleAlert size={22} />}
        />
        <StatCard
          label="Maintenance"
          value={String(counts.maintenance)}
          subtext="Service due soon"
          subtextClass="text-warning"
          iconClass="bg-warning-pale text-warning"
          icon={<Wrench size={22} />}
        />
        <StatCard
          label="Resolved Today"
          value={String(counts.resolved)}
          subtext="All handled"
          subtextClass="text-success"
          iconClass="bg-success-pale text-success"
          icon={<CheckCircle2 size={22} />}
        />
      </div>

      {/* Filter tabs */}
      <div className="mt-5 flex gap-2">
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
          </button>
        ))}
      </div>

      {/* Alert list */}
      <Card padded={false} className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Bell size={22} />}
            title="No alerts in this view"
            description="When alerts arrive they will show up here."
          />
        ) : (
          <div className="divide-y divide-line/80">
            {filtered.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onAction={handleAction}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Maintenance panel */}
      <div id="maintenance-panel" className="mt-6 scroll-mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-ink">Maintenance Panel</h2>
          <span className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
            <ShieldCheck size={15} className="text-success" />
            Health checks for your fleet
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {maintenance.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-pale text-warning">
                    <Wrench size={18} />
                  </span>
                  <div>
                    <p className="text-[14.5px] font-bold text-ink">
                      {item.robotName}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {item.part} · {item.robotId}
                    </p>
                  </div>
                </div>
                <StatusBadge
                  status={item.status.toLowerCase()}
                  tone={item.status === 'Inspected' ? 'green' : 'orange'}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-line bg-app/50 px-3.5 py-3">
                <div>
                  <p className="text-[11px] font-medium text-ink-muted">
                    Operating Hours
                  </p>
                  <p className="mt-0.5 text-[14px] font-bold text-ink">
                    {item.operatingHours}h
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-ink-muted">
                    Last Inspection
                  </p>
                  <p className="mt-0.5 text-[14px] font-bold text-ink">
                    {item.lastInspection}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-ink-muted">
                    Status
                  </p>
                  <p className="mt-0.5 text-[14px] font-bold text-warning">
                    {item.status}
                  </p>
                </div>
              </div>

              <p className="mt-3.5 flex items-start gap-2 text-[13px] leading-relaxed text-ink-secondary">
                <TriangleAlert
                  size={14}
                  className="mt-0.5 shrink-0 text-warning"
                />
                {item.suggestedAction}
              </p>

              <div className="mt-4 flex justify-end">
                {item.status === 'Inspected' ? (
                  <span className="flex items-center gap-1.5 rounded-lg bg-success-pale px-3.5 py-2 text-[13px] font-semibold text-[#18794E]">
                    <CheckCircle2 size={15} /> Inspected
                  </span>
                ) : (
                  <Button
                    variant="success"
                    size="sm"
                    icon={<ShieldCheck size={15} />}
                    onClick={() => {
                      markMaintenanceInspected(item.id)
                      showToast(
                        'success',
                        `${item.robotName} ${item.part} inspected`,
                        'Maintenance item marked as complete.',
                      )
                    }}
                  >
                    Mark as Inspected
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
