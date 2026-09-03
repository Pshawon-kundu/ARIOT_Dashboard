import { useState } from 'react'
import { Play, CheckCircle2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { RobotVisual } from '../robots/RobotVisual'
import { startRobot } from '../../services/api'

interface StartCleaningModalProps {
  open: boolean
  onClose: () => void
  robot: { id: string; name: string } | null
  facilityName?: string
  status?: string
  onStart?: () => void
}

export function StartCleaningModal({
  open,
  onClose,
  robot,
  facilityName,
  status,
  onStart,
}: StartCleaningModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleClose = () => {
    setError(null)
    setDone(false)
    onClose()
  }

  const handleStart = async () => {
    if (!robot) return
    setLoading(true)
    setError(null)
    try {
      await startRobot(robot.id)
      setDone(true)
      onStart?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start cleaning')
    } finally {
      setLoading(false)
    }
  }

  const isAlreadyCleaning = status === 'cleaning'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Start Cleaning"
      subtitle="Begin autonomous cleaning mission"
      maxWidth="max-w-md"
    >
      {done ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-pale text-success">
            <CheckCircle2 size={30} />
          </span>
          <h3 className="mt-4 text-lg font-bold text-ink">Cleaning started</h3>
          <p className="mt-1.5 text-sm text-ink-secondary">
            {robot?.name} has begun its cleaning mission. Watch live progress on the Overview map.
          </p>
          <Button className="mt-6" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-5 px-6 py-5">
          <div className="flex items-center gap-4 rounded-xl border border-line bg-app/50 p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-idle-pale">
              <RobotVisual size={52} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-bold text-ink">{robot?.name ?? 'Unknown Robot'}</p>
                <StatusBadge status={isAlreadyCleaning ? 'cleaning' : status ?? 'N/A'} />
              </div>
              <p className="mt-0.5 text-[12px] text-ink-muted">{robot?.id}</p>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-app/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-ink-secondary">Facility</p>
                <p className="mt-0.5 text-[13.5px] font-semibold text-ink">{facilityName ?? 'ARIOT Demo Facility'}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-semibold text-ink-secondary">Cleaning Scope</p>
                <p className="mt-0.5 text-[13.5px] font-semibold text-ink">Whole Facility</p>
              </div>
            </div>
          </div>

          {isAlreadyCleaning && (
            <div className="rounded-lg border border-brand/20 bg-brand-pale/50 px-4 py-2.5 text-[13px] text-brand-dark">
              This robot is already cleaning. Starting again will restart the cleaning route from the beginning.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger-pale/50 px-4 py-2.5 text-[13px] text-danger">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              icon={<Play size={14} className="fill-current" />}
              onClick={handleStart}
              disabled={loading || !robot}
            >
              {loading ? 'Starting...' : 'Start Cleaning'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
