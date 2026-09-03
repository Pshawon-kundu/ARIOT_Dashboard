import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCircle2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../context/AppContext'
import { getNotifications, markNotificationRead, usePolling } from '../services/api'
import type { ApiNotification } from '../services/api'

type FilterTab = 'all' | 'unread' | 'read'

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

function NotificationRow({
  notification,
  robotName,
  onMarkRead,
}: {
  notification: ApiNotification
  robotName: string | null
  onMarkRead: (id: string) => void
}) {
  const navigate = useNavigate()
  const isUnread = !notification.read

  return (
    <div
      className={`flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-app/60 ${
        isUnread ? 'bg-white' : 'bg-app/30'
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUnread ? 'bg-brand text-white' : 'bg-idle-pale text-ink-muted'
        }`}
      >
        {isUnread ? <Bell size={15} /> : <CheckCircle2 size={15} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className={`text-[14px] font-semibold ${isUnread ? 'text-ink' : 'text-ink-secondary'}`}>
            {notification.message || 'No message'}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="font-medium">{robotName ?? (notification.robot_id ? notification.robot_id.slice(0, 8) + '…' : 'Unknown')}</span>
          {notification.created_at && (
            <span>{formatTime(notification.created_at)}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {notification.robot_id && (
          <button
            onClick={() => navigate(`/robots/${notification.robot_id}`)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-pale"
          >
            View Robot
          </button>
        )}
        {isUnread && (
          <button
            onClick={() => onMarkRead(notification.id!)}
            className="rounded-lg px-3 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:bg-idle-pale hover:text-ink-secondary"
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  )
}

export function AlertsPage() {
  const { robots } = useApp()
  const [tab, setTab] = useState<FilterTab>('all')

  const { data: notifications } = usePolling(getNotifications, 5000, [])

  const robotMap = new Map(robots.map((r) => [r.id, r.name]))

  const counts = {
    total: notifications?.length ?? 0,
    unread: notifications?.filter((n) => !n.read).length ?? 0,
    read: notifications?.filter((n) => n.read).length ?? 0,
  }

  const filtered = (() => {
    switch (tab) {
      case 'unread':
        return (notifications ?? []).filter((n) => !n.read)
      case 'read':
        return (notifications ?? []).filter((n) => n.read)
      default:
        return notifications ?? []
    }
  })()

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id)
    } catch {
      // silently fail — polling will eventually reflect the change
    }
  }

  const tabItems: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.total },
    { id: 'unread', label: 'Unread', count: counts.unread },
    { id: 'read', label: 'Read', count: counts.read },
  ]

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Alerts</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">
          Operational notifications from your CleanBot fleet.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4">
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-pale text-brand">
            <Bell size={18} />
          </div>
          <div>
            <p className="text-[12px] font-medium text-ink-secondary">Total</p>
            <p className="text-[22px] font-bold text-ink">{counts.total}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-pale text-warning">
            <Bell size={18} />
          </div>
          <div>
            <p className="text-[12px] font-medium text-ink-secondary">Unread</p>
            <p className="text-[22px] font-bold text-ink">{counts.unread}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-pale text-success">
            <Check size={18} />
          </div>
          <div>
            <p className="text-[12px] font-medium text-ink-secondary">Read</p>
            <p className="text-[22px] font-bold text-ink">{counts.read}</p>
          </div>
        </Card>
      </div>

      <div className="mb-4 flex gap-2">
        {tabItems.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              tab === t.id
                ? 'bg-ink text-white'
                : 'bg-white text-ink-secondary ring-1 ring-line hover:bg-idle-pale'
            }`}
          >
            {t.label} {t.count > 0 && `(${t.count})`}
          </button>
        ))}
      </div>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Bell size={22} />}
            title={
              tab === 'all'
                ? 'No notifications yet'
                : tab === 'unread'
                  ? 'No unread notifications'
                  : 'No read notifications'
            }
            description="Notifications from your fleet will appear here."
          />
        ) : (
          <div className="divide-y divide-line/80">
            {filtered.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                robotName={notification.robot_id ? robotMap.get(notification.robot_id) ?? null : null}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
