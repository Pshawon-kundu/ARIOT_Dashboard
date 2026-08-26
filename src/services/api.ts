import { useEffect, useState } from 'react'

const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://127.0.0.1:8000'

/* ===== API response shapes (match the FastAPI backend) ===== */

export interface ApiRobot {
  id: number
  name: string
  model?: string
  status?: string
  location?: string
}

export interface ApiCleaningEvent {
  id?: number
  type?: string
  location?: string
  description?: string
  response?: string
  handled_automatically?: boolean
  created_at?: string
  robot_id?: number
}

export interface ApiNotification {
  id?: number
  message?: string
  read?: boolean
  created_at?: string
  robot_id?: number
}

export interface DashboardOverview {
  robots: ApiRobot[]
  recent_cleaning_events: ApiCleaningEvent[]
  active_notifications: ApiNotification[]
}

export interface ApiSituation {
  robot: {
    id: number
    name: string
    model?: string
    status?: string
  }
  current_situation: {
    location?: string
    floor_condition?: string
    nearby_obstacle?: string
    restricted_area?: string
  }
  detections: ApiCleaningEvent[]
  decisions: { action: string; reason?: string }[]
}

/* ===== Low level fetch ===== */

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`)
  }
  return (await res.json()) as T
}

/* ===== Public API ===== */

export function getDashboardOverview(): Promise<DashboardOverview> {
  return getJson<DashboardOverview>('/dashboard/overview')
}

export function getRobotSituation(
  robotId: string | number,
): Promise<ApiSituation> {
  return getJson<ApiSituation>(`/robots/${robotId}/situation`)
}

/* ===== Hook for loading / error / empty handling ===== */

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    fn()
      .then((result) => {
        if (active) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load data')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}
