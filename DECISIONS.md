# DECISIONS.md — PulseOS Architectural Decisions

> Inferred from codebase analysis. Each decision includes evidence from code.

---

## D-01 — SQLite over PostgreSQL

**Decision**: Use SQLite (via `better-sqlite3`) as the primary database.

**Reason**: Optimized for single-server, self-hosted deployment. No separate database process. Near-zero memory overhead. WAL mode provides good concurrent read performance.

**Evidence**: `db/index.ts` — `db.pragma('journal_mode = WAL')`. `README.md` — "SQLite: perfect for single-server apps". `PLANS` constant shows `retentionDays` as a plan limit, implying eventual growth concern.

**Impact**: Prevents horizontal scaling and multi-instance deployment. Acceptable for self-hosted MVP and small teams. Migration path to PostgreSQL documented as future plan in README.

---

## D-02 — Fastify over Express

**Decision**: Use Fastify 4 as the API framework.

**Reason**: Lower memory footprint (critical on 2GB VPS), better TypeScript support, built-in JSON schema validation, plugin architecture.

**Evidence**: `apps/api/package.json` — `"fastify": "^4.27.0"`. All routes use `FastifyInstance` type. JSON schema on login route demonstrates intended pattern.

**Impact**: ~30% less memory than Express equivalent. Plugin pattern (`app.register()`) enforces route isolation.

---

## D-03 — Socket.IO over Native WebSocket

**Decision**: Use Socket.IO for realtime communication instead of native WebSocket.

**Reason**: Built-in reconnection, room/channel subscriptions, polling fallback for restrictive networks.

**Evidence**: `ws/hub.ts` — `new SocketServer(...)` with `transports: ['websocket', 'polling']`. `hooks/useSocket.ts` — `io(API_URL, { path: '/ws' })`. Note: `@fastify/websocket` is listed as a dependency but unused.

**Impact**: ~23KB client bundle overhead. Polling fallback adds reliability. Channel subscription model (`socket.join(ch)`) allows future per-server subscriptions.

---

## D-04 — Direct `/proc` Reading over `systeminformation` Library

**Decision**: Read system metrics directly from Linux `/proc` filesystem instead of using the `systeminformation` npm package (which was recommended in the project brief).

**Reason**: Zero-dependency metrics collection. Lower overhead. Full control over parsing. `systeminformation` adds ~2MB and spawns child processes internally.

**Evidence**: All collector files (`cpu.ts`, `mem.ts`, `net.ts`) use `fs/promises.readFile('/proc/...')`. No `systeminformation` import anywhere in the codebase.

**Impact**: Linux-only. Will fail on macOS/Windows dev environments. All collectors gracefully handle failures via `Promise.allSettled` in `collectors/index.ts`.

---

## D-05 — Monorepo with npm Workspaces

**Decision**: Single repository with `apps/*` and `packages/*` using npm workspaces.

**Reason**: Share TypeScript types between frontend and backend without publishing to npm. Single `npm install` at root.

**Evidence**: Root `package.json` — `"workspaces": ["apps/*", "packages/*"]`. All packages import `@pulseos/types` as `"*"` workspace dependency.

**Impact**: Types are the single source of truth for frontend-backend contracts. Changing `packages/types/src/index.ts` requires rebuild of both apps. `packages/shared` directory was created but never populated.

---

## D-06 — Astro Static Output + React Islands

**Decision**: Use Astro with `output: 'static'` and React as the UI framework via `client:only="react"`.

**Reason**: Astro adds zero-JS overhead for shell pages. React islands handle interactive dashboard. Static output means dashboard can be served by nginx directly without a Node.js server.

**Evidence**: `astro.config.mjs` — `output: 'static'`. `pages/index.astro` — `<App client:only="react" />`. `pages/status.astro` — pure HTML + vanilla JS (no React needed).

**Impact**: Cannot use Astro SSR features. All data fetching is client-side. Public pages (`/status`) use vanilla JS for simplicity.

---

## D-07 — JWT Embedded Role Claim (✅ Implemented)

**Decision**: Embed `role` in the JWT payload rather than fetching it from DB on each request.

**Reason**: Avoids DB lookup on every authenticated request. Simplifies middleware.

**Evidence**: `routes/auth.ts` — `app.jwt.sign({ sub: user.id, username: user.username, role: user.role })`. `middleware/auth.ts` — `requireAdmin` and `requireOwner` cast `req.user as JwtUser` and check `role` directly. Frontend `stores/metrics.ts` — `decodeRoleFromToken()` reads role from JWT payload via `atob()` for page-refresh persistence.

**Impact**: Role changes won't take effect until user re-authenticates (token expiry or re-login). Acceptable for 7-day JWT expiry in a small team context.

---

## D-08 — In-Memory Remote Server Cache (📋 Planned)

**Decision (Planned)**: Cache remote server snapshots in a `Map` (`remoteCache`) in API process memory rather than persisting to SQLite.

**Reason**: Simplifies implementation. Remote snapshots are ephemeral — stale on restart is acceptable.

**Current State**: Not yet implemented. No `routes/servers.ts` file exists. Planned for Phase 3.

**Evidence (planned)**: Will create `const remoteCache = new Map<string, RemoteServerStatus>()` in `routes/servers.ts`. No DB insert for remote metrics.

**Impact (planned)**: Remote server status lost on API restart. No historical data for remote servers.

---

## D-09 — Single-Callback Alert Notification Pattern

**Decision**: Alert notifications use a single registered callback (`alertCallback`) fed from Socket.IO hub.

**Reason**: Decouples alert engine from WebSocket layer. Alert engine fires → callback set by hub → broadcasts to clients.

**Evidence**: `alerts.ts:73` — `let alertCallback: AlertCallback | null = null`. `ws/hub.ts` — `onAlert((event) => { io?.emit('alert:fired', event) })`.

**Impact**: Only one callback can be registered. If a second caller registers via `onAlert()`, the previous callback is replaced. Webhook delivery will need to either use this same callback pattern or call `listWebhooks()` directly inside `fireAlert()`.

---

## D-10 — Plan Definitions as Code Constants (📋 Planned)

**Decision (Planned)**: Billing plan definitions (`PLANS` constant) will live in `routes/billing.ts` as a TypeScript constant, not in the database.

**Reason**: Plans rarely change. Avoids DB seeding complexity. Easy to modify in code for self-hosted users who want custom limits.

**Current State**: Not yet implemented. No `routes/billing.ts` file exists. No `subscription` table. Planned for Phase 4.

**Impact**: Plan changes require API redeployment. Cannot be changed at runtime. Self-hosters can easily override limits by editing the file.

---

## D-11 — Individual Middleware Functions per Role Level

**Decision**: Create three separate middleware functions (`requireAuth`, `requireAdmin`, `requireOwner`) rather than a single parameterized middleware or `hasRole()` utility.

**Reason**: Simple, explicit, and self-documenting at the route registration level. Each function has a clear, single responsibility. TypeScript provides type safety on the `JwtUser` interface.

**Evidence**: `middleware/auth.ts` — Three exported async functions, each with `FastifyRequest` + `FastifyReply` signature. Route files import the exact middleware needed (e.g., `preHandler: requireAdmin`).

**Impact**: Slightly more code than a single parameterized middleware, but dramatically clearer at call sites. Adding a new role level requires adding a new function.

---

## D-12 — DB Query Functions Before Route Handlers

**Decision**: Implement all database access functions (CRUD for users, invites, servers, API keys, webhooks) before writing route handlers that use them.

**Reason**: Separates data layer concerns from HTTP layer concerns. All query functions live in `db/index.ts` making it the single source of truth for DB access. Route handlers only call exported functions — never write raw SQL.

**Evidence**: `db/index.ts` lines 209-366 contain 13 new query functions (user management, invites, servers, API keys, webhooks) with no corresponding route handlers yet. This follows the pattern set in AGENTS.md rule #2.

**Impact**: Changes the development order for Phase 3 sub-phases: DB schema + queries first, then route handlers, then frontend pages. This commit completed the DB schema + query layer for all Phase 3 features at once.

---

## D-13 — Placeholder Stub Pages for Future Phases

**Decision**: Add rendering entries in Dashboard.tsx and placeholder components for ServersPage, TeamPage, and ApiKeysPage before they are fully implemented.

**Reason**: Enables adding navigation items and PageId types without breaking the dashboard. The stubs display "Coming in Phase 3B/3C/3D" messages, providing clear status to developers.

**Evidence**: `components/servers/ServersPage.tsx` (9 lines) — returns placeholder div. `components/servers/TeamPage.tsx` (9 lines) — same pattern. `components/saas/ApiKeysPage.tsx` (9 lines) — same pattern. All wired into `Dashboard.tsx` router.

**Impact**: Users will see placeholder pages if navigation allows access before features are implemented. Sidebar hides these pages from viewers via `requireRole` filter but owner/admin can access them.
