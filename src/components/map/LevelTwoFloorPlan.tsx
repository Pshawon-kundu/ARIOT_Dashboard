import { RobotMapMarker } from './RobotMapMarker'

export function LevelTwoFloorPlan() {
  return (
    <svg viewBox="0 0 820 500" className="block h-auto w-full select-none" role="img" aria-label="Level 2 facility floor plan">
      <defs>
        <pattern id="l2Unclean" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="#FFFFFF" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="#D9E1EB" strokeWidth="1" />
        </pattern>
        <pattern id="l2Clean" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#DDF5E8" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#C8EBD8" strokeWidth="0.8" />
        </pattern>
        <pattern id="l2NoGo" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="9" height="9" fill="#FDECEC" />
          <line x1="0" y1="0" x2="0" y2="9" stroke="#E5484D" strokeWidth="1.1" />
        </pattern>
      </defs>
      <rect width="820" height="500" fill="#FFFFFF" />
      <path d="M76 68 H271 V43 H447 V66 H731 V164 H746 V248 H719 V309 H735 V422 H531 V442 H329 V422 H84 V345 H61 V222 H80 Z" fill="#FCFDFE" stroke="#AEB9C7" strokeWidth="3" strokeLinejoin="round" />
      <path d="M273 47 H445 V104 H512 V227 H462 V276 H274 Z" fill="url(#l2Clean)" stroke="#A0DEBF" strokeWidth="1.3">
        <title>Library · Cleaned · Completed at 9:30 AM</title>
      </path>
      <path d="M274 280 H425 V419 H330 V438 H274 Z" fill="url(#l2Clean)" stroke="#A0DEBF" strokeWidth="1.3">
        <title>Common Area · Cleaned · Completed at 10:05 AM</title>
      </path>
      <path d="M513 69 H728 V162 H743 V246 H716 V308 H573 V254 H513 Z" fill="#DCEBFF" fillOpacity="0.82" stroke="#9FC7FF" strokeWidth="1.4">
        <title>East wing · Cleaning now · 54% complete</title>
      </path>
      <path d="M429 279 H572 V310 H716 V420 H531 V438 H429 Z" fill="#DCEBFF" fillOpacity="0.72" stroke="#9FC7FF" strokeWidth="1.2">
        <title>Lower-right zone · Cleaning now</title>
      </path>
      <g fill="url(#l2Unclean)" stroke="#C7D0DC" strokeWidth="1">
        <rect x="83" y="71" width="187" height="119" />
        <rect x="83" y="194" width="187" height="83" />
        <rect x="84" y="282" width="187" height="137" />
        <rect x="575" y="312" width="139" height="107" />
        <rect x="517" y="70" width="54" height="82" />
        <rect x="574" y="70" width="70" height="82" />
        <rect x="647" y="70" width="80" height="82" />
      </g>
      <g fill="none" stroke="#B5BFCA" strokeWidth="1.2">
        <path d="M83 128 H270" />
        <path d="M146 71 V190" />
        <path d="M209 71 V190" />
        <path d="M83 193 H270" />
        <path d="M145 194 V277" />
        <path d="M210 194 V277" />
        <path d="M84 280 H271" />
        <path d="M148 282 V419" />
        <path d="M211 282 V419" />
        <path d="M273 102 H511" />
        <path d="M330 47 V277" />
        <path d="M389 47 V277" />
        <path d="M445 67 V277" />
        <path d="M273 160 H512" />
        <path d="M273 226 H512" />
        <path d="M513 68 V308" />
        <path d="M573 68 V308" />
        <path d="M645 68 V308" />
        <path d="M513 153 H731" />
        <path d="M513 205 H743" />
        <path d="M513 253 H716" />
        <path d="M271 280 V420" />
        <path d="M426 280 V420" />
        <path d="M572 310 V420" />
        <path d="M716 309 V422" />
        <path d="M426 345 H716" />
        <path d="M531 345 V438" />
      </g>
      <g fill="none" stroke="#AEB9C7" strokeWidth="1">
        <path d="M112 128 A14 14 0 0 1 126 142" />
        <path d="M208 158 A14 14 0 0 0 222 172" />
        <path d="M330 126 A15 15 0 0 1 345 141" />
        <path d="M445 186 A15 15 0 0 1 460 201" />
        <path d="M573 119 A14 14 0 0 1 587 133" />
        <path d="M645 179 A14 14 0 0 0 659 193" />
        <path d="M426 318 A15 15 0 0 1 441 333" />
      </g>
      <g fill="none" stroke="#D2D9E2" strokeWidth="0.8">
        <rect x="95" y="84" width="38" height="18" />
        <rect x="158" y="84" width="38" height="18" />
        <rect x="221" y="84" width="36" height="18" />
        <rect x="95" y="212" width="37" height="17" />
        <rect x="160" y="212" width="37" height="17" />
        <rect x="221" y="212" width="35" height="17" />
        <rect x="291" y="116" width="42" height="18" />
        <rect x="349" y="116" width="42" height="18" />
        <rect x="407" y="116" width="39" height="18" />
        <rect x="291" y="181" width="42" height="18" />
        <rect x="349" y="181" width="42" height="18" />
        <rect x="590" y="83" width="42" height="20" />
        <rect x="662" y="83" width="48" height="20" />
        <rect x="291" y="303" width="48" height="26" />
        <rect x="354" y="303" width="48" height="26" />
        <rect x="450" y="361" width="55" height="27" />
        <rect x="589" y="361" width="51" height="27" />
      </g>
      <g fill="#98A2B3" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="middle">
        <text x="176" y="119">Training A</text>
        <text x="176" y="250">Training B</text>
        <text x="176" y="351">Lecture Room</text>
        <text x="361" y="148">Library</text>
        <text x="360" y="218">Common Area</text>
        <text x="544" y="137">Staff</text>
        <text x="609" y="137">Meeting</text>
        <text x="687" y="137">Office</text>
        <text x="645" y="396">Storage</text>
      </g>
      <path d="M300 203 H390 V148 H471 V198 H536 V254 H614 V328 H660" fill="none" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M300 203 H390 V148 H471 V198 H536 V254 H614 V328 H660" fill="none" stroke="#1672EA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <g fill="#FFFFFF" stroke="#1672EA" strokeWidth="2">
        <circle cx="390" cy="203" r="3.5" />
        <circle cx="471" cy="148" r="3.5" />
        <circle cx="536" cy="198" r="3.5" />
        <circle cx="614" cy="254" r="3.5" />
        <circle cx="614" cy="328" r="3.5" />
      </g>
      <g fill="#1672EA">
        <path d="M354 199 l8 4 -8 4 z" />
        <path d="M386 172 l4 -8 4 8 z" />
        <path d="M500 194 l8 4 -8 4 z" />
        <path d="M610 287 l4 8 4-8 z" />
      </g>
      {/* No-go / restricted zone */}
      <g>
        <title>Restricted Area · Robot entry disabled</title>
        <rect
          x={420}
          y={238}
          width={130}
          height={120}
          rx={6}
          fill="url(#l2NoGo)"
          stroke="#E5484D"
          strokeWidth={2}
        />
        <g transform="translate(485 298)">
          <rect x={-70} y={-15} width={140} height={30} rx={15} fill="#FFFFFF" stroke="#E5484D" strokeWidth={1.5} />
          <text x={0} y={4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#E5484D" fontFamily="Inter, sans-serif">
            Restricted Area
          </text>
        </g>
      </g>

      <RobotMapMarker x={660} y={328} />
    </svg>
  )
}
