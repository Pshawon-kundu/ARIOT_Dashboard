import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Card } from '../ui/Card'
import { RobotVisual } from '../robots/RobotVisual'
import type { Robot, RobotSituation, AroundCleanBot } from '../../types'

function valueTone(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('block') || t.includes('needs') || t.includes('low'))
    return 'text-danger'
  if (
    t.includes('clear') ||
    t.includes('none') ||
    t.includes('safe') ||
    t.includes('normal') ||
    t.includes('good')
  )
    return 'text-[#18794E]'
  return 'text-warning'
}

function SituationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-[13px] text-ink-secondary">{label}</span>
      <span className={`text-[13px] font-semibold ${valueTone(value)}`}>
        {value}
      </span>
    </div>
  )
}

export function CurrentSituationCard({
  robot,
  situation,
  around,
  showRobot = true,
}: {
  robot: Robot
  situation?: RobotSituation
  around?: AroundCleanBot
  showRobot?: boolean
}) {
  if (!situation) return null
  return (
    <Card>
      <div className="flex items-center gap-2">
        <ShieldCheck size={17} className="text-brand" />
        <h2 className="text-[16px] font-bold text-ink">Current Situation</h2>
      </div>
      <p className="mt-1 text-[12.5px] text-ink-secondary">
        CleanBot is handling normal operation by itself.
      </p>

      {showRobot && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-app/60 px-3.5 py-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white">
            <RobotVisual size={40} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink">{robot.name}</p>
            <p className="text-[12px] text-ink-secondary">{robot.location}</p>
          </div>
        </div>
      )}

      <div className="mt-2 divide-y divide-line/70">
        <SituationRow label="Path" value={situation.path} />
        <SituationRow label="Floor condition" value={situation.floorCondition} />
        <SituationRow label="Nearby obstacle" value={situation.nearbyObstacle} />
        <SituationRow label="Restricted area" value={situation.restrictedArea} />
      </div>

      {around && <AroundDiagram around={around} />}

      {situation.response && (
        <div className="mt-3 rounded-xl bg-brand-pale/60 px-4 py-2.5">
          <p className="text-[12.5px] font-medium text-brand-dark">
            {situation.response}
          </p>
        </div>
      )}
    </Card>
  )
}

function AroundDiagram({ around }: { around: AroundCleanBot }) {
  const cell = (label: string, value: string): ReactNode => (
    <div className="rounded-lg bg-white px-2.5 py-2 text-center shadow-card">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p
        className={`mt-0.5 text-[11.5px] font-semibold ${valueTone(value)}`}
      >
        {value}
      </p>
    </div>
  )
  return (
    <div className="mt-4">
      <p className="mb-2 text-[12px] font-semibold text-ink-secondary">
        Around CleanBot
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-start-2">{cell('Ahead', around.ahead)}</div>
        <div className="col-start-1 row-start-2">
          {cell('Left', around.left)}
        </div>
        <div className="col-start-2 row-start-2 flex items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pale text-brand ring-1 ring-brand/30">
            <RobotVisual size={30} />
          </span>
        </div>
        <div className="col-start-3 row-start-2">
          {cell('Right', around.right)}
        </div>
        <div className="col-start-2 row-start-3">
          {cell('Nearby', around.nearby)}
        </div>
      </div>
      <p className="mt-2 text-[11.5px] text-ink-muted">
        Floor: <span className="font-semibold text-ink-secondary">{around.floor}</span>
      </p>
    </div>
  )
}
