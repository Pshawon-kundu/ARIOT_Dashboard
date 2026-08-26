import { Card } from '../ui/Card'
import { OutcomeTag } from './OutcomeTag'
import { detectionMeta } from './awareness'
import type { CleaningDetection } from '../../types'

export function WhatCleanBotNoticed({
  detections,
}: {
  detections: CleaningDetection[]
}) {
  return (
    <Card>
      <h2 className="text-[16px] font-bold text-ink">What CleanBot Noticed</h2>
      <p className="mt-1 text-[12.5px] text-ink-secondary">
        CleanBot uses its cameras to understand the floor and act on its own.
      </p>

      {detections.length === 0 ? (
        <p className="mt-4 rounded-xl bg-app/60 px-4 py-3 text-[13px] leading-snug text-ink-secondary">
          No active cleaning observations for this robot yet. CleanBot will share what it
          notices here while it is cleaning.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {detections.map((d) => {
            const meta = detectionMeta[d.type]
            const Icon = meta.icon
            return (
              <li
                key={d.id}
                className="rounded-xl border border-line bg-app/40 p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-pale text-warning">
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13.5px] font-bold text-ink">
                        {d.title}
                      </p>
                      <span className="shrink-0 text-[11.5px] font-medium text-ink-muted">
                        {d.timestamp}
                      </span>
                    </div>
                    <p className="text-[12px] text-ink-secondary">{d.location}</p>
                    <p className="mt-1.5 text-[12.5px] leading-snug text-ink">
                      {d.response}
                    </p>
                    <div className="mt-2">
                      <OutcomeTag outcome={d.outcome} />
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
