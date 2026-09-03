import { useState } from 'react'
import { Layers, MapPin, X } from 'lucide-react'
import { MapControls } from './MapControls'
import { MapLegend } from './MapLegend'
import { detectionMeta } from '../situation/awareness'
import { OutcomeTag } from '../situation/OutcomeTag'
import { getRobotSimMap, useApi } from '../../services/api'
import type { LiveTelemetry, MapDetection, SimulationMapData } from '../../types'

type RoomStatus = 'cleaned' | 'cleaning' | 'uncleaned' | 'restricted'

interface RoomInfo {
  id: string
  name: string
  status: RoomStatus
  detail: string
  cta?: 'cleaning' | 'schedule'
}

const roomStatusStyle: Record<RoomStatus, { dot: string; text: string; label: string }> = {
  cleaned: { dot: 'bg-success', text: 'text-[#18794E]', label: 'Cleaned' },
  cleaning: { dot: 'bg-brand', text: 'text-brand-dark', label: 'Cleaning Now' },
  uncleaned: { dot: 'bg-[#98A2B3]', text: 'text-ink-secondary', label: 'Not Yet Cleaned' },
  restricted: { dot: 'bg-danger', text: 'text-danger', label: 'Restricted' },
}

const SVG_WIDTH = 820
const SVG_HEIGHT = 500

function worldToSvg(worldW: number, worldH: number, wx: number, wy: number): { svgX: number; svgY: number } {
  const scaleX = SVG_WIDTH / worldW
  const scaleY = SVG_HEIGHT / worldH
  return {
    svgX: wx * scaleX,
    svgY: (worldH - wy) * scaleY,
  }
}

function worldBoundsToSvgRect(
  worldW: number,
  worldH: number,
  bounds: [number, number, number, number]
): { x: number; y: number; w: number; h: number } {
  const { svgX: xmin, svgY: ymax } = worldToSvg(worldW, worldH, bounds[0], bounds[2])
  const { svgX: xmax, svgY: ymin } = worldToSvg(worldW, worldH, bounds[1], bounds[3])
  return { x: xmin, y: ymin, w: xmax - xmin, h: ymax - ymin }
}

function worldSegmentToSvgLine(
  worldW: number,
  worldH: number,
  segment: number[]
): { x1: number; y1: number; x2: number; y2: number } {
  const { svgX: x1, svgY: y1 } = worldToSvg(worldW, worldH, segment[0], segment[1])
  const { svgX: x2, svgY: y2 } = worldToSvg(worldW, worldH, segment[2], segment[3])
  return { x1, y1, x2, y2 }
}

function SimMapRenderer({ simMap }: { simMap: SimulationMapData }) {
  const worldW = simMap.size[0]
  const worldH = simMap.size[1]

  const outerWalls = simMap.walls.filter((w) => {
    const isOuter =
      (w[0] === 0 && w[2] === worldW) ||
      (w[1] === 0 && w[3] === worldH) ||
      (w[0] === 0 && w[1] === 0) ||
      (w[0] === worldW && w[1] === 0) ||
      (w[0] === 0 && w[3] === worldH) ||
      (w[0] === worldW && w[3] === worldH)
    return !isOuter
  })

  const obstacles = simMap.obstacles.filter((o) => !o.dynamic && !o.restricted)
  const restrictedAreas = simMap.obstacles.filter((o) => !o.dynamic && o.restricted)

  return (
    <>
      <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#FFFFFF" />

      <g fill="none" stroke="#E8ECF4" strokeWidth="1">
        {simMap.rooms.map((room, i) => {
          const rect = worldBoundsToSvgRect(worldW, worldH, room.bounds)
          return (
            <rect
              key={`room-${i}`}
              x={rect.x}
              y={rect.y}
              width={rect.w}
              height={rect.h}
              fill="#F8FAFC"
              stroke="#D1D9E6"
              strokeWidth="1"
            />
          )
        })}
      </g>

      <g fill="none" stroke="#AEB9C7" strokeWidth="2.5" strokeLinejoin="round">
        {simMap.walls.map((wall, i) => {
          const line = worldSegmentToSvgLine(worldW, worldH, wall)
          return <line key={`wall-${i}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
        })}
      </g>

      <g fill="none" stroke="#D1D9E6" strokeWidth="1">
        {outerWalls.map((wall, i) => {
          const line = worldSegmentToSvgLine(worldW, worldH, wall)
          return <line key={`inner-wall-${i}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
        })}
      </g>

      {obstacles.map((obs, i) => {
        const rect = worldBoundsToSvgRect(worldW, worldH, obs.bounds)
        return (
          <rect
            key={`obs-${i}`}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            fill="#E8ECF4"
            stroke="#B5BFCA"
            strokeWidth="1"
            rx="2"
          />
        )
      })}

      {restrictedAreas.map((area, i) => {
        const rect = worldBoundsToSvgRect(worldW, worldH, area.bounds)
        return (
          <g key={`restricted-${i}`}>
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.w}
              height={rect.h}
              fill="#FDECEC"
              stroke="#E5484D"
              strokeWidth="2"
              rx="4"
            />
            <g transform={`translate(${rect.x + rect.w / 2} ${rect.y + rect.h / 2})`}>
              <rect x={-50} y={-12} width={100} height={24} rx="12" fill="white" stroke="#E5484D" strokeWidth="1.5" />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#E5484D"
                fontFamily="Inter, sans-serif"
              >
                Restricted
              </text>
            </g>
          </g>
        )
      })}

      {(() => {
        const dockX = simMap.dock[0]
        const dockY = simMap.dock[1]
        const { svgX, svgY } = worldToSvg(worldW, worldH, dockX, dockY)
        return (
          <g transform={`translate(${svgX} ${svgY})`}>
            <rect x={-12} y={-12} width={24} height={24} fill="#1769E0" rx="4" />
            <text x={0} y={4} textAnchor="middle" fontSize="10" fontWeight="700" fill="white">
              D
            </text>
          </g>
        )
      })()}
    </>
  )
}

export function FacilityMap({ title = 'Live Facility Map', liveTelemetry, robotId: robotIdProp, detections = [], robotName }: { title?: string; liveTelemetry?: LiveTelemetry | null; robotId?: string; detections?: MapDetection[]; robotName?: string }) {
  const [zoom, setZoom] = useState(1)
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [detection, setDetection] = useState<MapDetection | null>(null)
  const [showDetections, setShowDetections] = useState(true)

  const robotId = liveTelemetry?.robot_id ?? robotIdProp ?? ''

  const { data: simMapData, loading: simMapLoading, error: simMapError } = useApi(
    () => (robotId ? getRobotSimMap(robotId) : Promise.reject(new Error('No robot ID'))),
    [robotId]
  )

  const simMap = simMapData?.map ?? null

  const visibleDetections = showDetections ? detections : []

  return (
    <section className="rounded-2xl border border-[#E3EAF3] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-[#101828]">{title}</h2>
        <div className="flex items-center gap-2 text-sm text-[#667085]">
          <MapPin size={15} />
          <span>{simMap?.name ?? 'Loading...'}</span>
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
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="block h-auto w-full select-none"
            role="img"
            aria-label="Facility floor plan"
          >
            {simMapLoading && (
              <text x={SVG_WIDTH / 2} y={SVG_HEIGHT / 2} textAnchor="middle" fontSize="14" fill="#98A2B3">
                Loading map...
              </text>
            )}
            {simMapError && (
              <text x={SVG_WIDTH / 2} y={SVG_HEIGHT / 2} textAnchor="middle" fontSize="14" fill="#E5484D">
                Failed to load map
              </text>
            )}
            {simMap && <SimMapRenderer simMap={simMap} />}

            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="absolute inset-0 h-full w-full"
              style={{ pointerEvents: 'none' }}
            >
              {showDetections &&
                visibleDetections.map((d) => {
                  const scaleX = SVG_WIDTH / 30
                  const scaleY = SVG_HEIGHT / 14
                  const svgX = d.x * scaleX
                  const svgY = (14 - d.y) * scaleY
                  return (
                    <g
                      key={d.id}
                      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                      onClick={() => {
                        setRoom(null)
                        setDetection(d)
                      }}
                    >
                      <circle
                        cx={svgX}
                        cy={svgY}
                        r={9}
                        fill={detectionMeta[d.type].marker}
                        stroke="#ffffff"
                        strokeWidth={2.5}
                        style={{ pointerEvents: 'none' }}
                      />
                      <circle cx={svgX} cy={svgY} r={3} fill="#ffffff" style={{ pointerEvents: 'none' }} />
                      <title>{detectionMeta[d.type].tooltip}</title>
                    </g>
                  )
                })}

              {liveTelemetry && simMap && (() => {
                const worldW = simMap.size[0]
                const worldH = simMap.size[1]
                const scaleX = SVG_WIDTH / worldW
                const scaleY = SVG_HEIGHT / worldH
                const toSvgX = (wx: number) => wx * scaleX
                const toSvgY = (wy: number) => (worldH - wy) * scaleY
                const robotSvgX = toSvgX(liveTelemetry.position.x)
                const robotSvgY = toSvgY(liveTelemetry.position.y)
                const headingDeg = -(liveTelemetry.orientation * 180) / Math.PI

                const trail = liveTelemetry.path_history.slice(-60)

                const wp = liveTelemetry.target_waypoint
                const showGoal = wp && wp.x !== undefined && wp.y !== undefined && liveTelemetry.status !== 'charging'

                return (
                  <>
                    {liveTelemetry.planned_route && liveTelemetry.planned_route.length > 1 && (
                      <polyline
                        points={liveTelemetry.planned_route.map((wp) => `${toSvgX(wp.x)},${toSvgY(wp.y)}`).join(' ')}
                        fill="none"
                        stroke="#94A3B8"
                        strokeWidth="1.5"
                        strokeDasharray="6 4"
                        strokeLinecap="round"
                        opacity="0.6"
                        style={{ pointerEvents: 'none' }}
                      />
                    )}

                    {liveTelemetry.planned_route?.map((wp, i) => (
                      <circle
                        key={`wp-${i}`}
                        cx={toSvgX(wp.x)}
                        cy={toSvgY(wp.y)}
                        r="2.5"
                        fill="#94A3B8"
                        opacity="0.5"
                        style={{ pointerEvents: 'none' }}
                      />
                    ))}

                    {liveTelemetry.lidar && (() => {
                      const { ranges, angles, range_max } = liveTelemetry.lidar
                      if (!ranges || ranges.length === 0) return null
                      const points = ranges
                        .map((r, i) => {
                          if (r === null || r === undefined || r >= range_max) return null
                          const angleDeg = angles[i] ?? 0
                          const angleRad = (angleDeg * Math.PI) / 180
                          const worldAngle = angleRad + liveTelemetry.orientation
                          const hitX = liveTelemetry.position.x + r * Math.cos(worldAngle)
                          const hitY = liveTelemetry.position.y + r * Math.sin(worldAngle)
                          return { x: toSvgX(hitX), y: toSvgY(hitY) }
                        })
                        .filter((p): p is { x: number; y: number } => p !== null)
                      if (points.length === 0) return null
                      return (
                        <g style={{ pointerEvents: 'none' }} opacity="0.7">
                          <polygon
                            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="rgba(23,105,224,0.10)"
                            stroke="#1769E0"
                            strokeWidth="0.8"
                            strokeLinejoin="round"
                          />
                          {points.map((p, i) => (
                            <circle key={`lidar-${i}`} cx={p.x} cy={p.y} r="1.5" fill="#1769E0" opacity="0.5" />
                          ))}
                        </g>
                      )
                    })()}

                    {trail.length > 1 && (
                      <polyline
                        points={trail.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')}
                        fill="none"
                        stroke="#1769E0"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        opacity="0.8"
                        style={{ pointerEvents: 'none' }}
                      />
                    )}

                    {showGoal && (
                      <g style={{ pointerEvents: 'none' }} opacity="0.9">
                        <circle cx={toSvgX(wp.x!)} cy={toSvgY(wp.y!)} r="8" fill="none" stroke="#1769E0" strokeWidth="2" strokeDasharray="4 2" />
                        <circle cx={toSvgX(wp.x!)} cy={toSvgY(wp.y!)} r="3" fill="#1769E0" />
                        {wp.label && (
                          <g transform={`translate(${toSvgX(wp.x!) + 12} ${toSvgY(wp.y!) - 4})`}>
                            <rect x="0" y="-8" width={wp.label.length * 5.5 + 8} height="14" rx="3" fill="white" stroke="#1769E0" strokeWidth="1" opacity="0.9" />
                            <text x="4" y="2" fontSize="8" fill="#1769E0" fontWeight="600" fontFamily="system-ui">
                              {wp.label}
                            </text>
                          </g>
                        )}
                      </g>
                    )}

                    <g
                      transform={`translate(${robotSvgX} ${robotSvgY}) rotate(${headingDeg})`}
                      style={{ filter: 'drop-shadow(0px 2px 4px rgba(23,105,224,0.25))' }}
                    >
                      <circle cx="0" cy="0" r="20" fill="#EAF3FF" stroke="#78AEFA" strokeWidth="1.5" />
                      <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#1769E0" strokeWidth="2" />
                      <polygon points="0,-10 -5,4 5,4" fill="#1769E0" />
                      <circle
                        cx="0"
                        cy="0"
                        r="22"
                        fill="none"
                        stroke={liveTelemetry.status === 'cleaning' ? '#20A765' : '#F59E0B'}
                        strokeWidth="2"
                        opacity="0.7"
                      />
                    </g>

                    <g transform={`translate(${robotSvgX + 26} ${robotSvgY - 8})`}>
                      <rect x="0" y="0" width="70" height="20" rx="4" fill="#1769E0" opacity="0.9" />
                      <text x="35" y="13" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" fontFamily="system-ui">
                        {robotName ?? liveTelemetry.robot_id.slice(0, 8)}
                      </text>
                    </g>
                  </>
                )
              })()}
            </svg>
          </svg>
        </div>

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
          </div>
        )}

        {detection && (
          <div className="absolute bottom-3 left-3 right-3 z-30 rounded-xl border border-[#E3EAF3] bg-white/95 p-3.5 shadow-card-hover backdrop-blur animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${detectionMeta[detection.type].marker}`}
                  >
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
