# TODO_AI.md — PulseOS Structured Backlog

> Complexity: **S** = Small (< 2h) | **M** = Medium (2-8h) | **L** = Large (> 8h)

---

## 🔄 In Progress (Partially Built)

| # | Task | Complexity | Files | Notes |
|---|---|---|---|---|
| IP-01 | Alert auto-resolution | S | `alerts.ts`, `db/index.ts` | Track active rule IDs in memory; UPDATE resolved_at when rule stops firing |
| IP-02 | Webhook delivery engine | M | `alerts.ts`, `db/index.ts` | Call `listWebhooks()` in `fireAlert()`, POST with HMAC-SHA256 signature |
| IP-03 | Disk history writes | S | `ws/hub.ts`, `db/index.ts` | Add `insertDiskHistory()` + call in `tick()` for each disk |
| IP-04 | Stripe webhook signature | M | `routes/billing.ts` | Install `stripe` npm package, verify signature, register `@fastify/rawbody` |
| IP-05 | Plan limit enforcement | M | `routes/servers.ts`, `routes/team.ts`, `routes/metrics.ts` | Check `PLANS[planId].limits` before insert operations |

---

## 📋 Planned

| # | Task | Complexity | Files | Notes |
|---|---|---|---|---|
| P-01 | API key authentication middleware | M | `middleware/auth.ts` | Check `x-api-key` header, call `getApiKeyByRaw()`, `touchApiKey()`, set `req.user` |
| P-02 | API key hashing | S | `db/index.ts` | Store `sha256(key)` instead of raw key |
| P-03 | Alert cooldown persistence | S | `db/index.ts`, `alerts.ts` | Add `last_fired_at` column to `alert_rules`; load on startup |
| P-04 | Mask `apiToken` in server responses | S | `routes/servers.ts` | Strip from GET /api/servers response |
| P-05 | Fastify JSON schema on all POST routes | M | All `routes/*.ts` | Add `schema.body` definitions (like login route has) |
| P-06 | Request body size limit | S | `apps/api/src/index.ts` | Add `bodyLimit: 1_048_576` to Fastify config |
| P-07 | Warn on default JWT secret | S | `apps/api/src/index.ts` | `if (JWT_SECRET === 'dev-secret-change-me') console.warn(...)` |
| P-08 | Remove unused dependencies | S | `package.json` files | Remove: `node-telegram-bot-api`, `@fastify/websocket`, `clsx`, `tailwind-merge`, `@radix-ui/*` |

---

## 🚫 Missing Features

| # | Feature | Complexity | Notes |
|---|---|---|---|
| MF-01 | Email sending for invites | M | Add `nodemailer` + SMTP config; call in `routes/team.ts:42` |
| MF-02 | Password reset flow | L | Need: forgot-password endpoint, reset token table, email dispatch, reset page |
| MF-03 | Alert email channel | M | `alerts.ts` sends to Telegram/Discord but `AlertChannel` includes `email` — not implemented |
| MF-04 | Remote server metrics history | L | Currently only local metrics are stored. Need to store remote snapshots in SQLite with `server_id` |
| MF-05 | Disk usage history chart | S | `disk_history` table exists — just needs `insertDiskHistory()` + HistoryPage chart tab |
| MF-06 | Alert rule per-server scoping | M | `alert_rules.server_id` column exists but is never set or used in evaluation |
| MF-07 | SSO / SAML | L | Enterprise plan feature — not started. Requires external IdP integration |
| MF-08 | Multi-instance / horizontal scaling | L | Requires replacing SQLite with PostgreSQL + Redis pub/sub for WS |
| MF-09 | Mobile sidebar (drawer) | S | `Dashboard.tsx` has `mobileMenuOpen` state and overlay but Sidebar itself doesn't render below `lg` breakpoint |
| MF-10 | Dark/light theme toggle | S | Currently dark-only. `tailwind.config.mjs` has `darkMode: 'class'` but never toggled |
| MF-11 | Metrics export (CSV/JSON) | S | Add GET `/api/metrics/export` route |
| MF-12 | Alert test/preview button | S | POST `/api/alerts/rules/:id/test` — fire alert without threshold check |

---

## ♻️ Refactor Opportunities

| # | Task | Complexity | Notes |
|---|---|---|---|
| R-01 | Use `WsServerToClient` / `WsClientToServer` types | S | `packages/types` has these interfaces — wire them into `ws/hub.ts` and `useSocket.ts` |
| R-02 | Use `HistoryQuery` interface in metrics route | S | Already defined in types, unused in route |
| R-03 | Extract role check middleware | S | `requireAdmin` / `requireOwner` are duplicated inline — move to `middleware/auth.ts` and export |
| R-04 | Replace manual JWT decode in Sidebar | S | Use a proper `jwtDecode()` utility instead of `JSON.parse(atob(...))` |
| R-05 | Split `db/index.ts` into domain modules | M | File is 370+ lines. Split into `db/users.ts`, `db/metrics.ts`, `db/alerts.ts` etc. |
| R-06 | Use proper `cn()` (clsx + tailwind-merge) | S | Current `cn()` in `lib/utils.ts` is naive string join — doesn't handle Tailwind conflicts |
| R-07 | Collector error telemetry | S | Log collector-specific errors in `collectAll()` instead of silently returning fallback |
| R-08 | `remoteCache` persistence | M | Serialize to SQLite on write, reload on startup. Prevents cold-start empty state |

---

## 🔒 Security Improvements

| # | Task | Complexity | Priority |
|---|---|---|---|
| S-01 | Stripe webhook HMAC verification | M | Critical |
| S-02 | API key SHA-256 hashing | S | Critical |
| S-03 | API key auth middleware | M | Critical |
| S-04 | Enforce JWT secret in production | S | High |
| S-05 | Strip `apiToken` from server GET responses | S | High |
| S-06 | Input validation schemas on all routes | M | High |
| S-07 | Audit log for destructive actions | M | Medium |
| S-08 | Docker log stream demultiplexing | S | Low |

---

## ⚡ Performance Improvements

| # | Task | Complexity | Notes |
|---|---|---|---|
| PERF-01 | Metrics history downsampling | M | For 7d range with 5s interval = 120,960 points. Add server-side grouping (AVG per 5min bucket) |
| PERF-02 | SQLite connection pool via WAL | S | Already WAL mode — add `busy_timeout` pragma to prevent lock contention |
| PERF-03 | Process collector optimization | M | Reads every `/proc/{pid}/` entry — expensive. Consider caching PID list, only reading changed entries |
| PERF-04 | Remote server polling jitter | S | All remote servers polled simultaneously. Add jitter to `scheduleServerPoll()` |
| PERF-05 | Metrics WS payload size | S | Broadcasting full snapshot every 5s including all processes. Consider delta compression or separate channels |
| PERF-06 | React component memoization | S | `ServicesTable`, `ProcessTable` re-render on every WS tick. Wrap in `React.memo` |
