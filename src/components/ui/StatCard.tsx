import type { ReactNode } from 'react'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string
  subtext: string
  icon: ReactNode
  iconClass: string
  subtextClass?: string
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  iconClass,
  subtextClass = 'text-ink-secondary',
}: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-secondary">{label}</p>
        <p className="mt-0.5 text-[28px] font-bold leading-8 tracking-tight text-ink">
          {value}
        </p>
        <p className={`mt-0.5 text-xs font-medium ${subtextClass}`}>{subtext}</p>
      </div>
    </Card>
  )
}
