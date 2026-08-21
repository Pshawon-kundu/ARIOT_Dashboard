import { NavLink } from 'react-router-dom'
import {
  Bell,
  Bot,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  LayoutDashboard,
  Sparkles,
  User,
} from 'lucide-react'
import { RobotVisual } from '../robots/RobotVisual'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/robots', label: 'Robots', icon: Bot, end: false },
  { to: '/cleaning', label: 'Cleaning', icon: Sparkles, end: false },
  { to: '/reports', label: 'Reports', icon: ChartNoAxesColumnIncreasing, end: false },
  { to: '/alerts', label: 'Alerts', icon: Bell, end: false },
]

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[224px] flex-col border-r border-line bg-white">
      {/* Brand */}
      <div className="px-5 pb-5 pt-6">
        <img
          src="/assets/ariot-logo.png"
          alt="ARIOT Technologies"
          className="h-[46px] w-auto object-contain"
          draggable={false}
        />
        <p className="mt-2.5 text-[10.5px] font-medium tracking-wide text-ink-muted">
          Facility Management
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 pt-2">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Menu
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-brand-pale font-semibold text-brand-dark'
                  : 'text-ink-secondary hover:bg-idle-pale hover:text-ink'
              }`
            }
          >
            <item.icon size={19} strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Promo card */}
      <div className="mx-3 mb-3 mt-4 overflow-hidden rounded-2xl border border-brand/10 bg-gradient-to-br from-brand-pale via-white to-white px-4 pb-3 pt-4">
        <div className="flex justify-center">
          <RobotVisual size={76} />
        </div>
        <p className="mt-1 text-center text-[13px] font-bold text-brand-dark">
          Smart cleaning.
        </p>
        <p className="text-center text-[13px] font-semibold text-brand">
          Better facilities.
        </p>
      </div>

      {/* User profile */}
      <div className="border-t border-line px-4 py-4">
        <button className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-idle-pale">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-idle-pale text-ink-secondary">
            <User size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold leading-tight text-ink">
              Facility Manager
            </span>
            <span className="block text-xs text-ink-muted">Admin</span>
          </span>
          <ChevronDown size={15} className="shrink-0 text-ink-muted" />
        </button>
      </div>
    </aside>
  )
}
