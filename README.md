# PulseOS — Lightweight VPS Monitoring Dashboard

> Realtime metrics for your VPS. Dark, minimal, terminal-inspired.
> Stack: Fastify · Socket.IO · Astro · React · SQLite

## Architecture

```
[ Linux /proc + Docker socket ]
         ↓
[ Fastify API + collectors ]  ← reads /proc/stat, /proc/meminfo, /proc/net/dev, df
         ↓
[ Socket.IO — broadcasts every 5s ]
         ↓
[ Astro + React dashboard ]
```

## Requirements

- Node.js 20+
- Linux VPS (Ubuntu 22.04 recommended)
- PM2 (`npm i -g pm2`)
- nginx + certbot for production

## Quick Start

```bash
git clone <repo> pulseos && cd pulseos

# Install all workspace deps
npm install

# Copy env and configure
cp apps/api/.env.example apps/api/.env
nano apps/api/.env        # set JWT_SECRET, ADMIN_USER, ADMIN_PASS

# Dev mode (API + web in parallel)
npm run dev
# API  → http://localhost:3001
# Web  → http://localhost:4321
```

## Environment Variables (apps/api/.env)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | API port |
| `JWT_SECRET` | *(required)* | Long random string |
| `ADMIN_USER` | `admin` | Initial admin username |
| `ADMIN_PASS` | `changeme` | Initial admin password (min 8 chars) |
| `COLLECT_INTERVAL_MS` | `5000` | Metrics collection interval |
| `WATCH_SERVICES` | `nginx,ssh,cron` | Comma-separated systemd services to monitor |
| `WATCH_PM2` | `true` | Monitor PM2 processes |
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Docker socket path |
| `HISTORY_RETENTION_DAYS` | `30` | SQLite data retention |
| `TELEGRAM_BOT_TOKEN` | *(optional)* | Telegram bot for alerts |
| `TELEGRAM_CHAT_ID` | *(optional)* | Telegram chat/channel ID |
| `DISCORD_WEBHOOK_URL` | *(optional)* | Discord webhook for alerts |
| `WEB_ORIGIN` | `http://localhost:4321` | CORS allowed origin |

## Production Deploy

```bash
# 1. Install certbot & get SSL cert
sudo certbot --nginx -d your-domain.com

# 2. Update nginx.conf with your domain
sed -i 's/your-domain.com/yourdomain.com/g' nginx.conf

# 3. Build & deploy
chmod +x deploy.sh && ./deploy.sh
```

## Folder Structure

```
pulseos/
├── apps/
│   ├── api/                    # Fastify backend
│   │   └── src/
│   │       ├── collectors/     # /proc readers + Docker + services
│   │       │   ├── cpu.ts      # /proc/stat → CPU usage
│   │       │   ├── mem.ts      # /proc/meminfo → RAM usage
│   │       │   ├── disk.ts     # df → disk usage
│   │       │   ├── net.ts      # /proc/net/dev → bandwidth
│   │       │   ├── docker.ts   # Docker socket API
│   │       │   ├── services.ts # systemd + PM2
│   │       │   ├── processes.ts # /proc/{pid} top processes
│   │       │   └── index.ts    # collectAll() orchestrator
│   │       ├── db/             # SQLite (better-sqlite3)
│   │       ├── routes/         # REST: /api/auth, /api/metrics
│   │       ├── ws/hub.ts       # Socket.IO broadcaster
│   │       ├── alerts.ts       # Alert engine + Telegram/Discord
│   │       └── index.ts        # Fastify bootstrap
│   └── web/                    # Astro + React frontend
│       └── src/
│           ├── components/
│           │   ├── dashboard/  # MetricCard, Dashboard, LoginPage
│           │   ├── charts/     # SparkLine (Recharts)
│           │   └── services/   # ServicesTable, ProcessTable
│           ├── stores/         # Zustand (metrics + auth)
│           ├── hooks/          # useSocket (Socket.IO client)
│           └── lib/utils.ts    # fmtBytes, fmtUptime, etc.
└── packages/
    └── types/                  # Shared TypeScript interfaces
```

## Resource Usage

Target on a 2 vCPU / 2GB VPS:
- **API idle**: ~40MB RAM, <0.5% CPU
- **Collection spike** (5s): <1% CPU burst
- **SQLite**: ~1MB/day at 5s intervals

## Roadmap

- [x] Phase 1 — System metrics + realtime dashboard + SQLite
- [ ] Phase 2 — Docker monitoring + alerts + history charts  
- [ ] Phase 3 — Multi-server + public status page + team accounts
- [ ] Phase 4 — SaaS deployment + billing
