import { Flame } from 'lucide-react'
import { heatColors, heatStroke } from '../../data/mockData'

interface HeatZone {
  id: string
  name: string
  heat: 'low' | 'medium' | 'high' | 'hotspot'
  x: number
  y: number
  w: number
  h: number
}

const VIEW_W = 574
const VIEW_H = 382

export function CleaningHeatmap({ zones }: { zones: HeatZone[] }) {
  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        role="img"
        aria-label="Cleaning heatmap"
      >
        <rect
          x="12"
          y="12"
          width={VIEW_W - 24}
          height={VIEW_H - 24}
          rx="14"
          fill="#FBFCFE"
          stroke="#DDE4EE"
          strokeWidth="2"
        />
        {zones.map((zone) => (
          <g key={zone.id}>
            <rect
              x={zone.x}
              y={zone.y}
              width={zone.w}
              height={zone.h}
              rx="10"
              fill={heatColors[zone.heat]}
              stroke={heatStroke[zone.heat]}
              strokeWidth="1.5"
            />
            <text
              x={zone.x + zone.w / 2}
              y={zone.y + zone.h / 2 - (zone.heat === 'hotspot' ? 8 : 0)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fontWeight={600}
              fill="#13213A"
              opacity={0.75}
            >
              {zone.name}
            </text>
            {zone.heat === 'hotspot' && (
              <g transform={`translate(${zone.x + zone.w / 2}, ${zone.y + zone.h / 2 + 12})`}>
                <circle r="11" fill="#FFFFFF" opacity="0.85" />
                <Flame size={15} className="text-danger" style={{ transform: 'translate(-7.5px, -7.5px)' }} />
                <text
                  x="4"
                  y="-2"
                  fontSize="9"
                  fontWeight={700}
                  fill="#E5484D"
                >
                  x3
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
          <span
            className="inline-block h-3.5 w-3.5 rounded-[4px] border"
            style={{ background: heatColors.low, borderColor: heatStroke.low }}
          />
          Low
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
          <span
            className="inline-block h-3.5 w-3.5 rounded-[4px] border"
            style={{
              background: heatColors.medium,
              borderColor: heatStroke.medium,
            }}
          />
          Medium
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
          <span
            className="inline-block h-3.5 w-3.5 rounded-[4px] border"
            style={{
              background: heatColors.high,
              borderColor: heatStroke.high,
            }}
          />
          High
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
          <span
            className="inline-block h-3.5 w-3.5 rounded-[4px] border"
            style={{
              background: heatColors.hotspot,
              borderColor: heatStroke.hotspot,
            }}
          />
          Hotspot
        </span>
      </div>
    </div>
  )
}
