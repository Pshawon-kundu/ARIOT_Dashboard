import { Sparkles } from 'lucide-react'

export function AutomaticCleaningBadge() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand/15 bg-brand-pale/50 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
        <Sparkles size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13.5px] font-bold text-ink">Automatic Cleaning</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-success-pale px-2 py-0.5 text-[11px] font-bold text-[#18794E]">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Active
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-ink-secondary">
          CleanBot adjusts cleaning intensity based on floor conditions.
        </p>
      </div>
    </div>
  )
}
