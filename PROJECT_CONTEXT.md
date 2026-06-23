# PROJECT_CONTEXT.md — PulseOS

## Purpose

PulseOS is a **lightweight, self-hosted VPS monitoring dashboard** with a planned SaaS upgrade path. It targets indie hackers, self-hosters, and small teams who want a Vercel/Railway-aesthetic alternative to heavy observability stacks (Grafana, Netdata, Prometheus).

**Core value proposition**: Real-time system metrics with beautiful UI, < 300 MB RAM overhead, deployable on a $6/month VPS.

---

## Main Modules

### Backend (`apps/api`)

| Module | Files | Purpose |
|---|---|---|
| **Collectors** | `collectors/*.ts` | Reads raw Linux metrics from `/proc`, Docker socket, `df`, `systemctl`, `pm2` |
| **Collector Orchestrator** | `collectors/index.ts` | `collectAll()` — runs all collectors in parallel with `Promise.allSettled` |
| **WebSocket Hub** | `ws/hub.ts` | Runs collection loop every 5s, broadcasts to Socket.IO clients, persists to SQLite |
| **Alert Engine** | `alerts.ts` | Evaluates threshold rules after each collection tick, fires notifications via Telegram/Discord/Webhooks, enforces cooldowns |
| **Database** | `db/index.ts` | SQLite singleton, schema migration, all query functions |
| **Auth Routes** | `routes/auth.ts` | Login, first-run setup, `/me` endpoint. JWT contains `{ sub, username, role }`. `last_login_at` updated on login. |
| **Metrics Routes** | `routes/metrics.ts` | REST endpoints for current snapshot + history query. Alert rule CRUD gated behind `requireAdmin`. |
| **Docker Routes** | `routes/docker.ts` | Container list, log streaming with Docker multiplex demuxing (viewer+). Start/stop/restart/remove gated behind `requireAdmin`. |
| **Status Route** | `routes/status.ts` | Public unauthenticated status page data |
| **Team Routes** | `routes/team.ts` | User CRUD (owner-gated), invite generation/revocation (admin-gated), accept-invite (no auth) |
| **Server Routes** | `routes/servers.ts` | Remote server CRUD (admin-gated), `apiToken` stripped from all responses, polling loop via `startRemotePolling()` |
| **API Key Routes** | `routes/apikeys.ts` | API key CRUD (one-time reveal), webhook CRUD. All admin-gated. |
| **Settings Routes** | `routes/settings.ts` | Key-value config storage (DB-backed). GET/PUT for notification tokens, status page title/desc. |

> 📋 **Planned (Phase 4)**: `routes/billing.ts`

### Frontend (`apps/web`)

| Module | Files | Purpose |
|---|---|---|
| **State** | `stores/metrics.ts` | Zustand store — live metrics, page navigation, auth token |
| **Socket Hook** | `hooks/useSocket.ts` | Connects to Socket.IO, feeds all events into store |
| **Router** | `components/dashboard/Dashboard.tsx` | Page-level router using `currentPage` from store |
| **Overview** | `Dashboard.tsx > OverviewPage` | Main dashboard with MetricCards + SparkLines + ServicesTable + ProcessTable |
| **Containers** | `containers/ContainersPage.tsx` | Docker container management with log viewer modal |
| **Processes** | `services/ProcessesPage.tsx` | Full process list, sortable, filterable |
| **Network** | `dashboard/NetworkPage.tsx` | Per-interface bandwidth breakdown |
| **History** | `history/HistoryPage.tsx` | Time-series charts with range selector (1h/6h/24h/7d) |
| **Alerts** | `alerts/AlertsPage.tsx` | Alert events feed + rule management |
| **Settings** | `alerts/SettingsPage.tsx` | Server info, notification config |
| **Servers** | `servers/ServersPage.tsx` | Remote server cards with CPU/RAM/Disk, add/remove, online status |
| **Team** | `servers/TeamPage.tsx` | User list with role management, invite creation + link sharing |
| **API Keys** | `saas/ApiKeysPage.tsx` | Key creation (one-time reveal), webhook management |
| **Profile** | `servers/ProfilePage.tsx` | JWT token display (for multi-server), password change, account info |

> 📋 **Planned (Phase 4)**: `saas/BillingPage.tsx`

### Shared Types (`packages/types`)

Single file `src/index.ts` exports all interfaces shared between frontend and backend: metrics shapes, WebSocket event contracts, RBAC types, billing types.

---

## User Roles (✅ Phase 3 — fully implemented)

> RBAC is fully implemented: types, DB schema, JWT role claims, middleware, route-level enforcement, and UI role filtering.

| Role | Permissions |
|---|---|
| `owner` | Full access — billing, team management, all settings, delete users |
| `admin` | All monitoring features, container actions, invite users, manage alerts. Cannot access billing or delete owner |
| `viewer` | Read-only — can view all dashboards, cannot perform actions or manage team |

Key implementation requirements: `role` column on `users` table, `role` claim in JWT payload, role-check middleware, role-filtered sidebar navigation.

---

## Business Workflows

### First-Run Setup
1. `userCount() === 0` → `/api/auth/setup` is open
2. POST with `username + password + email` → creates `owner` account
3. JWT (with `{ sub, username, role: 'owner' }`) returned → stored in `localStorage` via `useAuthStore`
4. Alternatively: set `ADMIN_USER` + `ADMIN_PASS` env vars → auto-created as `owner` on boot

### Metrics Collection Loop
1. `createSocketServer()` calls `startCollection()` on boot
2. `setInterval(tick, 5000)` → `collectAll()` runs all 9 operations in parallel (7 collectors + hostname + uptime)
3. Results inserted into `metrics_history` (SQLite WAL)
4. `evaluateAlerts()` checks all enabled rules against fresh snapshot
5. If threshold crossed and cooldown elapsed → `fireAlert()` → DB insert + Socket.IO broadcast + Telegram/Discord
6. All 4 metric payloads broadcast via `io.emit()` to all authenticated WS clients

### Remote Server Polling (✅ Phase 3C)
1. `startRemotePolling()` called on boot — polls all servers in `servers` table
2. Each remote server polled via `fetch(apiUrl/api/metrics/now)` with stored API token
3. Results cached in `remoteCache` Map (in-memory, resets on restart)
4. Frontend fetches `/api/servers` REST endpoint (not WS) to display server cards

### Team Invite Flow (✅ Phase 3B)
1. Admin/owner POSTs to `/api/team/invite` with `{ email, role }`
2. Token stored in `invites` table (48h expiry)
3. Invite URL returned in API response (email sending NOT implemented — URL shown in UI)
4. Invitee visits `/accept-invite?token=xxx` → sets username/password → account created → redirected to dashboard

### Billing / Upgrade Flow (📋 Planned — Phase 4)
1. User navigates to Billing page → plans fetched from `/api/billing/plans` (static data from `PLANS` constant)
2. Click upgrade → POST `/api/billing/checkout` → Stripe Checkout session created → redirect
3. Stripe webhook hits `/api/billing/webhook` → `updateSubscription()` updates SQLite
4. Plan limits defined in `PLANS` constant in `billing.ts` but NOT enforced on API endpoints yet

---

## Important Module Relationships

```
ws/hub.ts
  ↓ calls
collectors/index.ts → cpu, mem, disk, net, docker, services, processes
  ↓ results inserted into
db/index.ts (SQLite)
  ↓ also triggers
alerts.ts → checks rules from DB → fires to Telegram/Discord + Socket.IO

routes/* → all read from db/index.ts

Frontend:
useSocket.ts → feeds → useMetricsStore (Zustand)
Dashboard.tsx → reads store → renders current page component
All page components → fetch REST APIs for non-live data (history)
```

---

## Environment Variables Reference

| Variable | Default | Required for |
|---|---|---|
| `PORT` | `3001` | Always |
| `HOST` | `0.0.0.0` | Always |
| `JWT_SECRET` | `dev-secret-change-me` | **Production — must change** |
| `ADMIN_USER` | — | First-run auto-seed |
| `ADMIN_PASS` | — | First-run auto-seed |
| `COLLECT_INTERVAL_MS` | `5000` | Metrics frequency |
| `WATCH_SERVICES` | `nginx,ssh,cron` | systemd service monitoring |
| `WATCH_PM2` | `true` | PM2 process monitoring |
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Container monitoring |
| `HISTORY_RETENTION_DAYS` | `30` | SQLite pruning |
| `TELEGRAM_BOT_TOKEN` | — | Telegram alerts |
| `TELEGRAM_CHAT_ID` | — | Telegram alerts |
| `DISCORD_WEBHOOK_URL` | — | Discord alerts |
| `WEB_ORIGIN` | `http://localhost:4321` | CORS |
| `STATUS_PAGE_TITLE` | `System Status` | Public status page |
| `STATUS_PAGE_DESC` | `Real-time service status` | Public status page description |
| `DB_PATH` | `apps/api/data/pulseos.db` | SQLite location |

> 📋 **Planned (Phase 4)**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`

> **Env file locations**: Root `.env` = backend (`dotenv/config`). `apps/web/.env` = frontend (`PUBLIC_API_URL` via Astro/Vite `define`). They do NOT share variables.
