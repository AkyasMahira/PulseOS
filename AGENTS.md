# AGENTS.md — PulseOS AI Agent Guide

> This document is the **primary reference** for any AI agent (Claude, GPT, DeepSeek, Qwen, Roo Code, OpenCode, etc.) working on this codebase. Read it fully before making any changes.

---

## 1. Project Identity

**PulseOS** is a self-hosted VPS monitoring dashboard with a SaaS upgrade path.
- Monorepo: `apps/api` (Fastify backend), `apps/web` (Astro + React frontend), `packages/types` (shared TS interfaces)
- Target: 2 vCPU / 2 GB RAM Linux VPS (Ubuntu 22.04)
- Runtime: Node.js 20+, ESM throughout (`"type": "module"`)

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| API Framework | Fastify 4 | NOT Express. Use Fastify patterns. |
| Auth | @fastify/jwt + bcryptjs | JWT in Authorization header |
| Realtime | Socket.IO 4 | Path `/ws`, JWT auth on handshake |
| Database | SQLite via better-sqlite3 | WAL mode, synchronous queries |
| Frontend framework | Astro 4 + React 18 | `client:only="react"` for interactive islands |
| State management | Zustand 4 | `useMetricsStore`, `useAuthStore` |
| Styling | TailwindCSS 3 + custom theme | Dark mode only, custom `surface-*` colors |
| Charts | Recharts 2 | AreaChart with `isAnimationActive={false}` for perf |
| Shared types | `@pulseos/types` workspace | ALWAYS import types from here, never redefine |
| Process manager | PM2 | ecosystem.config.cjs at root |
| Reverse proxy | nginx | nginx.conf at root |

---

## 3. Monorepo Structure

```
pulseos/
├── .env                          # Backend environment variables (dotenv/config)
├── apps/
│   ├── api/src/
│   │   ├── collectors/      # Linux /proc readers — Linux-only, graceful fallbacks
│   │   ├── db/index.ts      # Single file — all DB queries + migrate()
│   │   ├── routes/          # One file per domain
│   │   ├── ws/hub.ts        # Socket.IO broadcaster + collection loop
│   │   ├── alerts.ts        # Threshold engine + notification dispatch (Telegram, Discord, Webhooks)
│   │   ├── middleware/auth.ts  # requireAuth, requireAdmin, requireOwner, requireApiKey
│   └── web/src/
│       ├── .env              # Frontend PUBLIC_API_URL (Astro/Vite)
│       ├── components/
│       │   ├── dashboard/   # MetricCard, Dashboard (router), NetworkPage
│       │   ├── charts/      # SparkLine
│       │   ├── containers/  # ContainersPage
│       │   ├── history/     # HistoryPage
│       │   ├── alerts/      # AlertsPage, SettingsPage
│       │   ├── services/    # ServicesTable, ProcessTable, ProcessesPage
│       │   ├── servers/     # ServersPage, TeamPage
│       │   ├── saas/        # BillingPage, ApiKeysPage
│       │   ├── shared/      # ErrorBoundary, ErrorState
│       │   └── layout/      # Sidebar, Topbar
│       ├── hooks/useSocket.ts
│       ├── stores/metrics.ts
│       ├── lib/utils.ts
│       └── pages/           # index.astro, status.astro, accept-invite.astro
└── packages/types/src/index.ts
```

---

## 4. Coding Standards

### TypeScript
- Strict mode enabled. No `any` except where explicitly required (Fastify preHandler callbacks).
- Always type function parameters and return values.
- Import types with `import type { ... }` (not `import { ... }`).

### API Routes
- All routes registered in `apps/api/src/index.ts` via `app.register()`.
- Each route file exports one `async function xxxRoutes(app: FastifyInstance)`.
- Auth: use `requireAuth` (viewer+) or `requireAdmin`/`requireOwner` from `middleware/auth.ts`.
- Always return `{ ok: true, data: ... }` or `{ ok: false, error: string }`.

### Database
- ALL queries live in `apps/api/src/db/index.ts`. No raw SQL in route files.
- Schema changes: add to `migrate()` function using `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`.
- No ORM. Use `better-sqlite3` prepared statements directly.
- Timestamps: always milliseconds Unix epoch (`Date.now()`), stored as INTEGER.

### Frontend Components
- All interactive components are React (`.tsx`). Astro pages are shells only.
- Navigation: `useMetricsStore().setPage(id)` — NOT React Router, NOT `<a href>`.
- API calls: always include `Authorization: Bearer ${token}` header. Token from `useAuthStore().token`.
- Format bytes/uptime with `lib/utils.ts` functions — never inline formatting.
- No CSS-in-JS. Tailwind classes only. Use custom tokens: `surface-0/1/2/3`, `surface-border`, `accent-blue/green/amber/red/purple`.

### WebSocket
- Client subscribes via `socket.emit('subscribe', { channels: [...] })`.
- Server emits on channels: `metrics:snapshot`, `metrics:containers`, `metrics:services`, `metrics:processes`, `alert:fired`.
- `useSocket` hook wires all events to Zustand store automatically.

---

## 5. Architecture Constraints

1. **Linux-only collectors**: All `apps/api/src/collectors/` files read from `/proc/*` and `/etc/hostname`. They will FAIL on macOS/Windows. Wrap in try/catch with fallbacks (already done in `collectors/index.ts`).
2. **Single SQLite instance**: `getDb()` returns a singleton. Never create a second Database instance.
3. **No migrations system**: `migrate()` uses `CREATE IF NOT EXISTS`. Column additions use `ALTER TABLE ADD COLUMN` wrapped in try/catch — never add bare ALTER TABLE statements inside `db.exec()` without a guard.
4. **RBAC implemented (Phase 3A)**: Three roles: `owner` > `admin` > `viewer`. `users` table now has `role`, `email`, `last_login_at` columns. JWT contains `{ sub, username, role }`. Middleware stack: `requireAuth` (any valid JWT), `requireAdmin` (owner or admin), `requireOwner` (owner only). Frontend sidebar filters nav items by role.
5. **JWT payload shape**: `{ sub: number, username: string, role: UserRole }` — role is embedded in JWT, decoded client-side via `decodeRoleFromToken()` for refresh persistence. Role stored in Zustand `useAuthStore` + `localStorage(pulse_role)`.
6. **Astro output is static**: `output: 'static'` in `astro.config.mjs`. All data fetching happens client-side.

---

## 6. Security-Sensitive Areas

| Area | Risk | Current State |
|---|---|---|
| `JWT_SECRET` env var | Defaults to `'dev-secret-change-me'` if not set | `process.exit(1)` in production — enforced in V1-01 |
| Stripe webhook | Signature NOT cryptographically verified | Marked as simplified — see `billing.ts:137` |
| API key storage | Keys now hashed with sha256 before storage (V1-07) | `key_hash` column stores sha256 hash |
| Docker socket | `/var/run/docker.sock` exposed to API process; container mutations gated behind `requireAdmin` (Phase 3E) | Run API as non-root with socket access via group |
| `requireAuth` middleware | Fixed in Phase 3A — `return` added after `reply.send()` | ✅ Fixed |
| `x-api-key` auth | API keys validated via `requireApiKey` middleware; hashed with sha256 | ✅ Implemented |
| Input validation | Fastify JSON schema on all POST routes (V1-02) | ✅ Fixed |
| CORS | Single origin from `WEB_ORIGIN` env | OK for self-hosted, needs updating for SaaS |
| Rate limiting | 100 req/min per IP globally | May need per-route tuning for production |
| Public `/status` endpoint | No auth, CORS `*` | By design — public status page |

---

## 7. Rules Future Agents MUST Follow

1. **Never modify `packages/types/src/index.ts` without updating all consumers** — this file is the contract between frontend and backend.
2. **Never add SQL directly to route files** — always add a query function to `db/index.ts`.
3. **Never use `localStorage` in React components** — use Zustand store. (`localStorage` is only used in `useAuthStore` init and `LoginPage`).
4. **Never remove graceful fallbacks from collectors** — each collector wraps in `Promise.allSettled` via `collectAll()`.
5. **Never expose Docker socket URL or API tokens in frontend bundle** — `apiToken` is never sent to the client in `serversRoutes GET /`.
6. **Always use `font-mono` on metric values** — part of the terminal-inspired design contract.
7. **When adding a new page**: (a) add `PageId` to types, (b) add nav item to `Sidebar.tsx`, (c) add title to `PAGE_TITLES` in `Dashboard.tsx`, (d) add render condition in Dashboard router.
8. **DB schema changes require appending to `migrate()` only** — never recreate tables.
9. **Do not use `node-telegram-bot-api` package** — previously in `package.json` but removed (V1-03). Alerts use direct `fetch()` to Telegram API.
10. **When adding a new protected route**: (a) use `requireAuth` for viewer+ access, (b) use `requireAdmin` for owner/admin access, (c) use `requireOwner` for owner-only access — all from `middleware/auth.ts`. Never inline role checks.
11. **Body limit is enforced**: Fastify `bodyLimit: 1_048_576` (1MB). Do not remove or increase without careful consideration for 2GB VPS memory budget.
12. **`ALTER TABLE ADD COLUMN` is not idempotent in SQLite** — it will fail if the column already exists. Wrap each ALTER TABLE in try/catch after the main `db.exec()` block. Never place bare ALTER TABLE inside the shared exec call.
13. **Accept-invite pages use vanilla JS** — `accept-invite.astro` follows the `status.astro` pattern: self-contained HTML + inline `<script type="module">`, no React. Target user is not yet authenticated when visiting this page.
14. **Webhook secrets are auto-generated** — `createWebhook()` in `routes/apikeys.ts` generates a 24-char secret via `crypto.randomUUID()`. The secret is returned once at creation and stored in the `webhooks` table. No HMAC signature generation is performed on outgoing webhook payloads.
15. **Two `.env` files, different scopes**: Root `.env` is for backend (`process.env` via `import 'dotenv/config'`). `apps/web/.env` is for frontend (`PUBLIC_API_URL` via Astro/Vite `define`). They do NOT share variables. Backend env vars go in root `.env`; frontend `PUBLIC_*` vars go in `apps/web/.env`.
16. **Error pages use shared components**: `ErrorBoundary` wraps the root `<App />` to catch React crashes. `ErrorState` provides 5 typed error views (404, 500, offline, crash, generic). Always use `ErrorState` for error display — never inline error UI.
