import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  maxWidth?: string
  hideClose?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  hideClose = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-[2px] sm:p-8 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`relative w-full ${maxWidth} rounded-card border border-line bg-card shadow-card-hover animate-scale-in`}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              {title && (
                <h2 className="text-lg font-bold text-ink">{title}</h2>
              )}
              {subtitle && (
                <p className="mt-0.5 text-[13px] text-ink-secondary">
                  {subtitle}
                </p>
              )}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-idle-pale hover:text-ink"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
