import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle: string
  children?: ReactNode
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  )
}
