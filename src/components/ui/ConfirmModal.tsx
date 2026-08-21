import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel: string
  icon?: ReactNode
  danger?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  icon,
  danger = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="px-6 pb-6 pt-5">
        <div className="flex gap-4">
          {icon && (
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                danger ? 'bg-danger-pale text-danger' : 'bg-warning-pale text-warning'
              }`}
            >
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-base font-bold text-ink">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
