import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import type { AlertRule, AlertEvent, HistoryPoint } from '@pulseos/types'

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
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as
    { id: number; username: string; password: string } | undefined
}

export function insertUser(username: string, hashedPassword: string) {
  getDb().prepare(
    'INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)'
  ).run(username, hashedPassword, Date.now())
}

export function userCount(): number {
  return (getDb().prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c
}
