import { useEffect, useState } from 'react'
import type { LiveTelemetry, LidarScan, SimulatorCommandResult, SimulationMap, DashboardMetrics } from '../types'

const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://127.0.0.1:8000'

/* ===== API response shapes (match the FastAPI backend) ===== */

export interface ApiRobot {
  id: string
  name: string
  model?: string
  status?: string
  location?: string
}

export interface ApiCleaningEvent {
  id?: string
  type?: string
  location?: string
  description?: string
  response?: string
  handled_automatically?: boolean
  created_at?: string
  robot_id?: string
}

export interface ApiNotification {
  id?: string
  message?: string
  read?: boolean
  created_at?: string
  robot_id?: string
}

export interface DashboardOverview {
  robots: ApiRobot[]
  recent_cleaning_events: ApiCleaningEvent[]
  active_notifications: ApiNotification[]
}

export interface ApiSituation {
  robot: {
    id: string
    name: string
    model?: string
    status?: string
  }
  current_situation: {
    location?: string
    floor_condition?: string
    nearby_obstacle?: string
    restricted_area?: string
    response?: string
  }
  detections: ApiCleaningEvent[]
  decisions: { action: string; reason?: string; created_at?: string; location?: string; response?: string }[]
}

/* ===== Authentication ===== */

const TOKEN_KEY = 'sb-ktfsycaqcqrznqjkmtwa-auth-token'

export interface AuthUser {
  id: string
  email: string
}

export interface CurrentUser {
  id: string
  name: string
  email: string
  avatar_url: string | null
}

export interface RegisterResponse {
  user: { id: string; email: string; name: string }
}

export function getSupabaseToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { access_token?: unknown }
    return typeof parsed.access_token === 'string' ? parsed.access_token : null
  } catch {
    return null
  }
}

export function setSupabaseToken(accessToken: string): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ access_token: accessToken }))
}

export function clearSupabaseToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isLoggedIn(): boolean {
  return getSupabaseToken() !== null
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Login failed (${res.status})`)
  }
  const data = await res.json() as { access_token: string; user: AuthUser }
  setSupabaseToken(data.access_token)
  return data.user
}

export async function registerUser(input: {
  name: string
  email: string
  password: string
}): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { detail?: string }
    throw new Error(body.detail ?? `Registration failed (${res.status})`)
  }
  return await res.json() as RegisterResponse
}

export function logoutUser(): void {
  clearSupabaseToken()
}

/* ===== Auth-error callback ===== */

let _onAuthError: (() => void) | null = null

/** Register a callback invoked when any API call gets a 401. */
export function setOnAuthError(cb: (() => void) | null): void {
  _onAuthError = cb
}

function handleAuthError(): void {
  clearSupabaseToken()
  _onAuthError?.()
}

function authHeaders(): Record<string, string> {
  const token = getSupabaseToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/* ===== Low level fetch ===== */

async function authenticatedRequest<T>(
  path: string,
  init: RequestInit = {},
  clearSessionOnUnauthorized = true,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    if (res.status === 401 && clearSessionOnUnauthorized) {
      handleAuthError()
      throw new Error('Authentication required – please log in again.')
    }
    const body = await res.json().catch(() => ({})) as { detail?: string }
    throw new Error(body.detail ?? `Request failed (${res.status})`)
  }
  return (await res.json()) as T
}

async function getJson<T>(path: string): Promise<T> {
  return authenticatedRequest<T>(path)
}

async function postJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) {
    if (res.status === 401) {
      handleAuthError()
      throw new Error('Authentication required – please log in again.')
    }
    throw new Error(`Request failed (${res.status})`)
  }
  return (await res.json()) as T
}

export function getCurrentProfile(): Promise<CurrentUser> {
  return getJson<CurrentUser>('/auth/me')
}

export function updateProfile(name: string): Promise<CurrentUser> {
  return authenticatedRequest<CurrentUser>('/auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export function uploadAvatar(file: File): Promise<{ avatar_url: string }> {
  const form = new FormData()
  form.append('file', file)
  return authenticatedRequest<{ avatar_url: string }>('/auth/me/avatar', {
    method: 'POST',
    body: form,
  })
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: true }> {
  return authenticatedRequest<{ success: true }>(
    '/auth/password',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    },
    false,
  )
}

/* ===== Public API ===== */

export function getDashboardOverview(): Promise<DashboardOverview> {
  return getJson<DashboardOverview>('/dashboard/overview')
}

export function getDashboardMetrics(): Promise<DashboardMetrics> {
  return getJson<DashboardMetrics>('/dashboard/metrics')
}

export function getRobotSituation(
  robotId: string | number,
): Promise<ApiSituation> {
  return getJson<ApiSituation>(`/robots/${robotId}/situation`)
}

/* ===== Simulator-backed live telemetry ===== */

export function getRobotLive(robotId: string): Promise<LiveTelemetry> {
  return getJson<LiveTelemetry>(`/robots/${robotId}/live`)
}

export function getRobotLidar(
  robotId: string,
  downsample = 1,
): Promise<LidarScan> {
  return getJson<LidarScan>(
    `/robots/${robotId}/lidar?downsample=${downsample}`,
  )
}

export function startRobot(robotId: string): Promise<SimulatorCommandResult> {
  return postJson<SimulatorCommandResult>(`/robots/${robotId}/start`)
}

export function stopRobot(robotId: string): Promise<SimulatorCommandResult> {
  return postJson<SimulatorCommandResult>(`/robots/${robotId}/stop`)
}

export function resetRobot(robotId: string): Promise<SimulatorCommandResult> {
  return postJson<SimulatorCommandResult>(`/robots/${robotId}/reset`)
}

export function getRobotSimMap(robotId: string): Promise<SimulationMap> {
  return getJson<SimulationMap>(`/robots/${robotId}/sim-map`)
}

export function getRobots(): Promise<ApiRobot[]> {
  return getJson<ApiRobot[]>('/robots')
}

export interface SimulatorRobot {
  robot_id: string | null
  available: boolean
}

export function getSimulatorRobot(): Promise<SimulatorRobot> {
  return getJson<SimulatorRobot>('/robots/simulator')
}

export function getNotifications(): Promise<ApiNotification[]> {
  return getJson<ApiNotification[]>('/notifications')
}

export async function markNotificationRead(notificationId: string): Promise<{ id: string; read: boolean }> {
  return postJson<{ id: string; read: boolean }>(`/notifications/${notificationId}/read`)
}

export interface CleaningJob {
  id: string
  robot_id: string
  robot_name: string
  floor: string
  zone: string
  status: string
  progress: number
  started_at: string | null
  completed_at: string | null
  coverage: number | null
  detected_events: unknown[]
}

export function getCleaningJobs(): Promise<CleaningJob[]> {
  return getJson<CleaningJob[]>('/cleaning/jobs')
}

export interface CleaningJobDetail {
  id: string
  robot: string
  floor: string | null
  zone: string | null
  status: string
  progress: number | null
  coverage: number | null
  path: string | null
  detected_events: string[]
  started_at: string | null
  completed_at: string | null
}

export function getCleaningJobDetail(jobId: string): Promise<CleaningJobDetail> {
  return getJson<CleaningJobDetail>(`/cleaning/jobs/${jobId}`)
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

export function usePolling<T>(
  fn: () => Promise<T>,
  intervalMs: number,
  deps: unknown[] = [],
): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setInterval> | null = null

    // Skip polling if deps indicate the request can't proceed
    // (e.g. null robot ID)
    if (deps.some((d) => d === null || d === undefined || d === '')) {
      setLoading(false)
      return () => { active = false }
    }

    const poll = () => {
      setLoading(true)
      fn()
        .then((result) => {
          if (active) {
            setData(result)
            setLoading(false)
            setError(null)
          }
        })
        .catch((err: unknown) => {
          if (active) {
            setError(err instanceof Error ? err.message : 'Failed to load data')
            setLoading(false)
          }
        })
    }

    poll()
    timer = setInterval(poll, intervalMs)

    return () => {
      active = false
      if (timer) clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}
