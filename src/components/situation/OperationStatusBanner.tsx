import { CheckCircle2, TriangleAlert } from 'lucide-react'

export function OperationStatusBanner({
  needsAttention,
  activeCleaning = 0,
  onReview,
}: {
  needsAttention: number
  activeCleaning?: number
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
          {activeCleaning > 0
            ? `${activeCleaning} robot${activeCleaning > 1 ? 's are' : ' is'} actively cleaning.`
            : 'No active cleaning in progress.'}
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
