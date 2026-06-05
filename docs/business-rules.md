# docs/business-rules.md — PulseOS Business Rules

> Extracted from implementation. Status: **Implemented** | **Partial** | **Planned** | **Not Implemented**

---

## 1. Authentication & Session Rules

### BR-AUTH-01 — First-Run Setup
- **Status**: Implemented
- If `userCount() === 0`, the `/api/auth/setup` endpoint is **open** (no auth required).
- After the first user is created, `/api/auth/setup` returns HTTP 403 for all subsequent calls.
- The first user always receives the `owner` role.
- Alternatively, setting `ADMIN_USER` + `ADMIN_PASS` env vars automatically seeds an owner account on boot.

### BR-AUTH-02 — Login
- **Status**: Implemented
- Credentials verified with bcrypt (cost factor 12).
- On success, returns a JWT signed with `JWT_SECRET`, expires in 7 days.
- JWT payload contains: `{ sub: userId, username, role }`.
- Failed login always returns the same error ("Invalid credentials") — no username enumeration.
- `last_login_at` updated on each successful login.

### BR-AUTH-03 — JWT Expiry and Refresh
- **Status**: Partial
- JWTs expire in 7 days. No refresh token mechanism.
- Expired tokens result in 401. User must re-login.
- No session invalidation on logout — logout is client-side only (removes token from localStorage).

---

## 2. Role-Based Access Control (🚧 Phase 3A — foundation implemented)

### BR-RBAC-01 — Role Hierarchy
- **Status**: 🚧 Partially Implemented
- Three roles: `owner` > `admin` > `viewer`.
- Roles stored in `users.role` column (TEXT, default `'admin'`).
- Role embedded in JWT `{ sub, username, role }` claim.
- Middleware: `requireAuth` (any valid JWT), `requireAdmin` (owner or admin), `requireOwner` (owner only).
- Frontend sidebar filters nav items by `requireRole` array — `servers`, `team`, `apikeys` hidden from viewers.
- `viewer`: Read-only. Can view all dashboards. Cannot perform actions (container restart, alerts, team management). ⚠️ Route-level enforcement not yet applied to most API endpoints.
- `admin`: Can perform all monitoring actions. Can invite users (viewer or admin role only). Cannot access billing. Cannot delete owner.
- `owner`: Full access including billing, team management, deleting users, assigning any role.

### BR-RBAC-02 — Role Assignment Constraints
- **Status**: 🚧 Partially Implemented
- `updateUserRole(id, role)` and `deleteUser(id)` exist in `db/index.ts`.
- ⚠️ No route handlers call these functions yet — team management UI and API routes are planned for Phase 3B.
- Only `owner` can change user roles (enforced via `requireOwner` middleware when route is implemented).
- Only `owner` can delete users.
- `owner` cannot delete themselves.
- `admin` can only invite users with role `viewer` or `admin` (not `owner`).
- There is no restriction on multiple owners (any owner can promote another user to owner).

### BR-RBAC-03 — Billing Page Visibility
- **Status**: 📋 Planned
- Billing page only shown in sidebar for `owner` role.
- Backend billing endpoints checked via role middleware.

---

## 3. Team Invite Rules (🚧 Phase 3A — DB layer implemented)

### BR-TEAM-01 — Invite Lifecycle
- **Status**: 🚧 Partially Implemented
- `invites` table and CRUD functions (`createInvite`, `getInviteByToken`, `listInvites`, `deleteInvite`) exist in `db/index.ts`.
- ⚠️ No route handler or accept-invite page exists yet. Route handlers planned for Phase 3B.
- Invite token is valid for **48 hours** from creation.
- Tokens are UUID-based (32 hex characters after dashes stripped).
- Expired invites are automatically excluded from `listInvites()` query.
- Accepting an invite deletes the invite record from the table.
- Each invite is for a specific email address.

### BR-TEAM-02 — Invite Delivery
- **Status**: 📋 Planned
- The API returns the invite URL in the response body.
- Email sending requires nodemailer/SMTP integration.

---

## 4. Alert Rules

### BR-ALERT-01 — Rule Evaluation
- **Status**: Implemented
- Alert rules are evaluated after every metrics collection tick (default: every 5 seconds).
- Supported conditions: `gt` (greater than), `lt` (less than), `eq` (equal to).
- Supported metrics: `cpu`, `mem`, `disk`, `service`.
- Net (`net`) is defined in the type but has no `values` mapping in `evaluateAlerts()`.

### BR-ALERT-02 — Cooldown Enforcement
- **Status**: Implemented (in-memory only — lost on restart)
- Each rule has a `cooldownSecs` value. After an alert fires, the same rule cannot fire again until the cooldown expires.
- Cooldown state is stored in a `Map<ruleId, lastFiredTimestamp>` in process memory.
- On API restart, all cooldowns reset to zero.

### BR-ALERT-03 — Alert Channels
- **Status**: Partial
- `telegram`: Implemented via direct `fetch()` to Bot API.
- `discord`: Implemented via webhook URL.
- `email`: Defined in `AlertChannel` type but not implemented in dispatch logic.
- Channels are stored as a JSON array per rule.

### BR-ALERT-04 — Alert Resolution
- **Status**: Not Implemented
- Alert events are inserted when thresholds are crossed.
- `resolved_at` field exists in schema but is never set by the system.
- Alerts must be manually resolved (no current UI mechanism for this either).
- This causes incorrect uptime calculations on the public status page.

### BR-ALERT-05 — Alert Rule Scoping
- **Status**: Not Implemented
- `alert_rules.server_id` column exists but is always NULL.
- All rules currently evaluate against local server metrics only.
- Per-server alert rules are planned but not implemented.

---

## 5. Docker Container Rules

### BR-DOCKER-01 — Available Actions
- **Status**: Implemented
- Allowed actions: `start`, `stop`, `restart`, `pause`, `unpause`.
- `remove` action is defined in the `ContainerAction` type but is implemented as a separate `DELETE /api/docker/:id` endpoint (not via the `/:action` route).
- Invalid actions return HTTP 400.

### BR-DOCKER-02 — Log Access
- **Status**: Implemented (with known issue)
- Log tail is limited to max 500 lines (enforced server-side).
- Default tail: 100 lines.
- Logs include both stdout and stderr (`stdout=1&stderr=1`).
- Raw Docker multiplexed stream is returned — 8-byte frame headers are not stripped (known issue L-08).

---

## 6. Multi-Server Rules (🚧 Phase 3A — DB layer implemented)

### BR-SERVER-01 — Local Server
- **Status**: ✅ Implemented
- The local server is always present and is the primary monitored instance.
- It is represented with `id: 'local'` in the frontend but is not stored in the `servers` table.

### BR-SERVER-02 — Remote Servers
- **Status**: 🚧 Partially Implemented
- `servers` table and CRUD functions (`addServer`, `listServers`, `getServer`, `removeServer`) exist in `db/index.ts`.
- ⚠️ No route handler or polling loop exists yet. Route handlers planned for Phase 3C.
- Remote servers will be polled via HTTP GET to `{apiUrl}/api/metrics/now`.
- Authentication uses the stored `apiToken` as a Bearer token.
- Poll interval matches `COLLECT_INTERVAL_MS`.

### BR-SERVER-03 — API Token Security
- **Status**: 🚧 Partially Implemented
- ⚠️ `listServers()` returns `apiToken` directly. When route handlers are implemented, `apiToken` must be stripped from responses. The `ServerConfig` type has `apiToken: string` (not optional) — routes must never expose this field to clients.

---

## 7. Billing / Plan Rules (📋 Planned — Phase 4)

### BR-BILLING-01 — Plan Definitions
- **Status**: Planned

### BR-BILLING-02 — Limit Enforcement
- **Status**: Planned

### BR-BILLING-03 — Stripe Integration
- **Status**: Planned

### BR-BILLING-04 — Yearly Discount
- **Status**: Planned (pricing only)

---

## 8. API Key Rules (🚧 Phase 3A — DB layer implemented)

### BR-APIKEY-01 — Key Lifecycle
- **Status**: 🚧 Partially Implemented
- `api_keys` table and CRUD functions (`createApiKey`, `listApiKeys`, `getApiKeyByHash`, `touchApiKey`, `revokeApiKey`) exist in `db/index.ts`.
- ⚠️ No route handler or `x-api-key` middleware exists yet. Route handlers planned for Phase 3D.
- Keys with `pk_` prefix, 32 hex characters.
- Full key returned once at creation, never again.
- `prefix` (first 10 chars) for display.
- Keys scoped: `read`, `write`, `admin`.
- Keys belong to the creating user.

### BR-APIKEY-02 — Key Authentication
- **Status**: 🚧 Partially Implemented
- `getApiKeyByHash()` and `touchApiKey()` exist for verification and last-used tracking.
- ⚠️ No `x-api-key` header check middleware exists yet. Planned for Phase 3D.

---

## 9. Metrics Retention Rules

### BR-METRICS-01 — Retention Policy
- **Status**: Implemented
- Default retention: 30 days (configurable via `HISTORY_RETENTION_DAYS`).
- Pruning runs once per day via `setInterval(pruneOldMetrics, 86_400_000)` in `ws/hub.ts`.
- Both `metrics_history` and `disk_history` are pruned (though `disk_history` is never written).
- Plan-based retention limits (7/30/90/365 days) are defined but not enforced at prune time.

### BR-METRICS-02 — Collection Frequency
- **Status**: Implemented
- Default collection interval: 5 seconds (configurable via `COLLECT_INTERVAL_MS`).
- At 5s interval: ~17,280 rows/day per server in `metrics_history`.
- At 30-day retention: max ~518,400 rows for local server.
