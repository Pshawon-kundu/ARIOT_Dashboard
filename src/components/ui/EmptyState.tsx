import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-idle-pale text-ink-muted">
        {icon}
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="max-w-xs text-[13px] text-ink-secondary">{description}</p>
      )}
    </div>
  )
}
