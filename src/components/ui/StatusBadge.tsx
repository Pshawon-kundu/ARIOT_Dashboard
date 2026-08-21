import {
  BatteryCharging,
  CheckCircle2,
  Clock,
  Info,
  Pause,
  Sparkles,
  TriangleAlert,
  WifiOff,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { statusLabel } from '../../utils/format'

type Tone = 'green' | 'orange' | 'gray' | 'blue' | 'red'

const toneMap: Record<Tone, { pill: string }> = {
  green: { pill: 'bg-success-pale text-[#18794E]' },
  orange: { pill: 'bg-warning-pale text-[#B45309]' },
  gray: { pill: 'bg-idle-pale text-ink-secondary' },
  blue: { pill: 'bg-brand-pale text-brand-dark' },
  red: { pill: 'bg-danger-pale text-danger' },
}

export function statusTone(status: string): Tone {
  switch (status) {
    case 'cleaning':
    case 'completed':
    case 'success':
    case 'inspected':
    case 'ready':
    case 'online':
      return 'green'
    case 'charging':
    case 'warning':
    case 'attention':
    case 'paused':
    case 'due soon':
    case 'scheduled':
    case 'maintenance':
    case 'overdue':
      return 'orange'
    case 'idle':
    case 'offline':
    case 'info':
      return 'gray'
    case 'critical':
    case 'error':
      return 'red'
    default:
      return 'blue'
  }
}

const iconMap: Record<string, LucideIcon> = {
  cleaning: Sparkles,
  charging: BatteryCharging,
  ready: CheckCircle2,
  idle: CheckCircle2,
  attention: TriangleAlert,
  offline: WifiOff,
  paused: Pause,
  completed: CheckCircle2,
  success: CheckCircle2,
  inspected: CheckCircle2,
  maintenance: Wrench,
  'inspection recommended': Wrench,
  warning: TriangleAlert,
  critical: XCircle,
  error: XCircle,
  overdue: TriangleAlert,
  'due soon': Clock,
  info: Info,
  online: CheckCircle2,
  scheduled: Clock,
}

interface StatusBadgeProps {
  status: string
  label?: string
  tone?: Tone
  dot?: boolean
}

export function StatusBadge({
  status,
  label,
  tone,
  dot = true,
}: StatusBadgeProps) {
  const t = tone ?? statusTone(status)
  const Icon = iconMap[status] ?? Info
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneMap[t].pill}`}
    >
      {dot && <Icon size={13} strokeWidth={2.25} />}
      {label ?? statusLabel(status)}
    </span>
  )
}
