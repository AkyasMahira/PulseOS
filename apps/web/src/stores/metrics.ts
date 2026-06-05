import { create } from 'zustand'
import type {
  SystemSnapshot, ContainerMetric, ServiceStatus, ProcessInfo, AlertEvent, PageId, UserRole
} from '@pulseos/types'

interface MetricsStore {
  connected: boolean
  setConnected: (v: boolean) => void

  snapshot: SystemSnapshot | null
  containers: ContainerMetric[]
  services: ServiceStatus[]
  processes: ProcessInfo[]
  alerts: AlertEvent[]

  cpuHistory: number[]
  memHistory: number[]
  netRxHistory: number[]
  netTxHistory: number[]

  // Navigation
  currentPage: PageId
  setPage: (p: PageId) => void

  setSnapshot: (s: SystemSnapshot) => void
  setContainers: (c: ContainerMetric[]) => void
  setServices: (s: ServiceStatus[]) => void
  setProcesses: (p: ProcessInfo[]) => void
  addAlert: (a: AlertEvent) => void
}

const MAX_HISTORY = 60

function pushHistory(arr: number[], val: number): number[] {
  const next = [...arr, val]
  return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
}

export const useMetricsStore = create<MetricsStore>((set) => ({
  connected: false,
  setConnected: (v) => set({ connected: v }),

  snapshot: null,
  containers: [],
  services: [],
  processes: [],
  alerts: [],

  cpuHistory: [],
  memHistory: [],
  netRxHistory: [],
  netTxHistory: [],

  currentPage: 'overview',
  setPage: (p) => set({ currentPage: p }),

  setSnapshot: (snapshot) =>
    set((s) => ({
      snapshot,
      cpuHistory: pushHistory(s.cpuHistory, snapshot.cpu.usage),
      memHistory: pushHistory(s.memHistory, snapshot.mem.usagePercent),
      netRxHistory: pushHistory(s.netRxHistory, snapshot.net.reduce((a, n) => a + n.rxBytes, 0)),
      netTxHistory: pushHistory(s.netTxHistory, snapshot.net.reduce((a, n) => a + n.txBytes, 0)),
    })),

  setContainers: (containers) => set({ containers }),
  setServices: (services) => set({ services }),
  setProcesses: (processes) => set({ processes }),

  addAlert: (alert) =>
    set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 100) })),
}))

interface AuthStore {
  token: string | null
  username: string | null
  role: UserRole | null
  setAuth: (token: string, username: string, role?: UserRole) => void
  clearAuth: () => void
}

function decodeRoleFromToken(token: string): UserRole | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role ?? null
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: typeof localStorage !== 'undefined' ? localStorage.getItem('pulse_token') : null,
  username: typeof localStorage !== 'undefined' ? localStorage.getItem('pulse_user') : null,
  role: typeof localStorage !== 'undefined' ? (localStorage.getItem('pulse_role') as UserRole | null) : null,

  setAuth: (token, username, role) => {
    const resolvedRole = role ?? decodeRoleFromToken(token)
    localStorage.setItem('pulse_token', token)
    localStorage.setItem('pulse_user', username)
    if (resolvedRole) localStorage.setItem('pulse_role', resolvedRole)
    set({ token, username, role: resolvedRole })
  },

  clearAuth: () => {
    localStorage.removeItem('pulse_token')
    localStorage.removeItem('pulse_user')
    localStorage.removeItem('pulse_role')
    set({ token: null, username: null, role: null })
  },
}))
