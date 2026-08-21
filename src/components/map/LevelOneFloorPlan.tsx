import { RobotMapMarker } from './RobotMapMarker'

export function LevelOneFloorPlan() {
  return (
    <svg viewBox="0 0 820 500" className="block h-auto w-full select-none" role="img" aria-label="Level 1 facility floor plan">
      <defs>
        <pattern id="l1Unclean" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="#FFFFFF" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="#D9E1EB" strokeWidth="1" />
        </pattern>
        <pattern id="l1Clean" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#DDF5E8" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#C8EBD8" strokeWidth="0.8" />
        </pattern>
        <pattern id="l1NoGo" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="9" height="9" fill="#FDECEC" />
          <line x1="0" y1="0" x2="0" y2="9" stroke="#E5484D" strokeWidth="1.1" />
        </pattern>
      </defs>
      <rect width="820" height="500" fill="#FFFFFF" />
      <path d="M83 52 H215 V75 H274 V43 H442 V66 H727 V132 H703 V179 H741 V269 H707 V315 H678 V421 H518 V392 H440 V426 H282 V398 H217 V431 H88 V360 H64 V279 H87 V210 H57 V115 H83 Z" fill="#FCFDFE" stroke="#AEB9C7" strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 117 H88 V55 H211 V78 H270 V142 H250 V208 H193 V248 H84 V210 H60 Z" fill="url(#l1Clean)" stroke="#A0DEBF" strokeWidth="1.25">
        <title>Lobby · Cleaned · Completed at 9:42 AM</title>
      </path>
      <path d="M194 251 H255 V220 H343 V278 H438 V394 H401 V422 H284 V392 H216 V356 H194 Z" fill="url(#l1Clean)" stroke="#A0DEBF" strokeWidth="1.25">
        <title>West offices · Cleaned · Completed at 10:15 AM</title>
      </path>
      <path d="M278 47 H439 V69 H507 V192 H474 V262 H437 V277 H345 V218 H278 Z" fill="#DCEBFF" fillOpacity="0.82" stroke="#9FC7FF" strokeWidth="1.4">
        <title>East Wing · Cleaning now · 68% complete</title>
      </path>
      <path d="M509 194 H701 V182 H737 V267 H704 V313 H674 V391 H585 V357 H516 V317 H474 V263 H509 Z" fill="#DCEBFF" fillOpacity="0.82" stroke="#9FC7FF" strokeWidth="1.4">
        <title>Service area · Cleaning now</title>
      </path>
      <g fill="url(#l1Unclean)" stroke="#C7D0DC" strokeWidth="1">
        <rect x="91" y="284" width="98" height="67" />
        <rect x="91" y="354" width="101" height="73" />
        <rect x="520" y="72" width="73" height="63" />
        <rect x="596" y="72" width="73" height="63" />
        <rect x="672" y="72" width="53" height="63" />
        <rect x="519" y="139" width="93" height="49" />
        <rect x="615" y="139" width="87" height="49" />
        <rect x="589" y="271" width="87" height="44" />
        <rect x="519" y="360" width="63" height="59" />
        <rect x="585" y="394" width="89" height="25" />
      </g>
      <g fill="none" stroke="#B5BFCA" strokeWidth="1.2">
        <path d="M89 55 V112 H148 V55" />
        <path d="M149 55 V112 H211" />
        <path d="M89 113 H217" />
        <path d="M120 113 V164" />
        <path d="M164 113 V165" />
        <path d="M84 165 H250" />
        <path d="M84 210 H193" />
        <path d="M279 47 V102 H337" />
        <path d="M338 47 V140" />
        <path d="M393 47 V140" />
        <path d="M279 140 H474" />
        <path d="M344 140 V218" />
        <path d="M395 140 V218" />
        <path d="M445 68 V192" />
        <path d="M508 69 V192" />
        <path d="M594 69 V190" />
        <path d="M670 69 V190" />
        <path d="M508 137 H727" />
        <path d="M87 250 H193" />
        <path d="M87 281 H193" />
        <path d="M87 353 H216" />
        <path d="M139 281 V353" />
        <path d="M193 250 V391" />
        <path d="M256 219 V391" />
        <path d="M280 278 H438" />
        <path d="M344 278 V421" />
        <path d="M400 278 V421" />
        <path d="M438 278 V391" />
        <path d="M474 262 V390" />
        <path d="M516 262 V420" />
        <path d="M583 317 V420" />
        <path d="M675 315 V421" />
        <path d="M516 357 H675" />
        <path d="M584 392 H675" />
        <path d="M193 249 H256" />
        <path d="M438 262 H516" />
        <path d="M438 317 H516" />
      </g>
      <g fill="none" stroke="#AEB9C7" strokeWidth="1">
        <path d="M117 113 A14 14 0 0 1 131 127" />
        <path d="M218 145 A15 15 0 0 0 233 160" />
        <path d="M344 173 A15 15 0 0 1 359 188" />
        <path d="M508 111 A15 15 0 0 1 523 126" />
        <path d="M594 153 A14 14 0 0 0 608 167" />
        <path d="M256 312 A15 15 0 0 1 271 327" />
        <path d="M438 339 A15 15 0 0 1 453 354" />
      </g>
      <g fill="none" stroke="#D2D9E2" strokeWidth="0.8">
        <rect x="100" y="66" width="34" height="17" />
        <rect x="166" y="65" width="33" height="18" />
        <rect x="296" y="62" width="28" height="12" />
        <rect x="349" y="62" width="29" height="12" />
        <rect x="403" y="84" width="27" height="14" />
        <rect x="530" y="86" width="52" height="24" />
        <rect x="605" y="86" width="52" height="24" />
        <rect x="101" y="301" width="73" height="34" />
        <rect x="101" y="372" width="73" height="35" />
        <rect x="277" y="302" width="50" height="28" />
        <rect x="357" y="302" width="58" height="28" />
        <rect x="529" y="372" width="38" height="29" />
      </g>
      <g fill="#98A2B3" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="middle">
        <text x="143" y="102">Lobby</text>
        <text x="366" y="127">Meeting</text>
        <text x="557" y="126">Office</text>
        <text x="635" y="126">Office</text>
        <text x="698" y="126">Service</text>
        <text x="139" y="336">Utility</text>
        <text x="631" y="304">Storage</text>
        <text x="630" y="409">Dock</text>
      </g>
      <path d="M104 143 H235 V108 H297 V174 H353 V239 H456 V289 H536 V322 H611" fill="none" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M104 143 H235 V108 H297 V174 H353 V239 H456 V289 H536 V322 H611" fill="none" stroke="#1672EA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <g fill="#FFFFFF" stroke="#1672EA" strokeWidth="2">
        <circle cx="235" cy="143" r="3.5" />
        <circle cx="297" cy="174" r="3.5" />
        <circle cx="353" cy="239" r="3.5" />
        <circle cx="456" cy="289" r="3.5" />
        <circle cx="536" cy="322" r="3.5" />
      </g>
      <g fill="#1672EA">
        <path d="M203 139 l8 4 -8 4 z" />
        <path d="M293 151 l4 8 4-8 z" />
        <path d="M407 235 l8 4 -8 4 z" />
        <path d="M499 285 l8 4 -8 4 z" />
      </g>
      {/* No-go / restricted zone */}
      <g>
        <title>Storage · Restricted Area · Robot entry disabled</title>
        <rect
          x={254}
          y={234}
          width={148}
          height={140}
          rx={6}
          fill="url(#l1NoGo)"
          stroke="#E5484D"
          strokeWidth={2}
        />
        <g transform="translate(328 300)">
          <rect x={-62} y={-15} width={124} height={30} rx={15} fill="#FFFFFF" stroke="#E5484D" strokeWidth={1.5} />
          <text x={0} y={4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#E5484D" fontFamily="Inter, sans-serif">
            No-Go Zone
          </text>
        </g>
      </g>

      <RobotMapMarker x={611} y={322} />
    </svg>
  )
}
