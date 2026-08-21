import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import type {
  AlertItem,
  AlertSeverity,
  CleaningTask,
  MaintenanceItem,
  Robot,
  ToastMessage,
} from '../types'
import {
  initialAlerts,
  initialTasks,
  maintenanceItems,
  robots as initialRobots,
} from '../data/mockData'

interface AppContextValue {
  robots: Robot[]
  tasks: CleaningTask[]
  alerts: AlertItem[]
  maintenance: MaintenanceItem[]
  toasts: ToastMessage[]
  taskModalOpen: boolean
  taskModalRobotId?: string
  showToast: (
    tone: ToastMessage['tone'],
    title: string,
    description?: string,
  ) => void
  updateRobot: (id: string, patch: Partial<Robot>) => void
  addRobot: (robot: Robot) => void
  addTask: (task: CleaningTask) => void
  setTaskStatus: (id: string, status: CleaningTask['status']) => void
  addAlert: (
    title: string,
    robotId: string,
    severity: AlertSeverity,
    message: string,
  ) => void
  markAlertResolved: (id: string) => void
  markMaintenanceInspected: (id: string) => void
  openTaskModal: (robotId?: string) => void
  closeTaskModal: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

let toastId = 0

export function AppProvider({ children }: { children: ReactNode }) {
  const [robots, setRobots] = useState<Robot[]>(initialRobots)
  const [tasks, setTasks] = useState<CleaningTask[]>(initialTasks)
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts)
  const [maintenance, setMaintenance] =
    useState<MaintenanceItem[]>(maintenanceItems)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskModalRobotId, setTaskModalRobotId] = useState<string | undefined>(
    undefined,
  )

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

  const updateRobot = useCallback((id: string, patch: Partial<Robot>) => {
    setRobots((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const addRobot = useCallback((robot: Robot) => {
    setRobots((prev) => [robot, ...prev])
  }, [])

  const addTask = useCallback((task: CleaningTask) => {
    setTasks((prev) => [task, ...prev])
  }, [])

  const setTaskStatus = useCallback(
    (id: string, status: CleaningTask['status']) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t)),
      )
    },
    [],
  )

  const addAlert = useCallback(
    (
      title: string,
      robotId: string,
      severity: AlertSeverity,
      message: string,
    ) => {
      setAlerts((prev) => [
        {
          id: `A-${Date.now()}`,
          title,
          robotId,
          severity,
          message,
          time: 'Just now',
          action:
            severity === 'success'
              ? 'View Report'
              : severity === 'maintenance'
                ? 'View Maintenance'
                : 'View Robot',
        },
        ...prev,
      ])
    },
    [],
  )

  const markAlertResolved = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
    )
  }, [])

  const markMaintenanceInspected = useCallback((id: string) => {
    setMaintenance((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: 'Inspected' as const } : m,
      ),
    )
  }, [])

  const openTaskModal = useCallback((robotId?: string) => {
    setTaskModalRobotId(robotId)
    setTaskModalOpen(true)
  }, [])

  const closeTaskModal = useCallback(() => {
    setTaskModalOpen(false)
    setTaskModalRobotId(undefined)
  }, [])

  return (
    <AppContext.Provider
      value={{
        robots,
        tasks,
        alerts,
        maintenance,
        toasts,
        taskModalOpen,
        taskModalRobotId,
        showToast,
        updateRobot,
        addRobot,
        addTask,
        setTaskStatus,
        addAlert,
        markAlertResolved,
        markMaintenanceInspected,
        openTaskModal,
        closeTaskModal,
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
