# CHANGELOG_AI.md — PulseOS Development History

> AI-generated changelog from repository analysis. No git history available — reconstructed from code evidence.

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
- Status: ✅ Fully implemented
- Files: `routes/auth.ts`, `middleware/auth.ts`, `stores/metrics.ts`
- Notes: First-run setup endpoint, login, JWT with role embedded. 7-day expiry. bcrypt with cost factor 12. `localStorage` token persistence.

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
- Notes: 4 metrics (cpu, mem, net_rx, net_tx), 4 time ranges (1h/6h/24h/7d), min/max/avg stats. REST polling (not WS). `server_id` filtering supported in DB layer.

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

### Phase 3 — Multi-Server + Team

**Multi-Server Support**
- Status: ✅ Implemented (with in-memory cache limitation)
- Files: `routes/servers.ts`, `components/servers/ServersPage.tsx`
- Notes: Remote servers polled via HTTP. Results cached in `Map`. Cache lost on restart. Local server always shown as first card. Server cards show CPU/RAM/Disk meters.

**Team Management + RBAC**
- Status: ✅ Implemented
- Files: `routes/team.ts`, `components/servers/TeamPage.tsx`, `pages/accept-invite.astro`
- Notes: 3 roles (owner/admin/viewer). Invite via token (48h expiry). Accept-invite page. Role change + user delete. Role encoded in JWT.

**API Keys**
- Status: ✅ CRUD implemented; auth middleware NOT wired
- Files: `routes/apikeys.ts`, `db/index.ts`, `components/saas/ApiKeysPage.tsx`
- Notes: Keys created, stored, revoked. One-time reveal on creation. `getApiKeyByRaw()` + `touchApiKey()` exist but are never called by auth middleware.

**Webhooks**
- Status: ⚠️ Partially implemented — CRUD only, delivery NOT implemented
- Files: `routes/apikeys.ts`, `db/index.ts`
- Notes: Webhooks can be created/deleted/listed. The `listWebhooks()` function is never called by the alert engine or any trigger.

### Phase 4 — Billing / SaaS

**Billing / Stripe**
- Status: ⚠️ Partially implemented — structure complete, not production-ready
- Files: `routes/billing.ts`, `components/saas/BillingPage.tsx`
- Notes: Plan definitions (`PLANS` constant) complete. Stripe Checkout session creation works if `STRIPE_SECRET_KEY` set. Customer portal redirect works. Stripe webhook handler parses events but **signature verification is a stub** (comment: "simplified — in prod use stripe SDK"). Plan limits NOT enforced on any API endpoint.

---

## Partially Implemented Features ⚠️

| Feature | What Works | What's Missing | File |
|---|---|---|---|
| Alert resolution | Alerts fired and stored | `resolvedAt` never set — alerts never auto-resolve | `alerts.ts` |
| Webhook delivery | CRUD, storage | Webhook trigger in alert engine | `alerts.ts`, `routes/apikeys.ts` |
| API key auth | Key creation/storage | Middleware to authenticate requests with API keys | `middleware/auth.ts` |
| Plan limit enforcement | Plan definitions, UI display | Server-side checks on server/user/rule limits | `routes/billing.ts` |
| Stripe webhook signature | Event parsing | HMAC verification with `STRIPE_WEBHOOK_SECRET` | `routes/billing.ts:137` |
| Email invites | Invite token + DB | Actual email sending (nodemailer/SMTP) | `routes/team.ts:42` |
| Disk history | Table + index exist, pruning works | INSERT never called (data never written) | `db/index.ts`, `ws/hub.ts` |
| `@fastify/websocket` dep | Listed in package.json | Not used — Socket.IO used instead | `package.json` |
| Email alerts channel | Defined in `AlertChannel` type | No implementation in `alerts.ts` | `alerts.ts` |
| SSO/SAML | Listed as Enterprise feature | Not started | — |
| Password reset | — | Not implemented | — |

---

## Refactored Components

**DB module** — Evolved from basic 3-table schema to 10-table schema across phases. Column `server_id` added to `metrics_history` and `disk_history` for multi-server support. Users table extended with `email`, `role`, `last_login_at`.

**Auth routes** — Upgraded from basic login to include `role` in JWT payload and optional `email` in setup.

**Sidebar** — Rebuilt twice: first as static nav, then as data-driven nav with role-based visibility (`ownerOnly` flag), badge counters, and sign-out button.

**Dashboard** — Refactored from monolithic component to page router pattern using `currentPage` Zustand state.

---

## Known Limitations

1. **Linux-only**: All collectors depend on `/proc` filesystem and Linux-specific commands. Will fail on macOS/Windows.
2. **No horizontal scaling**: SQLite + in-memory caches (alert cooldowns, remote server cache) prevent multi-instance deployment.
3. **JWT-only auth**: No session invalidation mechanism. Logout is client-side only (removes token from localStorage).
4. **Single-tenant SQLite**: All users share one database. No data isolation between tenants (relevant for SaaS path).
5. **Remote server metrics not in SQLite**: Only local server metrics are persisted. Remote server metrics exist only in `remoteCache`.
6. **No test suite**: Zero tests across entire codebase.
7. **No input sanitization layer**: Route handlers validate presence but not format/content of inputs beyond Fastify's JSON schema on login.
