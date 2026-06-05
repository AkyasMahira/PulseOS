# CHANGELOG_AI.md — PulseOS Development History

> Verified against actual codebase on 2025-06-02. Statuses reflect code evidence, not aspirational documentation.
> Features marked "Planned" or "Not Implemented" do not exist in the codebase.

---

## Implemented Features ✅

### Phase 1 — Core Monitoring

**System Metrics Collection**
- Status: ✅ Fully implemented
- Files: `collectors/cpu.ts`, `collectors/mem.ts`, `collectors/disk.ts`, `collectors/net.ts`
- Notes: Reads directly from Linux `/proc` filesystem. CPU uses delta calculation between ticks for accurate percentage. Memory uses cache-aware formula (subtracts cached/buffers from used). Network tracks per-interface rates. Disk uses `df -Pk`. All wrapped in `Promise.allSettled` with fallbacks.

**WebSocket Live Broadcasting**
- Status: ✅ Fully implemented
- Files: `ws/hub.ts`, `hooks/useSocket.ts`
- Notes: Socket.IO with JWT auth middleware. 5s collection interval. Broadcasts 4 event types. Client subscribes to channels. `isAnimationActive={false}` on charts for performance.

**SQLite Persistence**
- Status: ✅ Fully implemented (with one gap — see Partial)
- Files: `db/index.ts`
- Notes: WAL mode, single migration function. Inserts metrics each tick. 30-day retention via daily prune. All tables created with IF NOT EXISTS.

**Dashboard Overview**
- Status: ✅ Fully implemented
- Files: `components/dashboard/Dashboard.tsx`, `MetricCard.tsx`, `charts/SparkLine.tsx`
- Notes: 6 metric cards, 4 sparkline charts (60-point rolling history), ServicesTable, ProcessTable. Alert banner shows latest unresolved alert.

**Authentication (JWT)**
- Status: ✅ Implemented (enhanced in Phase 3A)
- Files: `routes/auth.ts`, `middleware/auth.ts`, `stores/metrics.ts`
- Notes: First-run setup endpoint, login, JWT with `{ sub, username, role }` (role added in Phase 3A). 7-day expiry. bcrypt cost 12. `localStorage` persistence. Role embedded in JWT and decoded client-side via `decodeRoleFromToken()`. `last_login_at` updated on each successful login. Middleware now has three tiers: `requireAuth`, `requireAdmin`, `requireOwner`.

### Phase 2 — Docker + Alerts + History

**Docker Container Monitoring**
- Status: ✅ Fully implemented
- Files: `collectors/docker.ts`, `routes/docker.ts`, `components/containers/ContainersPage.tsx`
- Notes: Via Unix socket `/var/run/docker.sock`. Calculates CPU% from cgroup stats. Container actions (start/stop/restart/pause/unpause). Log viewer modal with tail. Expand/collapse rows.

**Alert Engine**
- Status: ✅ Core implemented; alert resolution is partial
- Files: `alerts.ts`, `routes/metrics.ts`, `components/alerts/AlertsPage.tsx`
- Notes: Per-rule cooldown tracking in memory. Telegram + Discord dispatch. Alert events persisted to DB. Frontend shows events feed + rule CRUD. **Alert auto-resolution (marking resolvedAt) is NOT implemented** — alerts never auto-resolve.

**History Charts**
- Status: ✅ Fully implemented
- Files: `routes/metrics.ts`, `components/history/HistoryPage.tsx`
- Notes: 4 metrics (cpu, mem, net_rx, net_tx), 4 time ranges (1h/6h/24h/7d), min/max/avg stats. REST polling (not WS). Single-server only.

**Services Monitoring**
- Status: ✅ Implemented
- Files: `collectors/services.ts`
- Notes: systemd via `systemctl is-active` + uptime from `ActiveEnterTimestamp`. PM2 via `pm2 jlist`. Configurable via `WATCH_SERVICES` env var.

**Process Monitoring**
- Status: ✅ Fully implemented
- Files: `collectors/processes.ts`, `components/services/ProcessesPage.tsx`
- Notes: Reads `/proc/{pid}/stat`, `/proc/{pid}/cmdline`, `/proc/{pid}/statm`. CPU% via tick delta. Sortable/filterable table. Top 20 by CPU default.

**Network Page**
- Status: ✅ Fully implemented
- Files: `components/dashboard/NetworkPage.tsx`
- Notes: Per-interface breakdown, RX/TX sparklines, total bytes counters.

**Public Status Page**
- Status: ✅ Fully implemented (backend data + frontend page)
- Files: `routes/status.ts`, `pages/status.astro`
- Notes: No auth required. CORS `*`. Auto-refresh 30s. Calculates 7d uptime from alert_events table. Shows incidents. Pure vanilla JS in Astro page.

### Phase 3 — Multi-Server + Team ✅ Implemented

**RBAC Foundation (Phase 3A)**
- Status: ✅ Implemented
- Files: `packages/types/src/index.ts`, `apps/api/src/db/index.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/routes/auth.ts`, `apps/web/src/stores/metrics.ts`, `apps/web/src/components/layout/Sidebar.tsx`, `apps/web/src/components/dashboard/LoginPage.tsx`
- Notes: `UserRole` type (`owner` | `admin` | `viewer`). `users` table extended with `role`, `email`, `last_login_at`. JWT payload now `{ sub, username, role }`. Three middleware tiers: `requireAuth` (viewer+), `requireAdmin` (owner/admin), `requireOwner` (owner only). All middleware properly returns after `reply.send()`. First user always created as `owner`. Frontend `useAuthStore` stores role in Zustand + localStorage, decodes from JWT for refresh persistence. Sidebar filters nav items by `requireRole` — `servers`, `team`, `apikeys` hidden from viewers. `bodyLimit: 1MB` added to Fastify config. JWT secret warning on startup.

**RBAC Route Enforcement (Phase 3E)**
- Status: ✅ Implemented
- Files: `apps/api/src/routes/docker.ts`, `apps/api/src/routes/metrics.ts`
- Notes: Container mutations (start/stop/restart/remove) require `requireAdmin`. Alert rule creation requires `requireAdmin`. Container listing and logs remain viewer-accessible. Route enforcement now covers all existing API endpoints.

**Team Management (Phase 3B)**
- Status: ✅ Implemented
- Files: `apps/api/src/routes/team.ts`, `apps/web/src/pages/accept-invite.astro`, `apps/web/src/components/servers/TeamPage.tsx`
- Notes: 7 endpoints: GET/PUT/DELETE users (owner-gated), POST/GET/DELETE invites (admin-gated), GET invite-info + POST accept-invite (no auth). 48h invite expiry. Accept-invite page is vanilla JS (no React). Full TeamPage UI with Users tab (role dropdown for owners) and Invites tab (email+role form, copyable invite URL).

**Multi-Server (Phase 3C)**
- Status: ✅ Implemented
- Files: `apps/api/src/routes/servers.ts`, `apps/web/src/components/servers/ServersPage.tsx`
- Notes: 5 endpoints: GET/POST/DELETE servers + GET status (admin-gated). `apiToken` stripped from all responses via `stripToken()`. `startRemotePolling()` polls all servers every `COLLECT_INTERVAL_MS`, caches in `remoteCache` Map. Full ServersPage UI with add form, server cards (CPU/RAM/Disk), online/offline badges, auto-refresh.

**API Keys + Webhooks (Phase 3D)**
- Status: ✅ Implemented
- Files: `apps/api/src/routes/apikeys.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/alerts.ts`, `apps/web/src/components/saas/ApiKeysPage.tsx`
- Notes: 6 endpoints for API key + webhook CRUD (admin-gated). One-time full key reveal at creation. `requireApiKey` middleware validates `x-api-key` header. Webhook dispatch in `fireAlert()` via `listWebhooks()` — filters enabled webhooks by event, POSTs with `X-Webhook-Secret`. Full ApiKeysPage UI with Keys tab (scope select, one-time display) and Webhooks tab (URL + event checkboxes).

### Phase 4 — Billing / SaaS 📋 Planned

**Billing / Stripe**
- Status: 📋 Planned — not yet implemented
- Files: (planned) `routes/billing.ts`, `components/saas/BillingPage.tsx`
- Notes: Plan definitions (`PLANS` constant). Stripe Checkout session creation. Customer portal redirect. Stripe webhook handler. Requires `subscription` table, Stripe SDK integration, HMAC signature verification. Plan limits NOT enforced on any API endpoint.

---

## Partially Implemented Features ⚠️

| Feature | What Works | What's Missing | File |
|---|---|---|---|
| Alert resolution | Alerts fired and stored | `resolvedAt` never set — alerts never auto-resolve | `alerts.ts` |
| Disk history | Table + index exist, pruning works | INSERT never called (data never written) | `db/index.ts`, `ws/hub.ts` |
| `@fastify/websocket` dep | Listed in package.json | Not used — Socket.IO used instead | `package.json` |
| Email alerts channel | Defined in `AlertChannel` type | No implementation in `alerts.ts` | `alerts.ts` |

## Planned Features 📋

| Feature | Planned Files | Notes |
|---|---|---|
| Email invites | `routes/team.ts` | SMTP/nodemailer integration |
| SSO/SAML | — | Enterprise plan feature |
| Password reset | — | Forgot-password flow, reset tokens | |

---

## Refactored Components

**DB module** — 9 tables: `metrics_history`, `disk_history`, `alert_rules`, `alert_events`, `users` (with `role`, `email`, `last_login_at`), `invites`, `servers`, `api_keys`, `webhooks`. ~366 lines with 30+ exported query functions. All Phase 3 table schemas created in a single `migrate()` execution.

**Auth routes** — Provides login, first-run setup, `/me`. JWT payload: `{ sub, username, role }`. `updateLastLogin()` called on login. First-run setup and admin seed always create `owner` role.

**Auth middleware** — Four exported async functions: `requireAuth` (any valid JWT), `requireAdmin` (owner or admin), `requireOwner` (owner only), `requireApiKey` (validates `x-api-key` header against `api_keys` table). All properly return after `reply.send()`.

**Sidebar** — 10 nav items with role-based filtering. `requireRole` arrays on `servers`, `team`, `apikeys` hide items from viewers. Role badge reads from `useAuthStore().role` via `ROLE_LABELS` map.

**Dashboard** — Page router with 10 pages. All Phase 3 pages (servers, team, apikeys) have full implementations.

**Docker routes** — Container mutations (start/stop/restart/remove) gated behind `requireAdmin`. Listing and logs remain viewer-accessible.

**Alert engine** — Fires to Telegram, Discord, and webhooks. Webhook dispatch runs in parallel with channel-based notifications via `Promise.allSettled`.

---

## Known Limitations

1. **Linux-only**: All collectors depend on `/proc` filesystem and Linux-specific commands. Will fail on macOS/Windows.
2. **RBAC implemented**: Full role hierarchy (owner/admin/viewer) with middleware and route enforcement. JWT role claim means role changes require re-login.
3. **No horizontal scaling**: SQLite + in-memory caches (alert cooldowns, remote server cache) prevent multi-instance deployment.
4. **JWT-only auth**: No session invalidation mechanism. Logout is client-side only (removes token from localStorage). Role changes require re-login (stale JWT role claim).
5. **Single-tenant SQLite**: All users share one database. No data isolation between tenants (relevant for SaaS path).
6. **No test suite**: Zero tests across entire codebase.
7. **No input sanitization layer**: Route handlers validate presence but not format/content of inputs beyond Fastify's JSON schema on login.
8. **ALTER TABLE idempotency**: `migrate()` uses bare `ALTER TABLE ADD COLUMN` which will fail on second startup if columns already exist. No `PRAGMA table_info` guard.
9. **API keys stored as plaintext**: `key_hash` column stores the raw key, not a hash. `requireApiKey` compares directly. No cryptographic hashing.
10. **Webhook secrets auto-generated**: `createWebhook()` generates a 24-char secret but no HMAC signature is computed on outgoing payloads. The `X-Webhook-Secret` header is sent for consumer-side verification only.
