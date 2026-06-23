# <p align="center">PulseOS</p>

<p align="center">
  <strong>Open-source VPS monitoring dashboard with real-time metrics, multi-server support, and team management.</strong>
</p>

<p align="center">
  Lightweight · Self-hosted · RBAC · Alerts · Docker · Webhooks
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/AkyasMahira/pulseos?style=for-the-badge" />
  <img src="https://img.shields.io/github/package-json/v/AkyasMahira/pulseos?style=for-the-badge" />
</p>

<p align="center">
  <a href="https://t.me/tunamsam">
    <img src="https://img.shields.io/badge/chat-telegram-26A5E4?style=for-the-badge&logo=telegram" />
  </a>
</p>

---

<p align="center">
  <img
    src="https://github.com/user-attachments/assets/8524f18c-c6e0-4214-9399-ec1f431804b7"
    alt="PulseOS Banner"
    width="100%"
  />
</p>

<p align="center">
  <strong>Fastify</strong> · <strong>Socket.IO</strong> · <strong>Astro</strong> · <strong>React</strong> · <strong>SQLite</strong>
</p>

---

## ✨ Features

### Real-time Monitoring

- Live CPU, RAM, Disk, and Network metrics via `/proc` collectors
- Process and service monitoring (systemd + PM2)
- Docker container tracking with log viewer
- Historical metrics with 1h/6h/24h/7d range charts
- Per-interface network bandwidth breakdown

### Alert Engine

- Threshold-based alert rules (CPU, RAM, Disk, Service)
- Telegram and Discord notifications
- Webhook dispatch to external endpoints
- Per-rule cooldown enforcement
- Public status page (no auth required)

### Multi-Server

- Add and monitor remote PulseOS instances
- Automatic polling with online/offline detection
- Server cards with CPU/RAM/Disk gauges

### Team Management & RBAC

- Three roles: `owner`, `admin`, `viewer`
- Invite team members via shareable links (48h expiry)
- Role-based sidebar filtering
- Admin-gated container actions and alert configuration
- Owner-gated user deletion and role changes

### API Keys & Webhooks

- API key generation with one-time reveal
- Scoped keys: `read`, `write`, `admin`
- `x-api-key` header authentication
- Webhook management with event filtering

---

## 📸 Preview

### Dashboard Overview

<img width="2624" height="1448" alt="pulseos-dashboard" src="https://github.com/user-attachments/assets/2f85ea00-1ac9-4a9a-9b59-449ffe4e2184" />

### Alerts & Monitoring Rules

<img width="2624" height="1448" alt="pulseos-alerts" src="https://github.com/user-attachments/assets/b9bafd2c-59de-44d1-90bc-d51487486ddc" />

### Container Monitoring

<img width="2624" height="1448" alt="pulseos-container" src="https://github.com/user-attachments/assets/84674ae1-97ef-44b0-add6-ec7091e31385" />

### Process Monitoring

<img width="2624" height="1448" alt="pulseos-processes" src="https://github.com/user-attachments/assets/2c8efa3d-ba74-4e13-871f-435e971cbfe8" />

### Network Monitoring

<img width="2624" height="1448" alt="pulseos-network" src="https://github.com/user-attachments/assets/7a666c4b-a5a3-4820-acd6-a8a0077de536" />

---

## 🏗️ Architecture

```
[ Linux /proc + Docker socket + systemctl + PM2 ]
                     ↓
[ Fastify API + Collectors (every 5s) ]
                     ↓
[ Alert Engine → Telegram / Discord / Webhooks ]
                     ↓
[ Socket.IO Realtime Hub + REST API ]
                     ↓
[ Astro + React Dashboard (static) ]
```

PulseOS reads infrastructure telemetry directly from Linux system interfaces, evaluates alert rules, broadcasts via WebSocket for live updates, and serves a static dashboard through nginx.

---

## 🚀 Quick Start (Development)

### Requirements

- Node.js 20+
- Linux VPS (Ubuntu 22.04 recommended)
- PM2 and nginx (production only)

```bash
git clone https://github.com/AkyasMahira/pulseos.git
cd pulseos

npm install

cp .env.example .env
nano .env                    # set JWT_SECRET, ADMIN_USER, ADMIN_PASS
comm
echo "PUBLIC_API_URL=http://localhost:3001" > apps/web/.env

npm run dev
```

### Development URLs

| Service   | URL                     |
| --------- | ----------------------- |
| API       | `http://localhost:3001` |
| Dashboard | `http://localhost:4321` |
| Status    | `http://localhost:4321/status` |

### First-Run Setup

1. Open `http://localhost:4321` — you'll see the login page
2. Click the setup link or POST to `/api/auth/setup`:
   ```bash
   curl -X POST http://localhost:3001/api/auth/setup \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"your-password"}'
   ```
3. The first user is always created as `owner`

---

## ⚙️ Configuration

PulseOS uses **two** `.env` files:

### Root `.env` — Backend

All API configuration. Create from the template below:

```bash
# ── Server ───────────────────────────────────────────────
PORT=3001
HOST=0.0.0.0

# ── Security ─────────────────────────────────────────────
JWT_SECRET=change-this-to-a-long-random-string
# WARNING: Must override in production

# ── Auto-seed ────────────────────────────────────────────
ADMIN_USER=admin
ADMIN_PASS=changeme

# ── CORS ─────────────────────────────────────────────────
WEB_ORIGIN=http://localhost:4321

# ── Metrics ──────────────────────────────────────────────
COLLECT_INTERVAL_MS=5000
WATCH_SERVICES=nginx,ssh,cron
WATCH_PM2=true
HISTORY_RETENTION_DAYS=30

# ── Docker ───────────────────────────────────────────────
DOCKER_SOCKET=/var/run/docker.sock

# ── Status Page ──────────────────────────────────────────
STATUS_PAGE_TITLE=System Status
STATUS_PAGE_DESC=Real-time service status

# ── Alerts (optional) ────────────────────────────────────
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=
# DISCORD_WEBHOOK_URL=
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | API port |
| `HOST` | `0.0.0.0` | Bind address |
| `JWT_SECRET` | — | JWT signing key **(must change in production)** |
| `ADMIN_USER` | — | Auto-seed owner username |
| `ADMIN_PASS` | — | Auto-seed owner password |
| `WEB_ORIGIN` | `http://localhost:4321` | CORS origin + invite URLs |
| `COLLECT_INTERVAL_MS` | `5000` | Metrics polling interval |
| `WATCH_SERVICES` | `nginx,ssh,cron` | systemd services to monitor |
| `WATCH_PM2` | `true` | Monitor PM2 processes |
| `HISTORY_RETENTION_DAYS` | `30` | Metrics retention period |
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Docker socket path |
| `STATUS_PAGE_TITLE` | `System Status` | Public status page title |
| `STATUS_PAGE_DESC` | `Real-time service status` | Public status page description |
| `TELEGRAM_BOT_TOKEN` | — | Telegram Bot API token |
| `TELEGRAM_CHAT_ID` | — | Telegram chat/channel ID |
| `DISCORD_WEBHOOK_URL` | — | Discord webhook URL |
| `DB_PATH` | `apps/api/data/pulseos.db` | SQLite file path |

### `apps/web/.env` — Frontend

One variable for the API URL:

```bash
PUBLIC_API_URL=http://localhost:3001
```

---

## 🖥️ Production Deployment

### 1. Build

```bash
npm run build
```

This compiles TypeScript (`apps/api/dist/`) and builds the static frontend (`apps/web/dist/`).

### 2. Environment

```bash
cp .env.example .env    # if you have a template
nano .env               # set JWT_SECRET, ADMIN_USER, ADMIN_PASS
```

### 3. PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 4. nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/pulseos/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 5. TLS (Let's Encrypt)

```bash
certbot --nginx -d your-domain.com
```

---

## 📦 Project Structure

```
pulseos/
├── .env                          # Backend environment variables
├── package.json                  # npm workspaces
├── ecosystem.config.cjs          # PM2 process config
├── nginx.conf                    # Production nginx config
├── deploy.sh                     # Build + deploy script
│
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── index.ts          # Bootstrap + plugins + routes
│   │       ├── alerts.ts         # Alert engine + notifications
│   │       ├── collectors/       # Linux /proc readers (cpu, mem, disk, net, docker, services, processes)
│   │       ├── db/index.ts       # SQLite singleton + all queries
│   │       ├── middleware/
│   │       │   └── auth.ts       # requireAuth, requireAdmin, requireOwner, requireApiKey
│   │       ├── routes/
│   │       │   ├── auth.ts       # /api/auth — login, setup, me
│   │       │   ├── metrics.ts    # /api/metrics — snapshot, history, alerts
│   │       │   ├── docker.ts     # /api/docker — containers, actions, logs
│   │       │   ├── status.ts     # /status — public, no auth
│   │       │   ├── team.ts       # /api/team — users, invites, accept-invite
│   │       │   ├── servers.ts    # /api/servers — remote server CRUD + polling
│   │       │   └── apikeys.ts    # /api/apikeys — API keys + webhooks
│   │       └── ws/
│   │           └── hub.ts        # Socket.IO server + collection loop
│   │
│   └── web/
│       ├── .env                  # Frontend PUBLIC_API_URL
│       └── src/
│           ├── pages/
│           │   ├── index.astro           # Main dashboard shell
│           │   ├── status.astro          # Public status page
│           │   └── accept-invite.astro   # Team invite acceptance
│           ├── components/
│           │   ├── dashboard/   # Dashboard router, MetricCard, NetworkPage
│           │   ├── alerts/      # AlertsPage, SettingsPage
│           │   ├── containers/  # ContainersPage
│           │   ├── history/     # HistoryPage
│           │   ├── services/    # ServicesTable, ProcessTable, ProcessesPage
│           │   ├── servers/     # ServersPage, TeamPage
│           │   ├── saas/        # ApiKeysPage, (planned: BillingPage)
│           │   └── layout/      # Sidebar, Topbar
│           ├── hooks/useSocket.ts
│           ├── stores/metrics.ts
│           └── lib/utils.ts
│
└── packages/
    └── types/src/index.ts       # Shared TypeScript interfaces
```

---

## 🧠 Resource Usage

Target usage on a 2 vCPU / 2 GB RAM VPS (Ubuntu 22.04):

| Component     | Usage    |
| ------------- | -------- |
| API idle RAM  | ~40 MB   |
| CPU usage     | <1%      |
| SQLite growth | ~1 MB/day |

Designed to stay lightweight on low-resource VPS environments.

---

## 🛣️ Roadmap

- [x] Realtime infrastructure monitoring (Phase 1)
- [x] Docker tracking & metrics history (Phase 2)
- [x] Alert rules & notifications (Phase 2)
- [x] Public status pages (Phase 2)
- [x] Team accounts & RBAC (Phase 3)
- [x] Multi-server management (Phase 3)
- [x] API keys & webhooks (Phase 3)
- [x] Pre-release hardening (7 tasks — see `TODO_AI.md`)
- [x] v1.0.0 stable release
- [ ] Billing & subscription system (Phase 4)
- [ ] Email alert channel
- [ ] Password reset flow

---

## 🐛 Known Limitations

1. **Linux-only**: Collectors read `/proc` — will fail on macOS/Windows
2. **Single-node SQLite**: No horizontal scaling. WAL mode handles concurrent reads
3. **JWT role staleness**: Role changes require re-login (7-day JWT expiry)
4. **No test suite**: Zero tests across the codebase

See `CHANGELOG_AI.md` and `AUDIT_LOG.md` for full details.

---

## 🧩 Philosophy

PulseOS focuses on:

- Lightweight infrastructure monitoring
- Realtime observability via WebSocket
- Self-hosted simplicity
- Minimal operational overhead
- Terminal-inspired dark UI

Built for developers who want modern monitoring without heavyweight enterprise stacks.

---

## 🤝 Contributing

1. Read `AGENTS.md` — the AI agent guide with coding standards and constraints
2. Check `TODO_AI.md` for open tasks
3. Review `DECISIONS.md` for architectural context
4. Follow the monorepo structure: DB queries in `db/index.ts`, routes in `routes/`, types in `packages/types`

---

## 📄 License

MIT License
