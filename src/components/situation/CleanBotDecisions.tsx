import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { Card } from '../ui/Card'
import { OutcomeTag } from './OutcomeTag'
import type { AutonomousDecision } from '../../types'

export function CleanBotDecisions({
  decisions,
}: {
  decisions: AutonomousDecision[]
}) {
  return (
    <Card>
      <h2 className="text-[16px] font-bold text-ink">CleanBot Decisions</h2>
      <p className="mt-1 text-[12.5px] text-ink-secondary">
        A clear record of what CleanBot changed and why.
      </p>

      <ol className="mt-3 space-y-2.5">
        {decisions.map((d) => (
          <DecisionRow key={d.id} decision={d} />
        ))}
      </ol>
    </Card>
  )
}

function DecisionRow({ decision }: { decision: AutonomousDecision }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-xl border border-line bg-app/40 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 w-[58px] shrink-0 text-[11.5px] font-semibold text-ink-muted">
          {decision.time}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-ink">{decision.notice}</p>
          <p className="text-[12px] text-ink-secondary">{decision.location}</p>
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink">
            {decision.response}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <OutcomeTag outcome={decision.outcome} />
            {decision.why && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold text-brand transition-colors hover:bg-brand-pale"
              >
                <HelpCircle size={13} />
                Why?
                <ChevronDown
                  size={13}
                  className={`transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </div>

          {open && decision.why && (
            <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[12.5px] leading-snug text-ink-secondary animate-fade-in">
              {decision.why}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}
