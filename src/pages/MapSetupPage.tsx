import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Pause,
  Save,
  SquareCheck,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { LevelOneFloorPlan } from '../components/map/LevelOneFloorPlan'
import { LevelTwoFloorPlan } from '../components/map/LevelTwoFloorPlan'
import { RobotVisual } from '../components/robots/RobotVisual'
import { useApp } from '../context/AppContext'

export function MapSetupPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { robots, showToast } = useApp()
  const robot = robots.find((r) => r.id === id)
  const [paused, setPaused] = useState(false)
  const [finished, setFinished] = useState(false)
  const [saved, setSaved] = useState({
    rooms: false,
    restricted: false,
    dock: false,
  })

  if (!robot) {
    return (
      <Card>
        <EmptyState
          icon={<MapPin size={22} />}
          title="Robot not found"
          description="This robot may have been removed from the fleet."
        />
        <div className="flex justify-center pb-6">
          <Button variant="secondary" onClick={() => navigate('/robots')}>
            Back to Robots
          </Button>
        </div>
      </Card>
    )
  }

  const floor: 'Level 1' | 'Level 2' = robot.level === 2 ? 'Level 2' : 'Level 1'
  const progress = 85

  const toggle = (key: keyof typeof saved) =>
    setSaved((s) => ({ ...s, [key]: !s[key] }))

  return (
    <div>
      <Link
        to={`/robots/${robot.id}`}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-secondary transition-colors hover:text-brand"
      >
        <ArrowLeft size={15} /> Back to {robot.name}
      </Link>

      <div className="grid grid-cols-3 gap-4">
        {/* Left: map discovery */}
        <div className="col-span-2 space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-ink">
                {finished ? 'Floor Map Ready' : 'Creating Floor Map'}
              </h2>
              {!finished && (
                <span className="text-[15px] font-bold text-brand-dark">{progress}%</span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-ink-secondary">
              {finished
                ? 'Review the discovered layout and finish setup.'
                : 'CleanBot is learning the layout of this floor.'}
            </p>
            {!finished && (
              <div className="mt-3">
                <ProgressBar value={progress} color="bg-brand" />
              </div>
            )}

            <div className="mt-4 overflow-hidden rounded-xl border border-line bg-app/40 p-2">
              {floor === 'Level 1' ? <LevelOneFloorPlan /> : <LevelTwoFloorPlan />}
            </div>

            <div className="mt-4 flex gap-3">
              {!finished ? (
                <>
                  <Button
                    variant="secondary"
                    icon={<Pause size={15} />}
                    onClick={() => setPaused((p) => !p)}
                  >
                    {paused ? 'Resume Mapping' : 'Pause Mapping'}
                  </Button>
                  <Button icon={<CheckCircle2 size={15} />} onClick={() => setFinished(true)}>
                    Finish Mapping
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setFinished(false)}>
                  Back to Mapping
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Right: configuration steps */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-idle-pale">
                <RobotVisual size={46} />
              </span>
              <div>
                <p className="text-[15px] font-bold text-ink">{robot.name}</p>
                <div className="mt-0.5">
                  <StatusBadge status={robot.status} />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-[16px] font-bold text-ink">Map Setup</h2>
            <p className="mt-1 text-[13px] text-ink-secondary">
              Configure the discovered floor before saving.
            </p>
            <div className="mt-4 space-y-2.5">
              <SetupRow
                title="Name Rooms"
                done={saved.rooms}
                disabled={!finished}
                onClick={() => {
                  toggle('rooms')
                  showToast('success', 'Rooms named', 'Room labels applied to the map.')
                }}
              />
              <SetupRow
                title="Set Restricted Areas"
                done={saved.restricted}
                disabled={!finished}
                onClick={() => {
                  toggle('restricted')
                  showToast('info', 'Restricted areas set', 'The robot will avoid these zones.')
                }}
              />
              <SetupRow
                title="Set Charging Dock"
                done={saved.dock}
                disabled={!finished}
                onClick={() => {
                  toggle('dock')
                  showToast('success', 'Charging dock set', 'Return-to-dock location saved.')
                }}
              />
            </div>
            <Button
              fullWidth
              className="mt-4"
              icon={<Save size={15} />}
              disabled={!finished || !saved.rooms || !saved.restricted || !saved.dock}
              onClick={() => {
                showToast('success', 'Floor map saved', `${floor} map is ready for autonomous cleaning.`)
                navigate(`/robots/${robot.id}`)
              }}
            >
              Save Map
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SetupRow({
  title,
  done,
  disabled,
  onClick,
}: {
  title: string
  done: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
        done
          ? 'border-success/40 bg-success-pale/50'
          : disabled
            ? 'border-line bg-white opacity-60'
            : 'border-line bg-white hover:border-[#CBD5E1]'
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            done ? 'bg-success text-white' : 'bg-idle-pale text-ink-muted'
          }`}
        >
          {done ? <CheckCircle2 size={15} /> : <SquareCheck size={15} />}
        </span>
        <span className="text-[13.5px] font-semibold text-ink">{title}</span>
      </span>
      <span className={`text-[12px] font-semibold ${done ? 'text-[#18794E]' : 'text-ink-muted'}`}>
        {done ? 'Done' : 'Set'}
      </span>
    </button>
  )
}
