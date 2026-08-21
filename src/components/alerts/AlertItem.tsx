import {
  CheckCircle2,
  Info,
  TriangleAlert,
  Wrench,
  XCircle,
} from 'lucide-react'
import type { AlertItem as AlertItemType, AlertSeverity } from '../../types'

const severityConfig: Record<
  AlertSeverity,
  { icon: typeof Info; tile: string }
> = {
  warning: { icon: TriangleAlert, tile: 'bg-warning-pale text-warning' },
  maintenance: { icon: Wrench, tile: 'bg-warning-pale text-warning' },
  success: { icon: CheckCircle2, tile: 'bg-success-pale text-success' },
  critical: { icon: XCircle, tile: 'bg-danger-pale text-danger' },
  info: { icon: Info, tile: 'bg-brand-pale text-brand' },
}

interface AlertItemProps {
  alert: AlertItemType
  onAction: (alert: AlertItemType) => void
  onResolve?: (alert: AlertItemType) => void
}

export function AlertItem({ alert, onAction, onResolve }: AlertItemProps) {
  const cfg = severityConfig[alert.severity]
  const Icon = cfg.icon
  return (
    <div
      className={`flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-app/70 ${
        alert.resolved ? 'opacity-60' : ''
      }`}
    >
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.tile}`}
      >
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-[14px] font-semibold text-ink">{alert.title}</p>
          <span className="rounded-md bg-idle-pale px-1.5 py-0.5 text-[11px] font-semibold text-ink-secondary">
            {alert.robotId}
          </span>
          {alert.resolved && (
            <span className="text-[11px] font-semibold text-success">
              Resolved
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-secondary">
          {alert.message}
        </p>
        <p className="mt-1 text-xs text-ink-muted">{alert.time}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <button
          onClick={() => onAction(alert)}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-pale"
        >
          {alert.action}
        </button>
        {onResolve && !alert.resolved && (
          <button
            onClick={() => onResolve(alert)}
            className="rounded-lg px-3 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:bg-idle-pale hover:text-ink-secondary"
          >
            Mark resolved
          </button>
        )}
      </div>
    </div>
  )
}
