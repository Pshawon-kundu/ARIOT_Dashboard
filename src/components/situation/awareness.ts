import {
  Droplets,
  TriangleAlert,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import type { DetectionType, OutcomeState } from '../../types'

export const detectionMeta: Record<
  DetectionType,
  { label: string; icon: LucideIcon; marker: string; tooltip: string }
> = {
  dirt: {
    label: 'Heavy dirt',
    icon: Droplets,
    marker: 'bg-warning',
    tooltip: 'Heavy dirt detected. CleanBot is applying deeper cleaning.',
  },
  stain: {
    label: 'Stain',
    icon: Droplets,
    marker: 'bg-warning',
    tooltip: 'Stain detected. CleanBot applied extra cleaning attention.',
  },
  spill: {
    label: 'Spill',
    icon: Droplets,
    marker: 'bg-warning',
    tooltip: 'Spill detected. CleanBot slowed down and increased cleaning attention.',
  },
  'solid-waste': {
    label: 'Solid waste',
    icon: Trash2,
    marker: 'bg-warning',
    tooltip: 'Solid waste detected. CleanBot identified this area for additional cleaning.',
  },
  obstacle: {
    label: 'Obstacle',
    icon: TriangleAlert,
    marker: 'bg-warning',
    tooltip: 'Temporary obstacle. CleanBot adjusted its route.',
  },
}

export const outcomeMeta: Record<
  OutcomeState,
  { label: string; cls: string; dot: string }
> = {
  auto: {
    label: 'Handled automatically',
    cls: 'bg-success-pale text-[#18794E]',
    dot: 'bg-success',
  },
  monitoring: {
    label: 'Monitoring',
    cls: 'bg-brand-pale text-brand-dark',
    dot: 'bg-brand',
  },
  attention: {
    label: 'Needs your attention',
    cls: 'bg-danger-pale text-danger',
    dot: 'bg-danger',
  },
}
