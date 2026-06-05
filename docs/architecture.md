# docs/architecture.md — PulseOS System Architecture

---

## Folder Structure

```
pulseos/                          # Monorepo root
├── package.json                  # npm workspaces config
├── tsconfig.json                 # Base TS config (extended by apps)
├── ecosystem.config.cjs          # PM2 process config
├── nginx.conf                    # Production reverse proxy config
├── deploy.sh                     # Build + deploy script
│
├── apps/
│   ├── api/                      # Fastify backend (Node.js ESM)
│   │   └── src/
│   │       ├── index.ts          # Bootstrap: plugins, routes, Socket.IO, PM2 seed
│   │       ├── alerts.ts         # Alert threshold engine + notification dispatch
│   │       ├── collectors/
│   │       │   ├── index.ts      # collectAll() — runs all collectors, Promise.allSettled
│   │       │   ├── cpu.ts        # /proc/stat delta → CPU %
│   │       │   ├── mem.ts        # /proc/meminfo → RAM (cache-aware)
│   │       │   ├── disk.ts       # df -Pk → per-mountpoint usage
│   │       │   ├── net.ts        # /proc/net/dev → RX/TX rates
│   │       │   ├── docker.ts     # Docker Unix socket → container stats
│   │       │   ├── services.ts   # systemctl + pm2 jlist → service status
│   │       │   └── processes.ts  # /proc/{pid}/* → top processes by CPU
│   │       ├── db/
│   │       │   └── index.ts      # SQLite singleton, migrate(), all query functions
│   │       ├── middleware/
│   │       │   └── auth.ts       # requireAuth — JWT verify via @fastify/jwt
│   │       ├── routes/
│   │       │   ├── auth.ts       # /api/auth — login, setup, /me
│   │       │   ├── metrics.ts    # /api/metrics — /now, /history, /api/alerts
│   │       │   ├── docker.ts     # /api/docker — list, actions, logs
│   │       │   └── status.ts     # /status — public, no auth
│   │       │   └── (planned)     # team.ts, servers.ts, apikeys.ts, billing.ts for Phase 3-4
│   │       └── ws/
│   │           └── hub.ts        # Socket.IO server + collection loop
│   │
│   └── web/                      # Astro + React frontend (static output)
│       └── src/
│           ├── pages/
│           │   ├── index.astro       # Shell → <App client:only="react" />
│           │   └── status.astro      # Public status page (vanilla JS)
│           ├── components/
│           │   ├── App.tsx           # Auth gate → Dashboard or LoginPage
│           │   ├── layout/
│           │   │   ├── Sidebar.tsx   # Navigation, badges, sign-out
│           │   │   └── Topbar.tsx    # Header, connection status
│           │   ├── dashboard/
│           │   │   ├── Dashboard.tsx # Page router (currentPage → component)
│           │   │   ├── MetricCard.tsx
│           │   │   └── NetworkPage.tsx
│           │   ├── charts/
│           │   │   └── SparkLine.tsx # Recharts AreaChart, 60-point rolling
│           │   ├── containers/ContainersPage.tsx
│           │   ├── history/HistoryPage.tsx
│           │   ├── alerts/
│           │   │   ├── AlertsPage.tsx
│           │   │   └── SettingsPage.tsx
│           │   ├── services/
│           │   │   ├── ServicesTable.tsx
│           │   │   ├── ProcessTable.tsx
│           │   │   └── ProcessesPage.tsx
│           ├── hooks/useSocket.ts    # Socket.IO connection + store wiring
│           ├── stores/metrics.ts     # Zustand — all live state
│           └── lib/utils.ts         # fmtBytes, fmtUptime, fmtPct, etc.
│
└── packages/
    └── types/src/index.ts           # Shared TypeScript interfaces
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Linux VPS                                 │
│                                                             │
│  /proc/stat    /proc/meminfo   /proc/net/dev   /proc/{pid}  │
│       ↓              ↓               ↓              ↓       │
│  cpu.ts         mem.ts          net.ts       processes.ts   │
│       ↓              ↓               ↓              ↓       │
│  ┌────────────────────────────────────────────────────┐     │
│  │              collectAll()  (every 5s)              │     │
│  │         Promise.allSettled — graceful fallbacks    │     │
│  └──────────────────────┬─────────────────────────────┘     │
│                         │                                   │
│             ┌───────────┴───────────┐                       │
│             ↓                       ↓                       │
│     insertMetric()          evaluateAlerts()                │
│     (SQLite WAL)            → cooldown check                │
│                             → fireAlert()                   │
│                               → insertAlertEvent()          │
│                               → Telegram / Discord          │
│                               → Socket.IO emit              │
│             ↓                       ↓                       │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Socket.IO Server  (port 3001/ws)         │       │
│  │  emit: metrics:snapshot, containers,             │       │
│  │         services, processes, alert:fired         │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                          │ WSS
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                      │
│                                                             │
│  useSocket.ts → feeds → Zustand Store                       │
│                         ├── snapshot (cpu, mem, disk, net)  │
│                         ├── containers                      │
│                         ├── services                        │
│                         ├── processes                       │
│                         ├── alerts                          │
│                         ├── cpuHistory[60]                  │
│                         ├── memHistory[60]                  │
│                         ├── netRxHistory[60]                │
│                         └── netTxHistory[60]                │
│                                  ↓                          │
│               Dashboard (router) → Page components          │
│               SparkLine reads history arrays                │
│               MetricCard reads snapshot fields              │
└─────────────────────────────────────────────────────────────┘
```

---

## Request Lifecycle

### Authenticated REST Request
```
Client → nginx (TLS termination)
  → proxy_pass localhost:3001
  → Fastify rate limiter (100/min per IP)
  → Route handler
  → preHandler: requireAuth → req.jwtVerify()
  → Handler logic → db/index.ts query
  → { ok: true, data: ... }
```

### WebSocket Connection
```
Browser → socket.io-client.connect(API_URL, { path: '/ws', auth: { token } })
  → Socket.IO server auth middleware → verify(token, jwtSecret)
  → on('connection') → client joins rooms via 'subscribe' event
  → Server tick every 5s → io.emit('metrics:snapshot', ...) to all clients
```

### Docker Action
```
Client POST /api/docker/:id/restart
  → requireAuth
  → dockerPost('/containers/:id/restart') via Node http.request to unix socket
  → Docker daemon performs action
  → Next WS tick reflects updated container state
```

---

## SQLite Schema

```sql
metrics_history  (id, ts, cpu, mem_used, mem_total, net_rx, net_tx)
disk_history     (id, ts, mountpoint, used, total)    ← created but never written
alert_rules      (id, name, metric, condition, threshold, severity, channels, cooldown, enabled, created_at)
alert_events     (id, rule_id, rule_name, severity, message, value, threshold, fired_at, resolved_at)
users            (id, username, password, created_at)

-- Planned (Phase 3-4):
-- users: add email, role, last_login_at columns
-- NEW tables: invites, servers, api_keys, webhooks, subscription
-- metrics_history/disk_history: add server_id column
-- alert_rules: add server_id column
```

---

## External Dependencies / Integrations

| Service | Protocol | Direction | Status |
|---|---|---|---|
| Telegram Bot API | HTTPS POST | Outbound | ✅ Implemented |
| Discord Webhook | HTTPS POST | Outbound | ✅ Implemented |
| Docker daemon | Unix socket | Local | ✅ Implemented |
| PM2 | Child process exec | Local | ✅ Implemented |
| systemd | Child process exec | Local | ✅ Implemented |
| Stripe Checkout API | HTTPS POST | Outbound | 📋 Planned (Phase 4) |
| Stripe Customer Portal | HTTPS POST | Outbound | 📋 Planned (Phase 4) |
| Stripe Webhook | HTTPS POST | Inbound | 📋 Planned (Phase 4) |
| Remote PulseOS instances | HTTPS GET | Outbound | 📋 Planned (Phase 3) |
| Email / SMTP | — | — | ❌ Not implemented |

---

## Production Deployment Architecture

```
Internet
  ↓ HTTPS :443
nginx (TLS via Let's Encrypt)
  ├── / → /var/www/pulseos (static Astro build)
  ├── /api/* → proxy_pass localhost:3001
  └── /ws/* → proxy_pass localhost:3001 (WebSocket upgrade)
              ↓
           PM2 → node apps/api/dist/index.js
              ↓
           pulseos.db (SQLite WAL)
```
