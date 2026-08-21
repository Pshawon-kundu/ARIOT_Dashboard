import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  MapPin,
  Play,
  Search,
  TriangleAlert,
  Wrench,
  X,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

const facilities = ['Main Facility', 'Building A', 'Building B']

const notificationIcon: Record<string, typeof Bell> = {
  warning: TriangleAlert,
  maintenance: Wrench,
  success: CheckCircle2,
  info: Bell,
}

export function GlobalHeader() {
  const { openTaskModal, alerts } = useApp()
  const navigate = useNavigate()
  const [facility, setFacility] = useState(facilities[0])
  const [facilityOpen, setFacilityOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [query, setQuery] = useState('')
  const facilityRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const unread = alerts.filter((a) => !a.resolved).length

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (facilityRef.current && !facilityRef.current.contains(e.target as Node))
        setFacilityOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) navigate(`/robots?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="sticky top-0 z-40 flex h-[68px] shrink-0 items-center gap-4 border-b border-line bg-white/95 px-7 backdrop-blur">
      {/* Facility selector */}
      <div ref={facilityRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setFacilityOpen((o) => !o)}
          aria-label="Select facility"
          className="flex h-10 items-center gap-2.5 rounded-[10px] border border-line bg-white px-3 text-sm font-semibold text-ink transition-colors hover:bg-app focus-visible:outline-brand"
        >
          <Building2 size={17} className="text-brand" />
          <span className="hidden md:inline">{facility}</span>
          <ChevronDown size={15} className="text-ink-muted" />
        </button>
        {facilityOpen && (
          <div className="absolute left-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-card-hover animate-fade-in">
            <p className="px-3.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Facilities
            </p>
            {facilities.map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFacility(f)
                  setFacilityOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13.5px] font-medium transition-colors hover:bg-app ${
                  f === facility ? 'text-brand' : 'text-ink'
                }`}
              >
                <MapPin size={15} className={f === facility ? 'text-brand' : 'text-ink-muted'} />
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Global search */}
      <form onSubmit={handleSearch} className="relative flex-1 max-w-[460px]">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search robots, rooms, or alerts..."
          aria-label="Search"
          className="h-10 w-full rounded-[10px] border border-line bg-app pl-10 pr-3 text-sm text-ink shadow-card placeholder:text-ink-muted focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </form>

      <div className="ml-auto flex items-center gap-2.5">
        {/* Primary global action */}
        <button
          type="button"
          onClick={() => openTaskModal()}
          className="flex h-10 items-center gap-2 rounded-[10px] bg-brand px-4 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark focus-visible:outline-brand"
        >
          <Play size={15} className="fill-current" />
          <span className="hidden sm:inline">Start Cleaning</span>
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-white text-ink-secondary transition-colors hover:bg-app focus-visible:outline-brand"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white ring-2 ring-white">
                {unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-card-hover animate-fade-in">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-[14px] font-bold text-ink">Notifications</p>
                <button
                  onClick={() => setNotifOpen(false)}
                  aria-label="Close notifications"
                  className="rounded-md p-1 text-ink-muted hover:bg-app"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="max-h-[320px] divide-y divide-line/80 overflow-y-auto scrollbar-thin">
                {alerts.slice(0, 5).map((a) => {
                  const Icon = notificationIcon[a.severity] ?? Bell
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setNotifOpen(false)
                        navigate(
                          a.action === 'View Report'
                            ? '/reports'
                            : `/robots/${a.robotId}`,
                        )
                      }}
                      className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-app"
                    >
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          a.severity === 'success'
                            ? 'bg-success-pale text-success'
                            : a.severity === 'maintenance'
                              ? 'bg-warning-pale text-warning'
                              : a.severity === 'info'
                                ? 'bg-brand-pale text-brand'
                                : 'bg-danger-pale text-danger'
                        }`}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-ink">
                          {a.title}
                        </span>
                        <span className="block text-xs text-ink-muted">{a.time}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => {
                  setNotifOpen(false)
                  navigate('/alerts')
                }}
                className="flex w-full items-center justify-center gap-1 border-t border-line py-3 text-[13px] font-semibold text-brand transition-colors hover:bg-app"
              >
                View all alerts
              </button>
            </div>
          )}
        </div>

        {/* Help */}
        <button
          type="button"
          aria-label="Help"
          title="Help"
          className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-white text-ink-secondary transition-colors hover:bg-app focus-visible:outline-brand"
        >
          <HelpCircle size={18} />
        </button>
      </div>
    </header>
  )
}
