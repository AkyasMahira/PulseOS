# TODO_AI.md — PulseOS Structured Backlog

> **Verified against actual codebase 2025-06-02.** Complexity: **S** = Small (< 2h) | **M** = Medium (2-8h) | **L** = Large (> 8h)

---

## 🔄 In Progress (Partially Built — exist in code but incomplete)

| # | Task | Complexity | Files | Notes |
|---|---|---|---|---|
| — | *None — all IP tasks completed in v1 sprint* | — | — | — |

---

## ✅ v1 Release Sprint (Completed)

| # | Task | Complexity | Status | Notes |
|---|---|---|---|---|
| V1-01 | Enforce JWT secret in production | S | ✅ | `process.exit(1)` if default in production |
| V1-02 | Input validation on all POST routes | M | ✅ | Fastify JSON schema on 6 endpoints |
| V1-03 | Remove unused dependencies | S | ✅ | 6 packages removed from api + web |
| V1-04 | Alert auto-resolution | S | ✅ | `resolveAlertsForRule()` on next tick |
| V1-05 | Disk history writes | S | ✅ | `insertDiskHistory()` in WS tick loop |
| V1-06 | Alert cooldown persistence | S | ✅ | Persisted to `alert_rules.last_fired_at` |
| V1-07 | API key hashing | S | ✅ | sha256 before store, sha256 on compare |
| V1-08 | Mobile sidebar drawer | S | ✅ | Hamburger toggle with auto-close |
| V1-09 | Audit log for destructive actions | M | Deferred to v1.1 | Log container/user mutations |
| V1-10 | Docker log stream demultiplexing | S | ✅ | Strip 8-byte Docker multiplex frame headers |
| V1-11 | getDb() race condition fix | S | ✅ | Sync mkdir before new Database() on fresh install |
| V1-12 | Process CPU first-tick fix | S | ✅ | Skip first tick, return data from second tick onward |

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
| P-03 | Password reset flow | L | — | Forgot-password via email. Password CHANGE (logged-in) is implemented via Profile page. |
| P-04 | SSO / SAML | L | — | Enterprise plan feature |
| P-05 | Metrics export (CSV/JSON) | S | `routes/metrics.ts` | GET `/api/metrics/export` |
| P-06 | Alert test/preview button | S | `routes/metrics.ts` | POST `/api/alerts/rules/:id/test` |
| P-07 | Mobile sidebar (drawer) | S | `Dashboard.tsx`, `Sidebar.tsx` | ✅ Done — hamburger toggle with auto-close |

---

## ♻️ Refactor Opportunities

| # | Task | Complexity | Notes |
|---|---|---|---|
| R-01 | Alert cooldown persistence | S | ✅ Done (V1-06) — persisted to alert_rules.last_fired_at |
| R-02 | Warn on default JWT secret | S | ✅ Done — console.warn added in Phase 3A |
| R-03 | Request body size limit | S | ✅ Done — `bodyLimit: 1_048_576` added in Phase 3A |
| R-04 | Remove unused dependencies | S | ✅ Done (V1-03) — 6 packages removed |
| R-05 | Split `db/index.ts` into domain modules | M | File at ~444 lines with 40+ query functions. Splitting becoming urgent. |
| R-06 | Use proper `cn()` (clsx + tailwind-merge) | S | Current `cn()` in `lib/utils.ts` is naive string join |
| R-07 | Collector error telemetry | S | Log collector-specific errors in `collectAll()` |
| R-08 | Fastify JSON schema on all POST routes | M | ✅ Done (V1-02) — schema.body on all 6 POST endpoints |
| R-09 | Docker log stream demultiplexing | S | ✅ Done (V1-10) — 8-byte Docker multiplex frame headers stripped |

---

## 🔒 Security Improvements

| # | Task | Complexity | Priority |
|---|---|---|---|
| S-01 | Enforce JWT secret in production | S | ✅ Done (V1-01) — process.exit(1) in production |
| S-02 | Input validation schemas on all routes | M | ✅ Done (V1-02) — JSON schema on 6 POST endpoints |
| S-03 | Audit log for destructive actions | M | Medium |

---

## ⚡ Performance Improvements

| # | Task | Complexity | Notes |
|---|---|---|---|
| PERF-01 | Metrics history downsampling | M | For 7d range with 5s interval = 120,960 points. Add server-side grouping (AVG per 5min bucket) |
| PERF-02 | SQLite connection pool via WAL | S | Already WAL mode — add `busy_timeout` pragma to prevent lock contention |
| PERF-03 | Process collector optimization | M | Reads every `/proc/{pid}/` entry — expensive. Consider caching PID list, only reading changed entries |
| PERF-04 | React component memoization | S | `ServicesTable`, `ProcessTable` re-render on every WS tick. Wrap in `React.memo` |
