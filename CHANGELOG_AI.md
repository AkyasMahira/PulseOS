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
- Status: ✅ Fully implemented (enhanced in V1-04, V1-06)
- Files: `alerts.ts`, `routes/metrics.ts`, `components/alerts/AlertsPage.tsx`
- Notes: Per-rule cooldown tracking persisted to `alert_rules.last_fired_at` (survives restart). Telegram + Discord + Webhook dispatch. Alert auto-resolution: `resolveAlertsForRule()` marks `resolvedAt` when rule stops firing on next tick. Frontend shows events feed + rule CRUD.

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

## v1 Release Sprint ✅ Complete

**7 critical fixes applied:**
- V1-01: JWT secret — `process.exit(1)` in production if default
- V1-02: Input validation — Fastify JSON schema on all POST routes (team, servers, apikeys)
- V1-03: Removed 6 unused dependencies (`node-telegram-bot-api`, `@fastify/websocket`, `clsx`, `tailwind-merge`, `@radix-ui/*`)
- V1-04: Alert auto-resolution — `resolveAlertsForRule()` resolves when rules stop firing
- V1-05: Disk history writes — `insertDiskHistory()` called in WS tick loop
- V1-06: Alert cooldown persistence — persisted to `alert_rules.last_fired_at`, survives restart
- V1-07: API key hashing — sha256 before storage, sha256 comparison in `requireApiKey`

**Additional features:**
- V1-08: Mobile sidebar — hamburger drawer with auto-close on nav click
- Error pages — `ErrorBoundary` (React crash recovery) + `ErrorState` (404/500/offline/crash states)

## Polish Sprint ✅ Complete

**User experience improvements:**
- Profile page — JWT token display + copy (for multi-server config), password change form
- Alert rules — enable/disable toggle, delete button per rule (PUT/DELETE endpoints added)
- Invite list — copy button per invite, expired badge, "Xh remaining" countdown
- Docker containers — delete button (Trash2 icon with confirm dialog)
- Settings page — editable notification form (Telegram, Discord) + status page title/desc, saved to DB
- Add Server — helper text explaining how to get JWT token from DevTools
- Notification settings wired to backend — `getSetting()` reads DB before falling back to `.env`

## Bug Fixes

| Fix | Description | File | Date |
|---|---|---|---|
| ALTER TABLE idempotency | Bare `ALTER TABLE ADD COLUMN` in `migrate()` caused `SqliteError: duplicate column name` on second boot. Fixed by wrapping each statement in try/catch after the main `db.exec()` block. | `db/index.ts:121-128` | — |
| Stale env reference | SettingsPage referenced deleted `apps/api/.env`. Updated to `.env` (root directory). | `SettingsPage.tsx:76` | — |
| DB settings not read | `settings` table was written by UI form but never read by backend. `alerts.ts` and `status.ts` now call `getSetting()` first, falling back to `process.env`. | `alerts.ts:15-17`, `status.ts:49-50` | — |
| Astro env not loading on VPS | Vite `process.env.PUBLIC_API_URL` sometimes failed to read `apps/web/.env` in npm workspaces context. Fixed by using Vite's `loadEnv()` in `astro.config.mjs` to explicitly read from `apps/web/` directory. | `astro.config.mjs:2-4` | — |

## Refactored Config

**Environment variables** — Split into two files: root `.env` (16 backend vars loaded by `dotenv/config`) and `apps/web/.env` (1 frontend var loaded by Astro/Vite `define`). Removed stale `apps/api/.env`. Added `STATUS_PAGE_DESC` to env schema.

---

## Partially Implemented Features ⚠️

| Feature | What Works | What's Missing | File |
|---|---|---|---|
| Email alerts channel | Defined in `AlertChannel` type | No implementation in `alerts.ts` | `alerts.ts` |

## Planned Features 📋

| Feature | Planned Files | Notes |
|---|---|---|
| Email invites | `routes/team.ts` | SMTP/nodemailer integration |
| SSO/SAML | — | Enterprise plan feature |
| Password reset | — | Forgot-password flow, reset tokens | |

---

## Refactored Components

**DB module** — 10 tables: `metrics_history`, `disk_history`, `alert_rules`, `alert_events`, `users`, `invites`, `servers`, `api_keys`, `webhooks`, `settings`. ~440 lines with 40+ exported query functions.

**Auth routes** — Provides login, first-run setup, `/me`, password change (`PUT /api/auth/password`), and JWT token display (`GET /api/auth/token`).

**Auth middleware** — Four exported async functions: `requireAuth` (any valid JWT), `requireAdmin` (owner or admin), `requireOwner` (owner only), `requireApiKey` (validates `x-api-key` header against `api_keys` table). All properly return after `reply.send()`.

**Sidebar** — 11 nav items with role-based filtering. `requireRole` arrays on `servers`, `team`, `apikeys` hide items from viewers. Profile page accessible to all.

**Dashboard** — Page router with 11 pages. Invalid PageId renders 404 ErrorState.

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
7. **Input validation**: ✅ Fixed (V1-02) — Fastify JSON schema on all POST routes.
8. **ALTER TABLE idempotency**: ✅ Fixed — ALTER TABLE statements now wrapped in try/catch.
9. **API key hashing**: ✅ Fixed (V1-07) — keys hashed with sha256 before storage.
10. **Webhook secrets auto-generated**: `createWebhook()` generates a 24-char secret but no HMAC signature is computed on outgoing payloads. The `X-Webhook-Secret` header is sent for consumer-side verification only.
