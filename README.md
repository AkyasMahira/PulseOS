# <p align="center">PulseOS</p>

<p align="center">
  <strong>Real-time infrastructure monitoring dashboard for Linux servers, containers, and services.</strong>
</p>

<p align="center">
  Lightweight · Self-hosted · Modern observability for VPS environments
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/AkyasMahira/pulseos?style=for-the-badge&color=0ea5e9" />
  <img src="https://img.shields.io/github/license/AkyasMahira/pulseos?style=for-the-badge&color=22c55e" />
  <img src="https://img.shields.io/github/package-json/v/AkyasMahira/pulseos?style=for-the-badge&color=f59e0b" />
  <img src="https://img.shields.io/github/commit-activity/m/AkyasMahira/pulseos?style=for-the-badge&color=8b5cf6" />
</p>

<p align="center">
  <a href="https://github.com/AkyasMahira/pulseos/stargazers">
    <img src="https://img.shields.io/badge/follow-github-181717?style=for-the-badge&logo=github" />
  </a>
  <a href="https://t.me/YOUR_TELEGRAM">
    <img src="https://img.shields.io/badge/chat-telegram-26A5E4?style=for-the-badge&logo=telegram" />
  </a>
</p>

---

<p align="center">
  <img src="https://github.com/user-attachments/assets/2f85ea00-1ac9-4a9a-9b59-449ffe4e2184" alt="PulseOS Dashboard" width="100%" />
</p>

---

<p align="center">
  <strong>Fastify</strong> · <strong>Socket.IO</strong> · <strong>Astro</strong> · <strong>React</strong> · <strong>SQLite</strong>
</p>

---

## ✨ Features

### Real-time Monitoring

* Live CPU, RAM, Disk, and Network metrics
* Process and service monitoring
* Docker container tracking
* Historical metrics & activity logs

### Infrastructure Observability

* WebSocket-based live telemetry
* Lightweight `/proc` collectors
* SQLite metrics persistence
* Alert rules & monitoring system

### Dashboard Experience

* Modern dark UI
* Responsive dashboard layout
* Dedicated monitoring pages
* Lightweight frontend architecture

### Notifications & Alerts

* Telegram alert integration
* Discord webhook support
* Service health monitoring

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

### Authentication

<img width="2624" height="1530" alt="pulseos-login" src="https://github.com/user-attachments/assets/5a0e5714-dde9-407c-ad8a-23a7dcb273d5" />

---

## 🏗️ Architecture

```text
[ Linux /proc + Docker socket ]
                ↓
[ Fastify API + Collectors ]
                ↓
[ Socket.IO Realtime Hub ]
                ↓
[ Astro + React Dashboard ]
```

PulseOS collects infrastructure telemetry directly from Linux system interfaces and streams them to the frontend using WebSockets for low-latency real-time updates.

---

## 🚀 Quick Start

### Requirements

* Node.js 20+
* Linux VPS (Ubuntu 22.04 recommended)
* PM2
* nginx + certbot (production)

### Installation

```bash
git clone <repo> pulseos
cd pulseos

npm install

cp apps/api/.env.example apps/api/.env
nano apps/api/.env

npm run dev
```

### Development URLs

| Service   | URL                     |
| --------- | ----------------------- |
| API       | `http://localhost:3001` |
| Dashboard | `http://localhost:4321` |

---

## ⚙️ Environment Variables

Location: `apps/api/.env`

| Variable                 | Description                 |
| ------------------------ | --------------------------- |
| `PORT`                   | API port                    |
| `JWT_SECRET`             | Authentication secret       |
| `ADMIN_USER`             | Initial admin username      |
| `ADMIN_PASS`             | Initial admin password      |
| `COLLECT_INTERVAL_MS`    | Metrics collection interval |
| `WATCH_SERVICES`         | Services to monitor         |
| `WATCH_PM2`              | Monitor PM2 processes       |
| `DOCKER_SOCKET`          | Docker socket path          |
| `HISTORY_RETENTION_DAYS` | Metrics retention           |
| `TELEGRAM_BOT_TOKEN`     | Telegram integration        |
| `TELEGRAM_CHAT_ID`       | Telegram target             |
| `DISCORD_WEBHOOK_URL`    | Discord alerts              |
| `WEB_ORIGIN`             | Allowed frontend origin     |

---

## 📦 Project Structure

```text
pulseos/
├── apps/
│   ├── api/         # Fastify backend + collectors
│   └── web/         # Astro + React frontend
├── packages/
│   └── types/       # Shared TypeScript types
└── deploy.sh
```

---

## 🧠 Resource Usage

Target usage on a 2 vCPU / 2GB VPS:

| Component     | Usage    |
| ------------- | -------- |
| API idle RAM  | ~40MB    |
| CPU usage     | <1%      |
| SQLite growth | ~1MB/day |

Designed to stay lightweight even on low-resource VPS environments.

---

## 🛣️ Roadmap

* [x] Realtime infrastructure monitoring
* [x] Docker tracking & metrics history
* [x] Alert rules & notifications
* [ ] Multi-server management
* [ ] Public status pages
* [ ] Team accounts & RBAC
* [ ] SaaS deployment platform
* [ ] Billing & subscription system

---

## 🧩 Philosophy

PulseOS focuses on:

* lightweight infrastructure monitoring
* realtime observability
* self-hosted simplicity
* minimal operational overhead

Built for developers who want modern monitoring without heavyweight enterprise stacks.

---

## 📄 License

MIT License
