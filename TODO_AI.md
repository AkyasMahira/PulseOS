# TODO_AI.md — PulseOS Structured Backlog

> **Verified against actual codebase 2025-06-02.** Complexity: **S** = Small (< 2h) | **M** = Medium (2-8h) | **L** = Large (> 8h)

---

## 🔄 In Progress (Partially Built — exist in code but incomplete)

| # | Task | Complexity | Files | Notes |
|---|---|---|---|---|
| IP-01 | Alert auto-resolution | S | `alerts.ts`, `db/index.ts` | Track active rule IDs in memory; UPDATE resolved_at when rule stops firing |
| IP-02 | Disk history writes | S | `ws/hub.ts`, `db/index.ts` | Add `insertDiskHistory()` + call in `tick()` for each disk |

---

## 📋 Phase 3 — Multi-Server + Team (Not Started)

| # | Task | Complexity | Files | Notes |
|---|---|---|---|---|
| P3-01 | RBAC implementation | M | `db/index.ts`, `routes/auth.ts`, `middleware/auth.ts`, `Sidebar.tsx` | Add `role`, `email`, `last_login_at` to users table; add `role` to JWT payload; create `requireAdmin`/`requireOwner` middleware; role-filtered sidebar |
| P3-02 | Team management routes | M | `routes/team.ts` | User CRUD, invite generation (48h expiry), role assignment |
| P3-03 | Accept-invite page | S | `pages/accept-invite.astro` | Token validation, username/password form, account creation |
| P3-04 | Multi-server support | M | `routes/servers.ts`, `ServersPage.tsx` | Remote server registry + in-memory polling cache, server cards |
| P3-05 | API key infrastructure | M | `routes/apikeys.ts`, `db/index.ts`, `middleware/auth.ts` | `api_keys` table, CRUD routes, `x-api-key` auth middleware |
| P3-06 | Webhook engine | M | `routes/apikeys.ts`, `alerts.ts`, `db/index.ts` | `webhooks` table, CRUD, trigger in `fireAlert()` with HMAC |
| P3-07 | Email invite delivery | M | `routes/team.ts` | Add nodemailer + SMTP config |

---

## 📋 Phase 4 — Billing / SaaS (Not Started)

| # | Task | Complexity | Files | Notes |
|---|---|---|---|---|
| P4-01 | Billing routes + Stripe | L | `routes/billing.ts`, `BillingPage.tsx` | `PLANS` constant, Stripe Checkout, Customer Portal, webhook with HMAC |
| P4-02 | Subscription table + seeding | S | `db/index.ts` | `subscription` table, default `free` plan seed |
| P4-03 | Plan limit enforcement | M | `routes/servers.ts`, `routes/team.ts` | Check `PLANS[planId].limits` before insert operations |

---

## 📋 Planned (Other Features)

| # | Task | Complexity | Files | Notes |
|---|---|---|---|---|
| P-01 | Email alerts channel | M | `alerts.ts` | `AlertChannel.email` defined but not implemented |
| P-02 | Dark/light theme toggle | S | `tailwind.config.mjs` | Currently dark-only |
| P-03 | Password reset flow | L | — | Forgot-password, reset tokens, email dispatch |
| P-04 | SSO / SAML | L | — | Enterprise plan feature |
| P-05 | Metrics export (CSV/JSON) | S | `routes/metrics.ts` | GET `/api/metrics/export` |
| P-06 | Alert test/preview button | S | `routes/metrics.ts` | POST `/api/alerts/rules/:id/test` |
| P-07 | Mobile sidebar (drawer) | S | `Dashboard.tsx`, `Sidebar.tsx` | `mobileMenuOpen` state exists but Sidebar hidden below `lg`

---

## ♻️ Refactor Opportunities

| # | Task | Complexity | Notes |
|---|---|---|---|
| R-01 | Alert cooldown persistence | S | Add `last_fired_at` column to `alert_rules`; load on startup; prevents cooldown reset on restart |
| R-02 | Warn on default JWT secret | S | `if (JWT_SECRET === 'dev-secret-change-me') console.warn(...)` in `index.ts` |
| R-03 | Request body size limit | S | Add `bodyLimit: 1_048_576` to Fastify config in `index.ts` |
| R-04 | Remove unused dependencies | S | Remove: `node-telegram-bot-api`, `@fastify/websocket`, `clsx`, `tailwind-merge`, `@radix-ui/*` |
| R-05 | Split `db/index.ts` into domain modules | M | File is 166 lines. Split into `db/users.ts`, `db/metrics.ts`, `db/alerts.ts` etc. |
| R-06 | Use proper `cn()` (clsx + tailwind-merge) | S | Current `cn()` in `lib/utils.ts` is naive string join — doesn't handle Tailwind conflicts |
| R-07 | Collector error telemetry | S | Log collector-specific errors in `collectAll()` instead of silently returning fallback |
| R-08 | Fastify JSON schema on all POST routes | M | Add `schema.body` definitions (like login route has) |
| R-09 | Docker log stream demultiplexing | S | Strip 8-byte Docker multiplexed frame headers from log output |

---

## 🔒 Security Improvements

| # | Task | Complexity | Priority |
|---|---|---|---|
| S-01 | Enforce JWT secret in production | S | High |
| S-02 | Input validation schemas on all routes | M | High |
| S-03 | Audit log for destructive actions | M | Medium |

---

## ⚡ Performance Improvements

| # | Task | Complexity | Notes |
|---|---|---|---|
| PERF-01 | Metrics history downsampling | M | For 7d range with 5s interval = 120,960 points. Add server-side grouping (AVG per 5min bucket) |
| PERF-02 | SQLite connection pool via WAL | S | Already WAL mode — add `busy_timeout` pragma to prevent lock contention |
| PERF-03 | Process collector optimization | M | Reads every `/proc/{pid}/` entry — expensive. Consider caching PID list, only reading changed entries |
| PERF-04 | React component memoization | S | `ServicesTable`, `ProcessTable` re-render on every WS tick. Wrap in `React.memo` |
