interface RobotVisualProps {
  size?: number
  className?: string
}

export function RobotVisual({
  size = 120,
  className = '',
}: RobotVisualProps) {
  return (
    <img
      src="/assets/robot.png"
      alt="CleanBot robot"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  )
}
