// System Metrics
export interface CpuMetric {
  usage: number        // 0-100 percent
  loadAvg: [number, number, number]  // 1m, 5m, 15m
  cores: number
  model: string
  speed: number        // MHz
}

export interface MemMetric {
  total: number        // bytes
  used: number
  free: number
  cached: number
  buffers: number
  usagePercent: number
}

export interface DiskMetric {
  device: string
  mountpoint: string
  total: number        // bytes
  used: number
  free: number
  usagePercent: number
}

export interface NetMetric {
  interface: string
  rxBytes: number      // bytes/s current rate
  txBytes: number
  rxTotal: number      // total bytes ever
  txTotal: number
}

export interface SystemSnapshot {
  timestamp: number
  uptime: number       // seconds
  hostname: string
  cpu: CpuMetric
  mem: MemMetric
  disks: DiskMetric[]
  net: NetMetric[]
}

// Docker / Container
export interface ContainerMetric {
  id: string
  name: string
  image: string
  status: 'running' | 'exited' | 'paused' | 'restarting' | 'dead'
  state: string
  cpuPercent: number
  memUsed: number      // bytes
  memLimit: number
  memPercent: number
  rxBytes: number
  txBytes: number
  restartCount: number
  startedAt: string
}

// Services
export interface ServiceStatus {
  name: string
  type: 'systemd' | 'pm2' | 'docker' | 'custom'
  status: 'online' | 'offline' | 'warning'
  uptime?: number      // seconds
  restartCount?: number
  pid?: number
  cpu?: number
  mem?: number
}

// Process
export interface ProcessInfo {
  pid: number
  name: string
  command: string
  cpu: number          // percent
  mem: number          // bytes
  status: string
}

// Alert
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertChannel = 'telegram' | 'discord' | 'email'

export interface AlertRule {
  id: string
  name: string
  metric: 'cpu' | 'mem' | 'disk' | 'net' | 'service'
  condition: 'gt' | 'lt' | 'eq'
  threshold: number
  severity: AlertSeverity
  channels: AlertChannel[]
  cooldownSecs: number
  enabled: boolean
}

export interface AlertEvent {
  id: string
  ruleId: string
  ruleName: string
  severity: AlertSeverity
  message: string
  value: number
  threshold: number
  firedAt: number
  resolvedAt?: number
}

// WebSocket Events
export interface WsServerToClient {
  'metrics:snapshot': SystemSnapshot
  'metrics:containers': ContainerMetric[]
  'metrics:services': ServiceStatus[]
  'metrics:processes': ProcessInfo[]
  'alert:fired': AlertEvent
  'alert:resolved': AlertEvent
}

export interface WsClientToServer {
  'subscribe': { channels: Array<keyof WsServerToClient> }
  'unsubscribe': { channels: Array<keyof WsServerToClient> }
}

// API responses
export interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: string
}

export interface HistoryQuery {
  metric: 'cpu' | 'mem' | 'disk' | 'net'
  from: number
  to: number
  resolution?: 'raw' | '1m' | '5m' | '1h'
}

export interface HistoryPoint {
  t: number
  v: number
}

// Docker container actions
export type ContainerAction = 'start' | 'stop' | 'restart' | 'remove'

export interface DockerActionRequest {
  containerId: string
  action: ContainerAction
}

// Public status page
export interface StatusPageService {
  name: string
  status: 'operational' | 'degraded' | 'outage'
  uptime7d: number  // percent
  latencyMs?: number
}

export interface StatusPage {
  title: string
  description?: string
  services: StatusPageService[]
  incidents: { id: string; title: string; body: string; createdAt: number; resolvedAt?: number }[]
  overallStatus: 'operational' | 'degraded' | 'outage'
}

// Multi-server
export interface ServerConfig {
  id: string
  name: string
  host: string
  apiUrl: string
  token?: string
  tags: string[]
  addedAt: number
}

// UI navigation state
export type PageId = 'overview' | 'containers' | 'processes' | 'network' | 'alerts' | 'history' | 'settings'
