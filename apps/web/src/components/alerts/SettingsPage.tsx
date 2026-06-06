import { useState, useEffect } from 'react'
import { useMetricsStore, useAuthStore } from '../../stores/metrics'
import { fmtBytes, fmtUptime } from '../../lib/utils'
import { ExternalLink, Copy, Check, Save } from 'lucide-react'

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-slate-600 hover:text-slate-400 transition-colors"
    >
      {copied ? <Check size={11} className="text-accent-green" /> : <Copy size={11} />}
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-surface-border last:border-0">
      <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono w-28 flex-shrink-0">{label}</span>
      <span className="text-xs text-slate-300 font-mono flex-1 truncate">{value}</span>
      <CopyButton text={value} />
    </div>
  )
}

function NotificationConfig() {
  const { token } = useAuthStore()
  const [telegramBot, setTelegramBot] = useState('')
  const [telegramChat, setTelegramChat] = useState('')
  const [discordWebhook, setDiscordWebhook] = useState('')
  const [statusTitle, setStatusTitle] = useState('')
  const [statusDesc, setStatusDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setTelegramBot(d.data.TELEGRAM_BOT_TOKEN ?? '')
          setTelegramChat(d.data.TELEGRAM_CHAT_ID ?? '')
          setDiscordWebhook(d.data.DISCORD_WEBHOOK_URL ?? '')
          setStatusTitle(d.data.STATUS_PAGE_TITLE ?? '')
          setStatusDesc(d.data.STATUS_PAGE_DESC ?? '')
        }
      })
      .catch(() => {})
  }, [token])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    const settings: Record<string, string> = {}
    if (telegramBot) settings.TELEGRAM_BOT_TOKEN = telegramBot
    if (telegramChat) settings.TELEGRAM_CHAT_ID = telegramChat
    if (discordWebhook) settings.DISCORD_WEBHOOK_URL = discordWebhook
    if (statusTitle) settings.STATUS_PAGE_TITLE = statusTitle
    if (statusDesc) settings.STATUS_PAGE_DESC = statusDesc
    await fetch(`${API_URL}/api/settings`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inp = "bg-surface-3 border border-surface-border rounded px-2 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-accent-blue/50 w-full"
  const lbl = "text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1"

  return (
    <div className="bg-surface-2 border border-surface-border rounded-lg p-4">
      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-3">Notifications</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Telegram Bot Token</label>
          <input className={inp} value={telegramBot} onChange={e => setTelegramBot(e.target.value)} placeholder="123:abc" />
        </div>
        <div>
          <label className={lbl}>Telegram Chat ID</label>
          <input className={inp} value={telegramChat} onChange={e => setTelegramChat(e.target.value)} placeholder="-100xxx" />
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Discord Webhook URL</label>
          <input className={inp} value={discordWebhook} onChange={e => setDiscordWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/..." />
        </div>
      </div>

      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-3 mt-5">Status Page</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Status Page Title</label>
          <input className={inp} value={statusTitle} onChange={e => setStatusTitle(e.target.value)} placeholder="System Status" />
        </div>
        <div>
          <label className={lbl}>Status Page Description</label>
          <input className={inp} value={statusDesc} onChange={e => setStatusDesc(e.target.value)} placeholder="Real-time service status" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono px-3 py-1.5 rounded-lg hover:bg-accent-blue/20 transition-all disabled:opacity-50">
          <Save size={11} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-[10px] text-accent-green font-mono">Saved!</span>}
      </div>
      <div className="text-[10px] text-slate-700 font-mono mt-2">
        Note: Changes require API restart to take effect for alert notifications.
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { snapshot } = useMetricsStore()

  const statusPageUrl = `${API_URL}/status`

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in max-w-2xl">
      {/* Server info */}
      <div className="bg-surface-2 border border-surface-border rounded-lg p-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-3">Server Info</div>
        {snapshot ? (
          <>
            <InfoRow label="Hostname" value={snapshot.hostname} />
            <InfoRow label="CPU Model" value={snapshot.cpu.model} />
            <InfoRow label="CPU Cores" value={`${snapshot.cpu.cores} vCPU`} />
            <InfoRow label="Total RAM" value={fmtBytes(snapshot.mem.total)} />
            <InfoRow label="Uptime" value={fmtUptime(snapshot.uptime)} />
            <InfoRow label="Disk (main)" value={snapshot.disks[0]
              ? `${fmtBytes(snapshot.disks[0].used)} / ${fmtBytes(snapshot.disks[0].total)} (${snapshot.disks[0].mountpoint})`
              : 'N/A'
            } />
          </>
        ) : (
          <div className="text-slate-600 text-xs font-mono">Waiting for data...</div>
        )}
      </div>

      {/* Status page */}
      <div className="bg-surface-2 border border-surface-border rounded-lg p-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-3">Public Status Page</div>
        <div className="text-xs text-slate-400 font-mono mb-3">
          A public, unauthenticated status page is available. Share it with your users.
        </div>
        <div className="flex items-center gap-2 bg-surface-3 border border-surface-border rounded px-3 py-2">
          <span className="text-xs text-slate-300 font-mono flex-1 truncate">{statusPageUrl}</span>
          <CopyButton text={statusPageUrl} />
          <a href={statusPageUrl} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-slate-400 transition-colors">
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Notification config */}
      <NotificationConfig />

      {/* API endpoint info */}
      <div className="bg-surface-2 border border-surface-border rounded-lg p-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-3">API Endpoints</div>
        <div className="space-y-1 text-[11px] font-mono">
          {[
            ['GET',  '/api/metrics/now',       'Current snapshot'],
            ['GET',  '/api/metrics/history',   '?metric=cpu&from=&to='],
            ['GET',  '/api/docker',            'List containers'],
            ['POST', '/api/docker/:id/restart','Restart container'],
            ['GET',  '/api/alerts',            'Recent alert events'],
            ['GET',  '/status',                'Public status page (no auth)'],
          ].map(([method, path, desc]) => (
            <div key={path} className="flex items-center gap-3 py-1.5 border-b border-surface-border last:border-0">
              <span className={`w-10 flex-shrink-0 text-[10px] ${method === 'GET' ? 'text-accent-green' : method === 'POST' ? 'text-amber-400' : 'text-red-400'}`}>
                {method}
              </span>
              <span className="text-slate-300 w-52 flex-shrink-0">{path}</span>
              <span className="text-slate-600">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-[10px] text-slate-700 font-mono pb-2">
        PulseOS v0.1.0 · MIT License · Phase 2 complete
      </div>
    </div>
  )
}
