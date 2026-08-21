import type { FC } from 'react'

interface RobotMapMarkerProps {
  x: number
  y: number
}

export const RobotMapMarker: FC<RobotMapMarkerProps> = ({ x, y }) => {
  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ filter: 'drop-shadow(0px 2px 4px rgba(23,105,224,0.20))' }}
    >
      <circle cx="0" cy="0" r="32" fill="#EAF3FF" stroke="#78AEFA" strokeWidth="2" />
      <circle cx="0" cy="0" r="25" fill="#FFFFFF" stroke="#1769E0" strokeWidth="2.5" />
      <image href="/assets/robot.png" x="-17" y="-18" width="34" height="36" preserveAspectRatio="xMidYMid meet" />
      <circle cx="19" cy="-18" r="6" fill="#20A765" stroke="#FFFFFF" strokeWidth="2" />
    </g>
  )
}
