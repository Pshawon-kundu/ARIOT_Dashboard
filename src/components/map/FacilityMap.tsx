import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Layers, MapPin, X } from 'lucide-react'
import { LevelOneFloorPlan } from './LevelOneFloorPlan'
import { LevelTwoFloorPlan } from './LevelTwoFloorPlan'
import { MapControls } from './MapControls'
import { MapLegend } from './MapLegend'
import { mapDetections } from '../../data/mockData'
import { detectionMeta } from '../situation/awareness'
import { OutcomeTag } from '../situation/OutcomeTag'
import type { MapDetection } from '../../types'

type Floor = 'Level 1' | 'Level 2'

const floors: Floor[] = ['Level 1', 'Level 2']

type RoomStatus = 'cleaned' | 'cleaning' | 'uncleaned' | 'restricted'

interface RoomInfo {
  id: string
  name: string
  status: RoomStatus
  detail: string
  cta?: 'cleaning' | 'schedule'
}

const level1Rooms: RoomInfo[] = [
  { id: 'L1', name: 'Lobby', status: 'cleaned', detail: 'Cleaned · Completed at 9:42 AM · Coverage 100%' },
  { id: 'L1E', name: 'East Wing', status: 'cleaning', detail: 'Cleaning now · 68% complete · CleanBot 01 · About 26 min remaining', cta: 'cleaning' },
  { id: 'L1O1', name: 'Office', status: 'uncleaned', detail: 'Not yet cleaned · Scheduled today at 4:30 PM', cta: 'schedule' },
  { id: 'L1O2', name: 'Office', status: 'uncleaned', detail: 'Not yet cleaned · Scheduled today at 4:30 PM', cta: 'schedule' },
  { id: 'L1S', name: 'Service Area', status: 'cleaning', detail: 'Cleaning now · 54% complete · CleanBot 01', cta: 'cleaning' },
  { id: 'L1U', name: 'Utility Room', status: 'uncleaned', detail: 'Not yet cleaned · Scheduled today at 5:00 PM', cta: 'schedule' },
  { id: 'L1ST', name: 'Storage', status: 'uncleaned', detail: 'Not yet cleaned · No cleaning planned', cta: 'schedule' },
  { id: 'L1D', name: 'Charging Dock', status: 'cleaned', detail: 'Cleaned · Robot charging area' },
  { id: 'L1NG', name: 'Restricted Area', status: 'restricted', detail: 'Robot entry is disabled. The robot will not enter this area.' },
]

const level2Rooms: RoomInfo[] = [
  { id: 'L2L', name: 'Library', status: 'cleaned', detail: 'Cleaned · Completed at 9:30 AM · Coverage 100%' },
  { id: 'L2C', name: 'Common Area', status: 'cleaned', detail: 'Cleaned · Completed at 10:05 AM · Coverage 98%' },
  { id: 'L2E', name: 'East Wing', status: 'cleaning', detail: 'Cleaning now · 54% complete · CleanBot 03', cta: 'cleaning' },
  { id: 'L2T', name: 'Training Room', status: 'uncleaned', detail: 'Not yet cleaned · Scheduled today at 3:00 PM', cta: 'schedule' },
  { id: 'L2LR', name: 'Lecture Room', status: 'uncleaned', detail: 'Not yet cleaned · Scheduled tomorrow at 8:00 AM', cta: 'schedule' },
  { id: 'L2ST', name: 'Staff Room', status: 'uncleaned', detail: 'Not yet cleaned · Scheduled today at 3:30 PM', cta: 'schedule' },
  { id: 'L2NG', name: 'Restricted Area', status: 'restricted', detail: 'Robot entry is disabled. The robot will not enter this area.' },
]

const roomStatusStyle: Record<RoomStatus, { dot: string; text: string; label: string }> = {
  cleaned: { dot: 'bg-success', text: 'text-[#18794E]', label: 'Cleaned' },
  cleaning: { dot: 'bg-brand', text: 'text-brand-dark', label: 'Cleaning Now' },
  uncleaned: { dot: 'bg-[#98A2B3]', text: 'text-ink-secondary', label: 'Not Yet Cleaned' },
  restricted: { dot: 'bg-danger', text: 'text-danger', label: 'Restricted' },
}

export function FacilityMap({ title = 'Live Facility Map' }: { title?: string }) {
  const navigate = useNavigate()
  const [floor, setFloor] = useState<Floor>('Level 1')
  const [zoom, setZoom] = useState(1)
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [detection, setDetection] = useState<MapDetection | null>(null)
  const [showDetections, setShowDetections] = useState(true)

  const rooms = floor === 'Level 1' ? level1Rooms : level2Rooms
  const detections = showDetections
    ? mapDetections.filter((d) => d.floor === floor)
    : []

  return (
    <section className="rounded-2xl border border-[#E3EAF3] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-[#101828]">{title}</h2>
        <div className="relative">
          <MapPin
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]"
          />
          <select
            value={floor}
            onChange={(e) => {
              setFloor(e.target.value as Floor)
              setRoom(null)
              setDetection(null)
            }}
            aria-label="Select floor"
            className="h-9 appearance-none rounded-lg border border-[#DCE4EF] bg-white pl-8 pr-8 text-sm font-medium text-[#344054] transition hover:bg-[#F8FAFC] focus:border-brand focus:outline-none"
          >
            {floors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setShowDetections((v) => !v)
            setDetection(null)
          }}
          aria-pressed={showDetections}
          className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-colors ${
            showDetections
              ? 'border-brand/30 bg-brand-pale text-brand-dark'
              : 'border-[#DCE4EF] bg-white text-[#667085] hover:bg-[#F8FAFC]'
          }`}
        >
          <Layers size={14} />
          Detections
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-white">
        <MapControls
          onZoomIn={() => setZoom((z) => Math.min(z + 0.1, 1.25))}
          onZoomOut={() => setZoom((z) => Math.max(z - 0.1, 0.85))}
          onReset={() => setZoom(1)}
        />
        <div
          className="relative origin-center transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          {floor === 'Level 1' ? <LevelOneFloorPlan /> : <LevelTwoFloorPlan />}

          {/* Overlay stays in the same transformed coordinate space as the floor plan */}
          <svg
            viewBox="0 0 820 500"
            className="absolute inset-0 h-full w-full"
            style={{ pointerEvents: 'none' }}
          >
            {/* Clickable room hotspots */}
            {rooms.map((r) => (
              <rect
                key={r.id}
                x={roomBox(r.id, floor).x}
                y={roomBox(r.id, floor).y}
                width={roomBox(r.id, floor).w}
                height={roomBox(r.id, floor).h}
                rx={8}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                fill={room?.id === r.id ? 'rgba(23,105,224,0.12)' : 'transparent'}
                stroke={room?.id === r.id ? '#1769E0' : 'transparent'}
                strokeWidth={room?.id === r.id ? 2.5 : 0}
                className="transition-colors hover:fill-[rgba(23,105,224,0.08)] hover:stroke-[#9FC7FF] hover:stroke-[1.5]"
                onClick={() => {
                  setDetection(null)
                  setRoom(r)
                }}
              >
                <title>{`${r.name} · ${roomStatusStyle[r.status].label}`}</title>
              </rect>
            ))}

            {/* Detection markers — rendered as SVG so they scale/position with the map */}
              {showDetections &&
              detections.map((d) => (
                <g
                  key={d.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setRoom(null)
                    setDetection(d)
                  }}
                >
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={9}
                    fill={detectionMeta[d.type].marker}
                    stroke="#ffffff"
                    strokeWidth={2.5}
                    style={{ pointerEvents: 'none' }}
                  />
                  <circle cx={d.x} cy={d.y} r={3} fill="#ffffff" style={{ pointerEvents: 'none' }} />
                  <title>{detectionMeta[d.type].tooltip}</title>
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={16}
                    fill="transparent"
                    style={{ pointerEvents: 'auto' }}
                    data-testid="detection-marker"
                  />
                </g>
              ))}
          </svg>
        </div>

        {/* Room detail popover */}
        {room && (
          <div className="absolute bottom-3 left-3 right-3 z-30 rounded-xl border border-[#E3EAF3] bg-white/95 p-3.5 shadow-card-hover backdrop-blur animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-ink">{room.name}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full bg-app px-2 py-0.5 text-[11px] font-semibold ${roomStatusStyle[room.status].text}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${roomStatusStyle[room.status].dot}`} />
                    {roomStatusStyle[room.status].label}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] leading-snug text-ink-secondary">{room.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => setRoom(null)}
                aria-label="Close"
                className="shrink-0 rounded-md p-1 text-ink-muted hover:bg-app"
              >
                <X size={15} />
              </button>
            </div>
            {room.cta && (
              <button
                type="button"
                onClick={() => {
                  setRoom(null)
                  navigate(room.cta === 'cleaning' ? '/cleaning' : '/cleaning')
                }}
                className="mt-2.5 w-full rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                {room.cta === 'cleaning' ? 'View Cleaning' : 'Schedule Cleaning'}
              </button>
            )}
          </div>
        )}

        {/* Detection detail popover */}
        {detection && (
          <div className="absolute bottom-3 left-3 right-3 z-30 rounded-xl border border-[#E3EAF3] bg-white/95 p-3.5 shadow-card-hover backdrop-blur animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full ${detectionMeta[detection.type].marker}`}>
                    {(() => {
                      const Icon = detectionMeta[detection.type].icon
                      return <Icon size={11} className="text-white" />
                    })()}
                  </span>
                  <span className="text-[15px] font-bold text-ink">{detectionMeta[detection.type].label}</span>
                </div>
                <p className="mt-1 text-[12.5px] leading-snug text-ink-secondary">
                  {detection.location} · {detection.time}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-snug text-ink-secondary">
                  <span className="font-semibold text-ink">CleanBot response: </span>
                  {detection.response}
                </p>
                <div className="mt-2">
                  <OutcomeTag outcome={detection.outcome ?? 'auto'} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetection(null)}
                aria-label="Close"
                className="shrink-0 rounded-md p-1 text-ink-muted hover:bg-app"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      <MapLegend />
    </section>
  )
}

function roomBox(id: string, floor: Floor) {
  const boxes: Record<string, { x: number; y: number; w: number; h: number }> =
    floor === 'Level 1'
      ? {
          L1: { x: 60, y: 55, w: 175, h: 160 },
          L1E: { x: 278, y: 47, w: 200, h: 175 },
          L1O1: { x: 500, y: 69, w: 120, h: 110 },
          L1O2: { x: 580, y: 69, w: 120, h: 110 },
          L1S: { x: 645, y: 69, w: 100, h: 120 },
          L1U: { x: 85, y: 285, w: 130, h: 130 },
          L1ST: { x: 545, y: 250, w: 150, h: 120 },
          L1D: { x: 585, y: 390, w: 120, h: 60 },
          L1NG: { x: 254, y: 234, w: 148, h: 140 },
        }
      : {
          L2L: { x: 273, y: 47, w: 172, h: 130 },
          L2C: { x: 274, y: 280, w: 151, h: 140 },
          L2E: { x: 513, y: 69, w: 230, h: 180 },
          L2T: { x: 83, y: 71, w: 187, h: 119 },
          L2LR: { x: 84, y: 282, w: 187, h: 137 },
          L2ST: { x: 517, y: 70, w: 150, h: 82 },
          L2NG: { x: 420, y: 238, w: 130, h: 120 },
        }
  return boxes[id]
}
