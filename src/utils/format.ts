export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    cleaning: 'Cleaning',
    charging: 'Charging',
    idle: 'Ready',
    ready: 'Ready',
    attention: 'Needs Attention',
    offline: 'Offline',
    paused: 'Paused',
    completed: 'Completed',
  }
  return map[status] ?? status
}
