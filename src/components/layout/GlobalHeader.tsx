import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  LogOut,
  Play,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getNotifications, getSimulatorRobot, useApi, usePolling } from '../../services/api'

function formatNotifTime(iso: string | undefined): string {
  if (!iso) return 'Recently'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Recently'
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function GlobalHeader({ onLogout }: { onLogout?: () => void }) {
  const { robots, openStartCleaningModal, currentUser, signOut } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const { data: notifications } = usePolling(getNotifications, 5000, [])
  const { data: simInfo } = useApi(getSimulatorRobot, [])

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0

  const simulatorRobotId = simInfo?.available ? simInfo.robot_id : null
  const simulatorRobot = simulatorRobotId
    ? robots.find((r) => r.id === simulatorRobotId) ?? null
    : null

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) navigate(`/robots?q=${encodeURIComponent(query.trim())}`)
  }

  const handleStartCleaning = () => {
    openStartCleaningModal(simulatorRobot?.id)
  }

  return (
    <header className="sticky top-0 z-40 flex h-[68px] shrink-0 items-center gap-4 border-b border-line bg-white/95 px-7 backdrop-blur">
      {/* Search */}
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
        {/* Start Cleaning */}
        <button
          type="button"
          onClick={handleStartCleaning}
          disabled={!simulatorRobot}
          className="flex h-10 items-center gap-2 rounded-[10px] bg-brand px-4 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={15} className="fill-current" />
          <span className="hidden sm:inline">Start Cleaning</span>
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => { setNotifOpen((o) => !o); setProfileOpen(false) }}
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-white text-ink-secondary transition-colors hover:bg-app focus-visible:outline-brand"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white ring-2 ring-white">
                {unreadCount}
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
                {(!notifications || notifications.length === 0) && (
                  <p className="px-4 py-8 text-center text-[13px] text-ink-muted">
                    No notifications
                  </p>
                )}
                {(notifications ?? []).slice(0, 5).map((n) => {
                  const Icon = n.read ? Bell : CheckCircle2
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        setNotifOpen(false)
                        if (n.robot_id) navigate(`/robots/${n.robot_id}`)
                        else navigate('/alerts')
                      }}
                      className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-app"
                    >
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          n.read
                            ? 'bg-idle-pale text-ink-muted'
                            : 'bg-brand-pale text-brand'
                        }`}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-[13px] font-semibold ${n.read ? 'text-ink-secondary' : 'text-ink'}`}>
                          {n.message || 'Notification'}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {formatNotifTime(n.created_at)}
                        </span>
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

        {/* Account menu */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            aria-label="Open account menu"
            aria-expanded={profileOpen}
            onClick={() => { setProfileOpen((open) => !open); setNotifOpen(false) }}
            className="flex h-10 items-center gap-2 rounded-[10px] border border-line bg-white pl-1.5 pr-2.5 text-ink-secondary transition-colors hover:bg-app focus-visible:outline-brand"
          >
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-brand-pale text-[10px] font-bold text-brand">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : currentUser ? (
                getInitials(currentUser.name)
              ) : (
                <User size={14} />
              )}
            </span>
            <ChevronDown size={14} />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-card-hover animate-fade-in">
              {currentUser && (
                <div className="border-b border-line px-3 py-2">
                  <p className="truncate text-[13px] font-semibold text-ink">{currentUser.name}</p>
                  <p className="truncate text-[11px] text-ink-muted">{currentUser.email}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => { setProfileOpen(false); navigate('/account') }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink-secondary hover:bg-app hover:text-ink"
              >
                <Settings size={15} />
                Account Settings
              </button>
              <button
                type="button"
                onClick={() => { signOut(); setProfileOpen(false); onLogout?.() }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-ink-secondary hover:bg-app hover:text-ink"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'U'
}
