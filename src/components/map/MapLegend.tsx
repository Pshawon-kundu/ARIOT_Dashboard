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
        marker={<span className="h-3.5 w-3.5 rounded-[3px] border border-[#A9DEC3] bg-[#DDF5E8]" />}
        text="Cleaned"
      />
      <LegendItem
        marker={<span className="h-3.5 w-3.5 rounded-[3px] border border-[#9FC7FF] bg-[#DCEBFF]" />}
        text="In Progress"
      />
      <LegendItem
        marker={
          <span
            className="h-3.5 w-3.5 rounded-[3px] border border-[#CFD8E6]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg,#fff 0,#fff 3px,#D6DEE9 3px,#D6DEE9 4px)',
            }}
          />
        }
        text="Uncleaned"
      />
      <LegendItem
        marker={<span className="h-[2px] w-6 rounded-full bg-[#1672EA]" />}
        text="Robot Route"
      />
      <LegendItem
        marker={
          <span
            className="h-3.5 w-3.5 rounded-[3px] border border-[#E5484D]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg,#FDECEC 0,#FDECEC 3px,#E5484D 3px,#E5484D 4px)',
            }}
          />
        }
        text="No-Go Zone"
      />
    </div>
  )
}
