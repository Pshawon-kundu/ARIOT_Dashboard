import type { ReactNode } from 'react'
import type { CleaningMode } from '../../types'
import { Check } from 'lucide-react'

export interface ModeOption {
  id: CleaningMode
  title: string
  description: string
  icon: ReactNode
}

interface CleaningModeCardProps {
  mode: ModeOption
  selected: boolean
  onSelect: (id: CleaningMode) => void
}

export function CleaningModeCard({
  mode,
  selected,
  onSelect,
}: CleaningModeCardProps) {
  return (
    <button
      onClick={() => onSelect(mode.id)}
      aria-pressed={selected}
      className={`relative flex w-full flex-col items-start gap-2.5 rounded-xl border p-4 text-left transition-all duration-150 ${
        selected
          ? 'border-brand bg-brand-pale/60 ring-1 ring-brand'
          : 'border-line bg-white hover:border-[#CBD5E1] hover:bg-app'
      }`}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          selected ? 'bg-brand text-white' : 'bg-brand-pale text-brand'
        }`}
      >
        {mode.icon}
      </span>
      <span>
        <span className="block text-[14px] font-semibold text-ink">
          {mode.title}
        </span>
        <span className="mt-1 block text-[12.5px] leading-snug text-ink-secondary">
          {mode.description}
        </span>
      </span>
    </button>
  )
}
