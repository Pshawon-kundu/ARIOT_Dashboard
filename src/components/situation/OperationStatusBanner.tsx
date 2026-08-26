import { CheckCircle2, TriangleAlert } from 'lucide-react'
import type { AlertItem } from '../../types'

export function OperationStatusBanner({
  needsAttention,
  topAlert,
  onReview,
}: {
  needsAttention: number
  topAlert?: AlertItem
  onReview?: () => void
}) {
  const hasAttention = needsAttention > 0
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-card border px-5 py-3.5 ${
        hasAttention
          ? 'border-danger/20 bg-danger-pale/50'
          : 'border-success/20 bg-success-pale/50'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          hasAttention ? 'bg-danger text-white' : 'bg-success text-white'
        }`}
      >
        {hasAttention ? <TriangleAlert size={18} /> : <CheckCircle2 size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[14.5px] font-bold ${
            hasAttention ? 'text-danger' : 'text-[#18794E]'
          }`}
        >
          {hasAttention
            ? `${needsAttention} item${needsAttention > 1 ? 's' : ''} need${
                needsAttention > 1 ? '' : 's'
              } attention`
            : 'Operations normal'}
        </p>
        <p className="text-[12.5px] text-ink-secondary">
          {hasAttention && topAlert
            ? `${topAlert.robotId} ${topAlert.message}`
            : '2 robots are cleaning and no urgent problems were detected.'}
        </p>
      </div>
      {hasAttention && onReview && (
        <button
          type="button"
          onClick={onReview}
          className="shrink-0 rounded-[10px] bg-danger px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#C93A3F]"
        >
          Review
        </button>
      )}
    </div>
  )
}
