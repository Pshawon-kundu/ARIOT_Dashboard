import type { ReactNode } from 'react'

function LegendItem({ marker, text }: { marker: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {marker}
      <span>{text}</span>
    </div>
  )
}

export function MapLegend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-[#E8EDF4] pt-4 text-xs text-[#667085]">
      <LegendItem
        marker={<span className="block h-[2px] w-6 rounded-full bg-[#1769E0]" style={{ opacity: 0.8 }} />}
        text="Actual Route"
      />
      <LegendItem
        marker={<span className="block h-0 w-6 border-t-2 border-dashed border-[#94A3B8]" />}
        text="Planned Route"
      />
      <LegendItem
        marker={<span className="block h-3.5 w-3.5 rounded-full bg-[#1769E0]" />}
        text="Target Waypoint"
      />
      <LegendItem
        marker={
          <span
            className="block h-3.5 w-3.5 rounded-[3px] border border-[#E5484D]"
            style={{ backgroundColor: '#FDECEC' }}
          />
        }
        text="Restricted Zone"
      />
      <LegendItem
        marker={<span className="block h-3.5 w-3.5 rounded-[3px] border border-[#AEB9C7] bg-[#E8ECF4]" />}
        text="Obstacle"
      />
      <LegendItem
        marker={<span className="flex h-4 w-4 items-center justify-center rounded bg-[#1769E0] text-[7px] font-bold text-white">D</span>}
        text="Charging Dock"
      />
    </div>
  )
}
