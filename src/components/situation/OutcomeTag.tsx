import { CheckCircle2, Eye, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { OutcomeState } from '../../types'
import { outcomeMeta } from './awareness'

const iconFor: Record<OutcomeState, LucideIcon> = {
  auto: CheckCircle2,
  monitoring: Eye,
  attention: TriangleAlert,
}

export function OutcomeTag({
  outcome,
  label,
  className = '',
}: {
  outcome: OutcomeState
  label?: string
  className?: string
}) {
  const m = outcomeMeta[outcome]
  const Icon = iconFor[outcome]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${m.cls} ${className}`}
    >
      <Icon size={13} strokeWidth={2.25} />
      {label ?? m.label}
    </span>
  )
}
