import { LocateFixed, Minus, Plus } from 'lucide-react'

interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function MapControls({ onZoomIn, onZoomOut, onReset }: MapControlsProps) {
  return (
    <div className="absolute left-3 top-[170px] z-20 overflow-hidden rounded-lg border border-[#DFE7F0] bg-white shadow-sm">
      <button type="button" onClick={onZoomIn} className="flex h-9 w-9 items-center justify-center border-b border-[#EEF2F6] text-[#667085] hover:bg-[#F8FAFC]" aria-label="Zoom in">
        <Plus size={16} />
      </button>
      <button type="button" onClick={onZoomOut} className="flex h-9 w-9 items-center justify-center border-b border-[#EEF2F6] text-[#667085] hover:bg-[#F8FAFC]" aria-label="Zoom out">
        <Minus size={16} />
      </button>
      <button type="button" onClick={onReset} className="flex h-9 w-9 items-center justify-center text-[#1769E0] hover:bg-[#F8FAFC]" aria-label="Reset map">
        <LocateFixed size={16} />
      </button>
    </div>
  )
}
