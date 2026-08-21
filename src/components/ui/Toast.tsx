import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { ToastMessage } from '../../types'

const toneConfig: Record<
  ToastMessage['tone'],
  { icon: typeof Info; iconClass: string; border: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-success',
    border: 'border-success/20',
  },
  info: { icon: Info, iconClass: 'text-brand', border: 'border-brand/20' },
  warning: {
    icon: TriangleAlert,
    iconClass: 'text-warning',
    border: 'border-warning/30',
  },
  error: { icon: XCircle, iconClass: 'text-danger', border: 'border-danger/20' },
}

export function ToastContainer() {
  const { toasts } = useApp()
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-full max-w-sm flex-col gap-2.5">
      {toasts.map((t) => {
        const cfg = toneConfig[t.tone]
        const Icon = cfg.icon
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3.5 shadow-card-hover animate-toast-in ${cfg.border}`}
          >
            <Icon size={20} className={`mt-0.5 shrink-0 ${cfg.iconClass}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-[13px] leading-snug text-ink-secondary">
                  {t.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
