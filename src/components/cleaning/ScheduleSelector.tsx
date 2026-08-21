import { CalendarClock, CalendarDays, Play, Repeat } from 'lucide-react'
import type { CleaningTask } from '../../types'

export type ScheduleType = CleaningTask['scheduleType']

interface ScheduleSelectorProps {
  value: ScheduleType
  onChange: (v: ScheduleType) => void
  date: string
  onDateChange: (v: string) => void
  time: string
  onTimeChange: (v: string) => void
  recurring: string
  onRecurringChange: (v: string) => void
}

const scheduleOptions: {
  id: ScheduleType
  label: string
  hint: string
  icon: typeof Play
}[] = [
  { id: 'now', label: 'Start Now', hint: 'Begin immediately', icon: Play },
  {
    id: 'later',
    label: 'Schedule Later',
    hint: 'Pick a date and time',
    icon: CalendarClock,
  },
  {
    id: 'recurring',
    label: 'Recurring',
    hint: 'Repeat on a schedule',
    icon: Repeat,
  },
]

export function ScheduleSelector({
  value,
  onChange,
  date,
  onDateChange,
  time,
  onTimeChange,
  recurring,
  onRecurringChange,
}: ScheduleSelectorProps) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {scheduleOptions.map((opt) => {
          const selected = value === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              aria-pressed={selected}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3.5 text-center transition-all duration-150 ${
                selected
                  ? 'border-brand bg-brand-pale/60 ring-1 ring-brand'
                  : 'border-line bg-white hover:border-[#CBD5E1] hover:bg-app'
              }`}
            >
              <opt.icon
                size={18}
                className={selected ? 'text-brand' : 'text-ink-muted'}
              />
              <span
                className={`text-[13px] font-semibold ${
                  selected ? 'text-brand-dark' : 'text-ink'
                }`}
              >
                {opt.label}
              </span>
              <span className="text-[11px] text-ink-muted">{opt.hint}</span>
            </button>
          )
        })}
      </div>

      {value === 'later' && (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-line bg-app/60 p-4 animate-fade-in">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
              <CalendarDays size={13} /> Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
              <CalendarClock size={13} /> Time
            </span>
            <input
              type="time"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>
        </div>
      )}

      {value === 'recurring' && (
        <div className="mt-4 rounded-xl border border-line bg-app/60 p-4 animate-fade-in">
          <span className="mb-2.5 block text-xs font-semibold text-ink-secondary">
            Repeat pattern
          </span>
          <div className="flex flex-wrap gap-2">
            {['Daily', 'Weekdays', 'Custom'].map((p) => (
              <button
                key={p}
                onClick={() => onRecurringChange(p)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  recurring === p
                    ? 'bg-brand text-white'
                    : 'bg-white text-ink-secondary ring-1 ring-line hover:bg-idle-pale'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
