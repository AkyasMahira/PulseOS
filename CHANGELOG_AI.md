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
- Status: ✅ Implemented
- Files: `routes/auth.ts`, `middleware/auth.ts`
- Notes: First-run setup endpoint, login, JWT with `{ sub, username }` (no role). 7-day expiry. bcrypt cost 12. `localStorage` persistence. No RBAC — all users are equal. `users` table has only `id, username, password, created_at`.

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

### Phase 3 — Multi-Server + Team 📋 Planned

**Multi-Server Support**
- Status: 📋 Planned — not yet implemented
- Files: (planned) `routes/servers.ts`, `components/servers/ServersPage.tsx`
- Notes: Remote servers polled via HTTP. Results cached in `Map`. Cache lost on restart. Local server always shown as first card. Server cards show CPU/RAM/Disk meters. Requires `servers` table + `remoteCache` in route handler.

**Team Management + RBAC**
- Status: 📋 Planned — not yet implemented
- Files: (planned) `routes/team.ts`, `components/servers/TeamPage.tsx`, `pages/accept-invite.astro`
- Notes: 3 roles (owner/admin/viewer). Invite via token (48h expiry). Accept-invite page. Role change + user delete. Requires: `role`, `email`, `last_login_at` columns on `users` table; `invites` table; JWT payload extended with `role`.

**API Keys**
- Status: 📋 Planned — not yet implemented
- Files: (planned) `routes/apikeys.ts`, `components/saas/ApiKeysPage.tsx`
- Notes: Keys created, stored, revoked. One-time reveal on creation. Requires `api_keys` table + auth middleware that checks `x-api-key` header.

**Webhooks**
- Status: 📋 Planned — not yet implemented
- Files: (planned) `routes/apikeys.ts`, `db/index.ts`
- Notes: Webhooks can be created/deleted/listed. Trigger in alert engine via `listWebhooks()`. Requires `webhooks` table.

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
| Multi-server support | `routes/servers.ts`, `ServersPage.tsx` | Remote servers via HTTP polling, in-memory cache |
| Team management + RBAC | `routes/team.ts`, `TeamPage.tsx`, `accept-invite.astro` | Roles (owner/admin/viewer), invites, JWT role claim |
| API keys | `routes/apikeys.ts`, `ApiKeysPage.tsx` | CRUD + auth middleware; requires `api_keys` table |
| Webhook delivery | `routes/apikeys.ts`, `alerts.ts` | CRUD + trigger in alert engine; requires `webhooks` table |
| Billing / Stripe | `routes/billing.ts`, `BillingPage.tsx` | Plans, checkout, webhook handler; requires `subscription` table |
| Email invites | `routes/team.ts` | SMTP/nodemailer integration |
| SSO/SAML | — | Enterprise plan feature |
| Password reset | — | Forgot-password flow, reset tokens | |

---

## Refactored Components

**DB module** — Current schema: 5 tables (`metrics_history`, `disk_history`, `alert_rules`, `alert_events`, `users`). Users table has `id, username, password, created_at`. No `server_id`, role, email, or multi-tenant columns.

**Auth routes** — Provides login and first-run setup. JWT payload: `{ sub, username }`. No role or email in JWT. No password reset.

**Sidebar** — Data-driven navigation with 7 pages (Overview, Containers, Processes, Network, Alerts, History, Settings). Badge counters for alerts and offline services. Hardcoded "admin" role label — no role-based filtering (planned for Phase 3).

**Dashboard** — Page router pattern using `currentPage` Zustand state. `PAGE_TITLES` map for all 7 pages.

---

## Known Limitations

1. **Linux-only**: All collectors depend on `/proc` filesystem and Linux-specific commands. Will fail on macOS/Windows.
2. **No RBAC**: All authenticated users have equal access. No role-based access control. Users table has no `role` column.
3. **No horizontal scaling**: SQLite + in-memory caches (alert cooldowns) prevent multi-instance deployment.
4. **JWT-only auth**: No session invalidation mechanism. Logout is client-side only (removes token from localStorage).
5. **Single-tenant SQLite**: All users share one database. No data isolation between tenants (relevant for SaaS path).
6. **No test suite**: Zero tests across entire codebase.
7. **No input sanitization layer**: Route handlers validate presence but not format/content of inputs beyond Fastify's JSON schema on login.
