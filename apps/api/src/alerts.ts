import type { SystemSnapshot, ServiceStatus, AlertRule, AlertEvent } from '@pulseos/types'
import { getAlertRules, insertAlertEvent } from './db/index.js'

const lastFired = new Map<string, number>()

function checkCondition(value: number, condition: string, threshold: number): boolean {
  if (condition === 'gt') return value > threshold
  if (condition === 'lt') return value < threshold
  if (condition === 'eq') return value === threshold
  return false
}

async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    })
  } catch (e) {
    console.error('[alert] Telegram error:', e)
  }
}

async function sendDiscord(message: string) {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    })
  } catch (e) {
    console.error('[alert] Discord error:', e)
  }
}

type AlertCallback = (event: AlertEvent) => void
let alertCallback: AlertCallback | null = null

export function onAlert(cb: AlertCallback) {
  alertCallback = cb
}

async function fireAlert(rule: AlertRule, value: number, message: string) {
  const now = Date.now()
  const last = lastFired.get(rule.id) ?? 0

  if (now - last < rule.cooldownSecs * 1000) return
  lastFired.set(rule.id, now)

  const event: AlertEvent = {
    id: crypto.randomUUID(),
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    message,
    value,
    threshold: rule.threshold,
    firedAt: now,
  }

  insertAlertEvent(event)
  alertCallback?.(event)

  const text = `🚨 *PulseOS Alert* — ${rule.severity.toUpperCase()}\n*${rule.name}*\n${message}\nValue: ${value} (threshold: ${rule.threshold})`

  await Promise.allSettled(
    rule.channels.map(ch => {
      if (ch === 'telegram') return sendTelegram(text)
      if (ch === 'discord') return sendDiscord(text)
      return Promise.resolve()
    })
  )
}

export async function evaluateAlerts(snapshot: SystemSnapshot, services: ServiceStatus[]) {
  const rules = getAlertRules()

  const values: Record<string, number> = {
    cpu: snapshot.cpu.usage,
    mem: snapshot.mem.usagePercent,
    disk: Math.max(...snapshot.disks.map(d => d.usagePercent), 0),
    net: snapshot.net.reduce((a, n) => a + n.rxBytes + n.txBytes, 0),
  }

  for (const rule of rules) {
    if (rule.metric === 'service') {
      const down = services.filter(s => s.status === 'offline')
      if (down.length > 0) {
        await fireAlert(rule, down.length, `${down.length} service(s) down: ${down.map(s => s.name).join(', ')}`)
      }
      continue
    }

    const value = values[rule.metric]
    if (value !== undefined && checkCondition(value, rule.condition, rule.threshold)) {
      await fireAlert(rule, value, `${rule.metric.toUpperCase()} is ${value}% (threshold: ${rule.condition} ${rule.threshold}%)`)
    }
  }
}
