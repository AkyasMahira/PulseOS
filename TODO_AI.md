# TODO_AI.md — PulseOS Structured Backlog

> **Verified against actual codebase 2025-06-02.** Complexity: **S** = Small (< 2h) | **M** = Medium (2-8h) | **L** = Large (> 8h)

---

## 🔄 In Progress (Partially Built — exist in code but incomplete)

| # | Task | Complexity | Files | Notes |
|---|---|---|---|---|
| IP-01 | Alert auto-resolution | S | `alerts.ts`, `db/index.ts` | Track active rule IDs in memory; UPDATE resolved_at when rule stops firing |
| IP-02 | Disk history writes | S | `ws/hub.ts`, `db/index.ts` | Add `insertDiskHistory()` + call in `tick()` for each disk |
| IP-03 | RBAC route enforcement | M | `routes/*` | ✅ Done (Phase 3E) — `requireAdmin` applied to docker actions and alert rule creation |
| IP-04 | ALTER TABLE idempotency | S | `db/index.ts` | ✅ Done — ALTER TABLE wrapped in try/catch loop |

---

## 📋 v1 Release Sprint (Pre-release Hardening)

> Tasks required before v1.0 public release. Complexity: **S** = Small (< 2h) | **M** = Medium (2-8h)

| # | Task | Complexity | Priority | Files | Notes |
|---|---|---|---|---|---|
| V1-01 | Enforce JWT secret in production | S | 🔴 Critical | `index.ts` | `process.exit(1)` if `JWT_SECRET === 'dev-secret-change-me'` and `NODE_ENV === 'production'` |
| V1-02 | Input validation on all POST routes | M | 🔴 Critical | All route files | Fastify JSON `schema.body` on team, servers, apikeys POST endpoints |
| V1-03 | Remove unused dependencies | S | 🔴 Critical | `package.json` (both apps) | `node-telegram-bot-api`, `@fastify/websocket`, `clsx`, `tailwind-merge`, `@radix-ui/*` |
| V1-04 | Alert auto-resolution | S | 🟡 Important | `alerts.ts`, `db/index.ts` | Track active rule IDs; UPDATE `resolved_at` when rule stops firing |
| V1-05 | Disk history writes | S | 🟡 Important | `ws/hub.ts`, `db/index.ts` | `insertDiskHistory()` + call in `tick()` for each disk |
| V1-06 | Alert cooldown persistence | S | 🟡 Important | `alerts.ts`, `db/index.ts` | Persist `last_fired_at` to `alert_rules` table to survive restarts |
| V1-07 | API key hashing | S | 🔴 Critical | `db/index.ts`, `middleware/auth.ts`, `routes/apikeys.ts` | Hash keys with `sha256` before storing in `key_hash`; update `requireApiKey` to compare hash |
| V1-08 | Mobile sidebar drawer | S | 🟢 Nice-to-have | `Dashboard.tsx`, `Sidebar.tsx` | `mobileMenuOpen` state exists; wire hamburger toggle for `<lg` screens |
| V1-09 | Audit log for destructive actions | M | 🟢 Nice-to-have | All route files | Log container actions, user deletion, role changes, invite creation |

**Total estimate**: ~8-12 hours for the full sprint. V1-01 through V1-07 alone (~6 hours) cover all critical security and correctness issues for a production-ready release.

---

## 📋 Phase 3 — Multi-Server + Team

| # | Task | Complexity | Files | Notes |
|---|---|---|---|---|
| P3-01 | RBAC implementation | M | `db/index.ts`, `routes/auth.ts`, `middleware/auth.ts`, `Sidebar.tsx` | ✅ Done (Phase 3A + 3E) |
| P3-02 | Team management routes | M | `routes/team.ts` | ✅ Done (Phase 3B) |
| P3-03 | Accept-invite page | S | `pages/accept-invite.astro` | ✅ Done (Phase 3B) |
| P3-04 | Multi-server routes | M | `routes/servers.ts`, `ServersPage.tsx` | ✅ Done (Phase 3C) |
| P3-05 | API key routes + middleware | M | `routes/apikeys.ts`, `middleware/auth.ts` | ✅ Done (Phase 3D) |
| P3-06 | Webhook delivery | M | `routes/apikeys.ts`, `alerts.ts` | ✅ Done (Phase 3D) |
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
| R-02 | Warn on default JWT secret | S | ✅ Done — console.warn added in Phase 3A |
| R-03 | Request body size limit | S | ✅ Done — `bodyLimit: 1_048_576` added in Phase 3A |
| R-04 | Remove unused dependencies | S | Remove: `node-telegram-bot-api`, `@fastify/websocket`, `clsx`, `tailwind-merge`, `@radix-ui/*` |
| R-05 | Split `db/index.ts` into domain modules | M | File grew to 366 lines (was 166 after Phase 3A). Contains 30+ query functions across 6 domains. Splitting becoming more urgent. |
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
