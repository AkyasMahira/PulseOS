# AGENTS.md

## Build & Dev

- **Build order matters**: `@pulseos/types` must build first. Root `npm run build` handles this: `types → api + web` (parallel after types).
- **Dev**: `npm run dev` starts both API (`tsx watch`, port 3001) and web (`astro dev`, port 4321) concurrently.
- **Start (production)**: `npm run start` runs only the API (`node dist/index.js`). The frontend is static and served by nginx.
- **API dev uses `tsx watch`**, not `tsc --watch`. For a typecheck-only pass, run `npx tsc --noEmit` inside `apps/api`.

## Environment

- Copy `apps/api/.env.example` → `apps/api/.env` before running. On first boot, `ADMIN_USER`/`ADMIN_PASS` from `.env` seeds the initial admin into SQLite.
- `better-sqlite3` is a native C++ module — needs a compiler toolchain on install.

## Architecture

- `packages/shared/src/` exists but has **no source files**. It's vestigial. Do not use it.
- Alert routes live in `routes/metrics.ts` alongside metrics routes — there is no separate `routes/alerts.ts`.
- Socket.IO runs on path `/ws`, WebSocket transport only, JWT auth via handshake (`auth: { token }`).
- Astro output is **static** (`output: 'static'` in `astro.config.mjs`), not SSR. The status page (`status.astro`) is the only page that fetches API data at runtime.
- Auth middleware (`middleware/auth.ts`) exports `requireAuth` — a Fastify `preHandler` that calls `req.jwtVerify()`.

## Testing

- There are **no tests** anywhere. No test runner, no test config, no test deps. There is no `npm test` script.

## Production

- PM2 runs the API via `ecosystem.config.cjs` (entry: `apps/api/dist/index.js`, max 200MB memory).
- nginx proxies `/api/` to `:3001` and `/ws/` for Socket.IO; static Astro build lives in `/var/www/pulseos`.
- `deploy.sh` orchestrates the full build + deploy pipeline.
