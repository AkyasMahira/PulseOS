import { create } from 'zustand'
import type {
  SystemSnapshot, ContainerMetric, ServiceStatus, ProcessInfo, AlertEvent
} from '@pulseos/types'

interface MetricsStore {
  // Connection state
  connected: boolean
  setConnected: (v: boolean) => void

  // Live data
  snapshot: SystemSnapshot | null
  containers: ContainerMetric[]
  services: ServiceStatus[]
  processes: ProcessInfo[]
  alerts: AlertEvent[]

  // CPU/Mem/Net history (last 60 points)
  cpuHistory: number[]
  memHistory: number[]
  netRxHistory: number[]
  netTxHistory: number[]

  // Actions
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

// Auth store
interface AuthStore {
  token: string | null
  username: string | null
  setAuth: (token: string, username: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: typeof localStorage !== 'undefined' ? localStorage.getItem('pulse_token') : null,
  username: typeof localStorage !== 'undefined' ? localStorage.getItem('pulse_user') : null,

  setAuth: (token, username) => {
    localStorage.setItem('pulse_token', token)
    localStorage.setItem('pulse_user', username)
    set({ token, username })
  },

  clearAuth: () => {
    localStorage.removeItem('pulse_token')
    localStorage.removeItem('pulse_user')
    set({ token: null, username: null })
  },
}))
