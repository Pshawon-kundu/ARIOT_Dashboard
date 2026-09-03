export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    cleaning: 'Cleaning',
    charging: 'Charging',
    idle: 'Ready',
    ready: 'Ready',
    IDLE: 'Ready',
    CLEANING: 'Cleaning',
    CHARGING: 'Charging',
    PAUSED: 'Paused',
    TRANSIT_TO_DOCK: 'Returning',
    attention: 'Needs Attention',
    offline: 'Offline',
    paused: 'Paused',
    completed: 'Completed',
  }
  return map[status] ?? status
}
