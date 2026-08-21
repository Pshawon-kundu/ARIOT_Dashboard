interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  color?: string
  trackColor?: string
}

export function CircularProgress({
  value,
  size = 116,
  strokeWidth = 10,
  label,
  color = '#1769E0',
  trackColor = '#EAF2FF',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-bold leading-none text-ink">
          {label ?? `${Math.round(clamped)}%`}
        </span>
      </div>
    </div>
  )
}
