import { useState } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { LevelOneFloorPlan } from './LevelOneFloorPlan'
import { LevelTwoFloorPlan } from './LevelTwoFloorPlan'
import { MapControls } from './MapControls'
import { MapLegend } from './MapLegend'

type Floor = 'Level 1' | 'Level 2'

const floors: Floor[] = ['Level 1', 'Level 2']

export function FacilityMap() {
  const [floor, setFloor] = useState<Floor>('Level 1')
  const [zoom, setZoom] = useState(1)

  return (
    <section className="rounded-2xl border border-[#E3EAF3] bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-[#101828]">
          Live Facility Map
        </h2>
        <div className="relative">
          <MapPin
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]"
          />
          <select
            value={floor}
            onChange={(e) => setFloor(e.target.value as Floor)}
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
      </div>

      <div className="relative overflow-hidden rounded-xl bg-white">
        <MapControls
          onZoomIn={() => setZoom((z) => Math.min(z + 0.1, 1.25))}
          onZoomOut={() => setZoom((z) => Math.max(z - 0.1, 0.85))}
          onReset={() => setZoom(1)}
        />
        <div
          className="origin-center transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          {floor === 'Level 1' ? <LevelOneFloorPlan /> : <LevelTwoFloorPlan />}
        </div>
      </div>

      <MapLegend />
    </section>
  )
}
