# AGENTS.md — PulseOS AI Agent Guide

> Compact reference for AI agents working on this codebase. For deeper context: `DECISIONS.md`, `AUDIT_LOG.md`, `TODO_AI.md`.

## Project Identity

**PulseOS** — self-hosted VPS monitoring dashboard with SaaS upgrade path.
- Monorepo: `apps/api` (Fastify), `apps/web` (Astro + React), `packages/types` (shared TS)
- Runtime: Node.js 20+, ESM (`"type": "module"`), target: 2 vCPU / 2 GB RAM Linux VPS

## Tech Stack

| Layer | Tech | Surprise? |
|---|---|---|
| API | Fastify 4 | NOT Express. Plugin pattern via `app.register()`. |
| Auth | @fastify/jwt + bcryptjs | JWT in `Authorization: Bearer` header. Payload: `{ sub, username, role }`. |
| Realtime | Socket.IO 4 | Path `/ws`. JWT auth on handshake. Channel subscription model. |
| DB | SQLite via better-sqlite3 | WAL mode, synchronous queries, single singleton instance. No ORM. |
| Frontend | Astro 4 + React 18 | `output: 'static'` (SSR disabled). `client:only="react"` for islands. |
| State | Zustand 4 | `useMetricsStore` + `useAuthStore`. NEVER use localStorage in components. |
| Styling | TailwindCSS 3 | Dark mode only. Custom tokens: `surface-0/1/2/3`, `surface-border`, `accent-*`. |
| Charts | Recharts 2 | Must use `isAnimationActive={false}` for performance. |
| Types | `@pulseos/types` workspace | Single source of truth. NEVER redefine types in apps. |

## Commands

```bash
npm run dev        # Starts API (tsx watch) + Web (astro dev) concurrently
npm run build      # Builds types → api → web IN ORDER (dependency chain)
npm run start      # Production: runs apps/api/dist/index.js
```

**Build order matters**: `packages/types` must build first. `apps/api` and `apps/web` import from `@pulseos/types` which resolves to `packages/types/dist/index.js`.

**Type-check**: No dedicated `tsc --noEmit` script at root. Each package has its own:
```bash
npx -w packages/types tsc --noEmit
npx -w apps/api tsc --noEmit
# apps/web has no tsconfig.json — Astro/Vite handles type checking internally
```

**No test suite**: Zero tests anywhere. Never try to run tests — there are none.

## Key Directories

```
apps/api/src/
  collectors/    # Linux /proc readers — fail on macOS/Windows (handled via Promise.allSettled)
  db/index.ts    # ALL SQL lives here (444 lines, 40+ functions). Route files NEVER write raw SQL.
  routes/        # One file per domain. Each exports `async function xxxRoutes(app: FastifyInstance)`.
  ws/hub.ts      # Socket.IO server + 5s collection loop
  alerts.ts      # Threshold engine + Telegram/Discord/Webhook dispatch
  middleware/auth.ts  # requireAuth, requireAdmin, requireOwner, requireApiKey

apps/web/src/
  components/    # All interactive UI is React (.tsx). Astro pages are shells only.
  stores/metrics.ts  # Zustand — all live state + page router + auth
  hooks/useSocket.ts # Wires Socket.IO events into Zustand store
  lib/utils.ts   # fmtBytes, fmtUptime, fmtPct — always use these, never inline

packages/types/src/index.ts  # Contract between frontend and backend. Update consumers when changed.
```

## Coding Standards

### API (Fastify)
- Routes registered via `app.register()` in `apps/api/src/index.ts`.
- Response shape: `{ ok: true, data: ... }` or `{ ok: false, error: string }`.
- Auth: import middleware from `middleware/auth.ts`. Viewer+ = `requireAuth`. Admin/Owner = `requireAdmin`. Owner only = `requireOwner`. Never inline role checks.
- Input validation: Fastify JSON `schema.body` on all POST routes.

### Database (SQLite)
- All queries in `apps/api/src/db/index.ts`. Add query functions there, call from routes.
- Schema changes: append to `migrate()` using `CREATE TABLE IF NOT EXISTS`.
- `ALTER TABLE ADD COLUMN` is NOT idempotent in SQLite. Always wrap in individual try/catch.
- Timestamps: milliseconds Unix epoch (`Date.now()`), stored as INTEGER.

### Frontend (Astro + React)
- Navigation: `useMetricsStore().setPage(id)` — NOT React Router, NOT `<a href>`.
- API calls: `Authorization: Bearer ${useAuthStore().token}` always.
- Formatting: use `lib/utils.ts` functions. Metric values MUST use `font-mono`.
- No CSS-in-JS. Tailwind classes only.
- Notification settings and status page title are DB-backed (take priority over `.env`).

### TypeScript
- Strict mode. No `any` except in Fastify preHandler callbacks.
- Import types: `import type { ... }` not `import { ... }`.
- All `apps/api` imports use `.js` extension (e.g. `import { getDb } from './db/index.js'`) despite source being `.ts` — this is required by ESM NodeNext moduleResolution.

### New Page Checklist
1. Add `PageId` to `packages/types/src/index.ts`
2. Add nav item to `components/layout/Sidebar.tsx` (with `requireRole` if gated)
3. Add title to `PAGE_TITLES` in `components/dashboard/Dashboard.tsx`
4. Add render condition in Dashboard page router

## Architecture Constraints

1. **Linux-only collectors**: All `collectors/` read `/proc`. Will fail on macOS/Windows. Graceful fallbacks via `Promise.allSettled` in `collectors/index.ts`. `collectAll()` runs 9 operations in parallel.
2. **Single SQLite instance**: `getDb()` is a singleton. Never create a second Database instance.
3. **ASTRO is static**: `output: 'static'` — all data fetching is client-side. Accept-invite pages use vanilla JS (no React).
4. **Two `.env` files**: Root `.env` = backend (loaded by `dotenv/config`). `apps/web/.env` = frontend (`PUBLIC_API_URL` loaded by Vite `loadEnv` in `astro.config.mjs`). They do NOT share variables.
5. **`process.exit(1)` in production**: If `JWT_SECRET` is default and `NODE_ENV === 'production'`, the API refuses to start.
6. **PM2 uses CommonJS**: `ecosystem.config.cjs` is `.cjs` because PM2 doesn't support ESM configs.

## RBAC

Three roles: `owner` > `admin` > `viewer`.
- JWT contains `{ sub, username, role }`. Role decoded client-side via `decodeRoleFromToken()`.
- Role changes take effect on next login (JWT claim staleness, 7-day expiry).
- Sidebar filters nav items by `requireRole`. `servers`, `team`, `apikeys` hidden from viewers.
- Container mutations (start/stop/restart/remove) and alert rule CRUD require `requireAdmin`.

## Active Constraints

- Body limit: `1_048_576` (1MB). Do NOT increase without considering 2GB VPS budget.
- API keys: sha256 hashed before storage. `apiToken` stripped from all server GET responses.
- `node-telegram-bot-api` package is NOT used. Alerts use direct `fetch()` to Telegram API.
- `docker.sock` exposed to API. Container mutations gated behind `requireAdmin`. Run API as non-root with socket group access.
