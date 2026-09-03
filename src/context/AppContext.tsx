import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Robot, ToastMessage } from '../types'
import { getCurrentProfile, getRobots, logoutUser, type CurrentUser } from '../services/api'

interface AppContextValue {
  robots: Robot[]
  currentUser: CurrentUser | null
  profileLoading: boolean
  refreshCurrentUser: () => Promise<void>
  signOut: () => void
  toasts: ToastMessage[]
  startCleaningModalOpen: boolean
  startCleaningModalRobotId?: string
  showToast: (
    tone: ToastMessage['tone'],
    title: string,
    description?: string,
  ) => void
  openStartCleaningModal: (robotId?: string) => void
  closeStartCleaningModal: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

let toastId = 0

export function AppProvider({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const [robots, setRobots] = useState<Robot[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [startCleaningModalOpen, setStartCleaningModalOpen] = useState(false)
  const [startCleaningModalRobotId, setStartCleaningModalRobotId] = useState<string | undefined>(
    undefined,
  )

  const refreshCurrentUser = useCallback(async () => {
    setProfileLoading(true)
    try {
      setCurrentUser(await getCurrentProfile())
    } catch {
      setCurrentUser(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshCurrentUser()
  }, [refreshCurrentUser])

  useEffect(() => {
    if (profileLoading || !currentUser) {
      setRobots([])
      return
    }
    let active = true
    getRobots()
      .then((apiRobots) => {
        if (!active) return
        const mapped: Robot[] = apiRobots.map((r) => ({
          id: String(r.id),
          name: r.name,
          model: r.model,
          status: r.status,
          location: r.location,
        }))
        setRobots(mapped)
      })
      .catch(() => {
        if (active) setRobots([])
      })
    return () => { active = false }
  }, [currentUser, profileLoading])

  const showToast = useCallback(
    (tone: ToastMessage['tone'], title: string, description?: string) => {
      const id = ++toastId
      setToasts((prev) => [...prev, { id, tone, title, description }])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4200)
    },
    [],
  )

  const openStartCleaningModal = useCallback((robotId?: string) => {
    setStartCleaningModalRobotId(robotId)
    setStartCleaningModalOpen(true)
  }, [])

  const closeStartCleaningModal = useCallback(() => {
    setStartCleaningModalOpen(false)
    setStartCleaningModalRobotId(undefined)
  }, [])

  const signOut = useCallback(() => {
    logoutUser()
    setCurrentUser(null)
    onLogout?.()
  }, [onLogout])

  return (
    <AppContext.Provider
      value={{
        robots,
        currentUser,
        profileLoading,
        refreshCurrentUser,
        signOut,
        toasts,
        startCleaningModalOpen,
        startCleaningModalRobotId,
        showToast,
        openStartCleaningModal,
        closeStartCleaningModal,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider')
  }
  return ctx
}
