interface ProgressBarProps {
  value: number
  color?: string
  trackClass?: string
  className?: string
  animate?: boolean
}

export function ProgressBar({
  value,
  color = 'bg-brand',
  trackClass = 'bg-idle-pale',
  className = '',
  animate = true,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full ${trackClass} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${color} ${animate ? 'animate-bar' : ''}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
