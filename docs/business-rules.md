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

## 2. Role-Based Access Control (✅ Phase 3 — fully implemented)

### BR-RBAC-01 — Role Hierarchy
- **Status**: ✅ Implemented
- Three roles: `owner` > `admin` > `viewer`.
- Roles stored in `users.role` column (TEXT, default `'admin'`).
- Role embedded in JWT `{ sub, username, role }` claim.
- Middleware: `requireAuth` (any valid JWT), `requireAdmin` (owner or admin), `requireOwner` (owner only).
- Route enforcement (Phase 3E): container mutations and alert rule creation require `requireAdmin`.
- Frontend sidebar filters nav items by `requireRole` array — `servers`, `team`, `apikeys` hidden from viewers.
- `viewer`: Read-only. Can view all dashboards and container logs. Cannot restart/remove containers, create alert rules, manage team, or access servers/apikeys/team API endpoints.
- `admin`: Can perform all monitoring actions, container mutations, invite users (viewer or admin only), manage alerts. Cannot access billing or delete owner.
- `owner`: Full access including team management, deleting users, assigning any role.

### BR-RBAC-02 — Role Assignment Constraints
- **Status**: ✅ Implemented
- `PUT /api/team/users/:id/role` gated behind `requireOwner`. Only owner can change user roles.
- `DELETE /api/team/users/:id` gated behind `requireOwner`. Only owner can delete users.
- Owner cannot delete themselves (enforced server-side).
- Owner cannot change their own role (enforced server-side).
- `POST /api/team/invites` only allows invite roles `viewer` or `admin` (not `owner`). Enforced server-side.
- There is no restriction on multiple owners (any owner can promote another user to owner).

### BR-RBAC-03 — Billing Page Visibility
- **Status**: 📋 Planned
- Billing page only shown in sidebar for `owner` role.
- Backend billing endpoints checked via role middleware.

---

## 3. Team Invite Rules (✅ Phase 3B — fully implemented)

### BR-TEAM-01 — Invite Lifecycle
- **Status**: ✅ Implemented
- `routes/team.ts` provides full CRUD for invites. `POST /api/team/invites` creates invite (admin-gated). `DELETE /api/team/invites/:id` revokes (admin-gated).
- `accept-invite.astro` page validates token via `GET /api/team/invite-info`.
- `POST /api/team/accept-invite` creates user account and deletes invite.
- Invite token is valid for **48 hours** from creation.
- Tokens are UUID-based (32 hex characters after dashes stripped).
- Expired invites are automatically excluded from `listInvites()` query.
- Each invite is for a specific email address.

### BR-TEAM-02 — Invite Delivery
- **Status**: 🚧 Partially Implemented
- The API returns the invite URL in the response body (`inviteUrl` field).
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
- **Status**: ✅ Implemented (persisted in V1-06)
- Each rule has a `cooldownSecs` value. After an alert fires, the same rule cannot fire again until the cooldown expires.
- Cooldown state persisted to `alert_rules.last_fired_at` column. Loaded on startup via `loadAlertCooldowns()`.
- On API restart, cooldowns are preserved — no notification spam on reboot.

### BR-ALERT-03 — Alert Channels
- **Status**: ✅ Implemented (enhanced in Phase 3D)
- `telegram`: Implemented via direct `fetch()` to Bot API.
- `discord`: Implemented via webhook URL.
- `webhook`: Implemented via `fireAlert()` calling `listWebhooks()`. Dispatches to all enabled webhooks subscribed to `alert:fired` event. Includes `X-Webhook-Secret` header.
- `email`: Defined in `AlertChannel` type but not implemented in dispatch logic.
- Channels are stored as a JSON array per rule. Webhooks use the separate `webhooks` table.

### BR-ALERT-04 — Alert Resolution
- **Status**: ✅ Implemented (V1-04)
- `evaluateAlerts()` tracks active rule IDs in an `activeRules` Set.
- On each tick: rules that fire are added to `activeRules`. Rules that were active but no longer trigger have their `resolved_at` set via `resolveAlertsForRule()`.
- Resolution is automatic — no manual intervention required.
- Public status page uptime calculation now reflects resolved alerts correctly.

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

### BR-DOCKER-03 — RBAC on Container Actions
- **Status**: ✅ Implemented (Phase 3E)
- `POST /:id/:action` (start, stop, restart, pause, unpause): requires `requireAdmin` (owner or admin).
- `DELETE /:id` (remove container): requires `requireAdmin`.
- `GET /` (list containers) and `GET /:id/logs`: requires `requireAuth` (any authenticated user, including viewers).
- Viewers can monitor containers but cannot perform destructive actions.

---

## 6. Multi-Server Rules (✅ Phase 3C — fully implemented)

### BR-SERVER-01 — Local Server
- **Status**: ✅ Implemented
- The local server is always present and is the primary monitored instance.
- It is represented with `id: 'local'` in the frontend but is not stored in the `servers` table.

### BR-SERVER-02 — Remote Servers
- **Status**: ✅ Implemented
- `routes/servers.ts` provides full CRUD for remote servers (admin-gated).
- `startRemotePolling()` polls all servers via HTTP GET to `{apiUrl}/api/metrics/now` every `COLLECT_INTERVAL_MS`.
- Authentication uses the stored `apiToken` as a Bearer token.
- Results cached in `remoteCache` Map (in-memory, resets on restart).

### BR-SERVER-03 — API Token Security
- **Status**: ✅ Implemented
- `routes/servers.ts:10` — `stripToken()` function removes `apiToken` from all GET responses.
- The `ServerConfig` type has `apiToken: string` (required), but the route returns `Omit<ServerConfig, 'apiToken'>` to clients.
- Token is never exposed in frontend bundle or API responses.

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

## 8. API Key Rules (✅ Phase 3D — fully implemented)

### BR-APIKEY-01 — Key Lifecycle
- **Status**: ✅ Implemented
- `routes/apikeys.ts` provides full CRUD for API keys (admin-gated).
- Keys generated as `{prefix}{32-hex-uuid}`. Default prefix: `pk_`.
- Full key returned once at creation — stored in API response `fullKey` field.
- `prefix` (e.g., `pk_`) displayed in key list for identification.
- Keys scoped: `read`, `write`, `admin`.
- Keys belong to the creating user (`created_by` column).
- Key can be revoked via `DELETE /api/apikeys/:id`.

### BR-APIKEY-02 — Key Authentication
- **Status**: ✅ Implemented (enhanced in V1-07)
- `requireApiKey` middleware in `middleware/auth.ts` checks `x-api-key` header.
- Incoming key hashed with sha256 before comparing against stored `key_hash`.
- `touchApiKey()` updates `last_used_at` on successful auth.
- ✅ Keys stored as sha256 hash — not plaintext.

---

## 9. Metrics Retention Rules

### BR-METRICS-01 — Retention Policy
- **Status**: ✅ Implemented (enhanced in V1-05)
- Default retention: 30 days (configurable via `HISTORY_RETENTION_DAYS`).
- Pruning runs once per day via `setInterval(pruneOldMetrics, 86_400_000)` in `ws/hub.ts`.
- Both `metrics_history` and `disk_history` are written and pruned.
- Plan-based retention limits (7/30/90/365 days) are defined but not enforced at prune time.

### BR-METRICS-02 — Collection Frequency
- **Status**: Implemented
- Default collection interval: 5 seconds (configurable via `COLLECT_INTERVAL_MS`).
- At 5s interval: ~17,280 rows/day per server in `metrics_history`.
- At 30-day retention: max ~518,400 rows for local server.
