import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import type {
  AlertRule, AlertEvent, HistoryPoint, UserRole, TeamUser,
  Invite, ServerConfig, ApiKey, Webhook, ApiKeyScope,
} from '@pulseos/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '../../data/pulseos.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    import('fs').then(fs => fs.mkdirSync(path.dirname(DB_PATH), { recursive: true }))
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    migrate(db)
  }
  return db
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics_history (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      ts        INTEGER NOT NULL,
      cpu       REAL,
      mem_used  INTEGER,
      mem_total INTEGER,
      net_rx    INTEGER,
      net_tx    INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics_history(ts);

    CREATE TABLE IF NOT EXISTS disk_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ts         INTEGER NOT NULL,
      mountpoint TEXT,
      used       INTEGER,
      total      INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_disk_ts ON disk_history(ts);

    CREATE TABLE IF NOT EXISTS alert_rules (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      metric       TEXT NOT NULL,
      condition    TEXT NOT NULL,
      threshold    REAL NOT NULL,
      severity     TEXT NOT NULL,
      channels     TEXT NOT NULL,
      cooldown     INTEGER NOT NULL DEFAULT 300,
      enabled      INTEGER NOT NULL DEFAULT 1,
      created_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alert_events (
      id           TEXT PRIMARY KEY,
      rule_id      TEXT NOT NULL,
      rule_name    TEXT NOT NULL,
      severity     TEXT NOT NULL,
      message      TEXT NOT NULL,
      value        REAL NOT NULL,
      threshold    REAL NOT NULL,
      fired_at     INTEGER NOT NULL,
      resolved_at  INTEGER
    );

    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     TEXT UNIQUE NOT NULL,
      password     TEXT NOT NULL,
      created_at   INTEGER NOT NULL
    );

    -- Phase 3: add role, email, last_login_at columns to users (safe ALTER TABLE IF NOT EXISTS pattern)
    ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin';
    ALTER TABLE users ADD COLUMN email TEXT;
    ALTER TABLE users ADD COLUMN last_login_at INTEGER;

    CREATE TABLE IF NOT EXISTS invites (
      id           TEXT PRIMARY KEY,
      email        TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'viewer',
      token        TEXT UNIQUE NOT NULL,
      expires_at   INTEGER NOT NULL,
      created_by   INTEGER NOT NULL,
      created_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS servers (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      host         TEXT NOT NULL,
      api_url      TEXT NOT NULL,
      api_token    TEXT NOT NULL,
      tags         TEXT NOT NULL DEFAULT '[]',
      added_at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id           TEXT PRIMARY KEY,
      prefix       TEXT NOT NULL,
      key_hash     TEXT UNIQUE NOT NULL,
      scope        TEXT NOT NULL DEFAULT 'read',
      created_by   INTEGER NOT NULL,
      created_at   INTEGER NOT NULL,
      last_used_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id           TEXT PRIMARY KEY,
      url          TEXT NOT NULL,
      events       TEXT NOT NULL,
      secret       TEXT NOT NULL,
      enabled      INTEGER NOT NULL DEFAULT 1,
      created_at   INTEGER NOT NULL
    );
  `)
}

// ── Metrics history ──────────────────────────────────────────────────────────

export function insertMetric(
  ts: number, cpu: number, memUsed: number, memTotal: number, netRx: number, netTx: number
) {
  getDb().prepare(`
    INSERT INTO metrics_history (ts, cpu, mem_used, mem_total, net_rx, net_tx)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(ts, cpu, memUsed, memTotal, netRx, netTx)
}

export function getMetricsHistory(
  metric: 'cpu' | 'mem' | 'net_rx' | 'net_tx',
  from: number,
  to: number,
  limit = 500
): HistoryPoint[] {
  const colMap = { cpu: 'cpu', mem: 'CAST(mem_used AS REAL)/mem_total*100', net_rx: 'net_rx', net_tx: 'net_tx' }
  const col = colMap[metric]
  const rows = getDb().prepare(
    `SELECT ts as t, ${col} as v FROM metrics_history WHERE ts BETWEEN ? AND ? ORDER BY ts DESC LIMIT ?`
  ).all(from, to, limit) as HistoryPoint[]
  return rows.reverse()
}

export function pruneOldMetrics(retentionDays = 30) {
  const cutoff = Date.now() - retentionDays * 86_400_000
  getDb().prepare('DELETE FROM metrics_history WHERE ts < ?').run(cutoff)
  getDb().prepare('DELETE FROM disk_history WHERE ts < ?').run(cutoff)
}

// ── Alert rules ──────────────────────────────────────────────────────────────

export function getAlertRules(): AlertRule[] {
  return (getDb().prepare('SELECT * FROM alert_rules WHERE enabled = 1').all() as any[]).map(r => ({
    ...r,
    channels: JSON.parse(r.channels),
    enabled: r.enabled === 1,
    cooldownSecs: r.cooldown,
  }))
}

export function insertAlertRule(rule: Omit<AlertRule, 'id'>): string {
  const id = crypto.randomUUID()
  getDb().prepare(`
    INSERT INTO alert_rules (id, name, metric, condition, threshold, severity, channels, cooldown, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, rule.name, rule.metric, rule.condition, rule.threshold, rule.severity,
    JSON.stringify(rule.channels), rule.cooldownSecs, rule.enabled ? 1 : 0, Date.now())
  return id
}

// ── Alert events ─────────────────────────────────────────────────────────────

export function insertAlertEvent(e: AlertEvent) {
  getDb().prepare(`
    INSERT INTO alert_events (id, rule_id, rule_name, severity, message, value, threshold, fired_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(e.id, e.ruleId, e.ruleName, e.severity, e.message, e.value, e.threshold, e.firedAt, e.resolvedAt ?? null)
}

export function getRecentAlerts(limit = 50): AlertEvent[] {
  return (getDb().prepare(
    'SELECT * FROM alert_events ORDER BY fired_at DESC LIMIT ?'
  ).all(limit) as any[]).map(r => ({
    id: r.id, ruleId: r.rule_id, ruleName: r.rule_name,
    severity: r.severity, message: r.message, value: r.value,
    threshold: r.threshold, firedAt: r.fired_at, resolvedAt: r.resolved_at,
  }))
}

// ── Users ────────────────────────────────────────────────────────────────────

export function getUserByUsername(username: string) {
  return getDb().prepare(
    'SELECT id, username, password, role, email, last_login_at, created_at FROM users WHERE username = ?'
  ).get(username) as {
    id: number; username: string; password: string; role: UserRole
    email: string | null; last_login_at: number | null; created_at: number
  } | undefined
}

export function getUserById(id: number) {
  return getDb().prepare(
    'SELECT id, username, role, email, last_login_at, created_at FROM users WHERE id = ?'
  ).get(id) as TeamUser | undefined
}

export function getAllUsers(): TeamUser[] {
  return getDb().prepare(
    'SELECT id, username, role, email, last_login_at, created_at FROM users ORDER BY created_at ASC'
  ).all() as TeamUser[]
}

export function insertUser(username: string, hashedPassword: string, role: UserRole = 'admin', email: string | null = null) {
  getDb().prepare(
    'INSERT INTO users (username, password, role, email, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(username, hashedPassword, role, email, Date.now())
}

export function updateUserRole(id: number, role: UserRole) {
  getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
}

export function deleteUser(id: number) {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id)
}

export function updateLastLogin(id: number) {
  getDb().prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(Date.now(), id)
}

export function userCount(): number {
  return (getDb().prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c
}

// ── Invites ───────────────────────────────────────────────────────────────────

export function createInvite(invite: Omit<Invite, 'id' | 'token' | 'createdAt'>): Invite {
  const id = crypto.randomUUID()
  const token = crypto.randomUUID().replace(/-/g, '')
  const now = Date.now()
  getDb().prepare(`
    INSERT INTO invites (id, email, role, token, expires_at, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, invite.email, invite.role, token, invite.expiresAt, invite.createdBy, now)
  return { ...invite, id, token, createdAt: now }
}

export function getInviteByToken(token: string): Invite | undefined {
  const row = getDb().prepare(
    'SELECT * FROM invites WHERE token = ? AND expires_at > ?'
  ).get(token, Date.now()) as any
  if (!row) return undefined
  return {
    id: row.id, email: row.email, role: row.role, token: row.token,
    expiresAt: row.expires_at, createdBy: row.created_by, createdAt: row.created_at,
  }
}

export function listInvites(): Invite[] {
  return (getDb().prepare(
    'SELECT * FROM invites WHERE expires_at > ? ORDER BY created_at DESC'
  ).all(Date.now()) as any[]).map(r => ({
    id: r.id, email: r.email, role: r.role, token: r.token,
    expiresAt: r.expires_at, createdBy: r.created_by, createdAt: r.created_at,
  }))
}

export function deleteInvite(id: string) {
  getDb().prepare('DELETE FROM invites WHERE id = ?').run(id)
}

// ── Servers ───────────────────────────────────────────────────────────────────

export function addServer(s: Omit<ServerConfig, 'id' | 'addedAt'>): ServerConfig {
  const id = crypto.randomUUID()
  const now = Date.now()
  getDb().prepare(`
    INSERT INTO servers (id, name, host, api_url, api_token, tags, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, s.name, s.host, s.apiUrl, s.apiToken, JSON.stringify(s.tags), now)
  return { ...s, id, addedAt: now }
}

export function listServers(): ServerConfig[] {
  return (getDb().prepare('SELECT * FROM servers ORDER BY added_at ASC').all() as any[]).map(r => ({
    id: r.id, name: r.name, host: r.host, apiUrl: r.api_url,
    apiToken: r.api_token, tags: JSON.parse(r.tags), addedAt: r.added_at,
  }))
}

export function getServer(id: string): ServerConfig | undefined {
  const r = getDb().prepare('SELECT * FROM servers WHERE id = ?').get(id) as any
  if (!r) return undefined
  return {
    id: r.id, name: r.name, host: r.host, apiUrl: r.api_url,
    apiToken: r.api_token, tags: JSON.parse(r.tags), addedAt: r.added_at,
  }
}

export function removeServer(id: string) {
  getDb().prepare('DELETE FROM servers WHERE id = ?').run(id)
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export function createApiKey(prefix: string, keyHash: string, scope: ApiKeyScope, createdBy: number): ApiKey {
  const id = crypto.randomUUID()
  const now = Date.now()
  getDb().prepare(`
    INSERT INTO api_keys (id, prefix, key_hash, scope, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, prefix, keyHash, scope, createdBy, now)
  return { id, prefix, scope, createdBy, createdAt: now, lastUsedAt: null }
}

export function listApiKeys(): ApiKey[] {
  return (getDb().prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all() as any[]).map(r => ({
    id: r.id, prefix: r.prefix, scope: r.scope,
    createdBy: r.created_by, createdAt: r.created_at, lastUsedAt: r.last_used_at,
  }))
}

export function getApiKeyByHash(keyHash: string) {
  return getDb().prepare(
    'SELECT * FROM api_keys WHERE key_hash = ?'
  ).get(keyHash) as any
}

export function touchApiKey(id: string) {
  getDb().prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(Date.now(), id)
}

export function revokeApiKey(id: string) {
  getDb().prepare('DELETE FROM api_keys WHERE id = ?').run(id)
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

export function createWebhook(url: string, events: string[], secret: string): Webhook {
  const id = crypto.randomUUID()
  const now = Date.now()
  getDb().prepare(`
    INSERT INTO webhooks (id, url, events, secret, enabled, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(id, url, JSON.stringify(events), secret, now)
  return { id, url, events, secret, enabled: true, createdAt: now }
}

export function listWebhooks(): Webhook[] {
  return (getDb().prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all() as any[]).map(r => ({
    id: r.id, url: r.url, events: JSON.parse(r.events),
    secret: r.secret, enabled: r.enabled === 1, createdAt: r.created_at,
  }))
}

export function deleteWebhook(id: string) {
  getDb().prepare('DELETE FROM webhooks WHERE id = ?').run(id)
}
