import { useState } from 'react'
import { useMetricsStore } from '../../stores/metrics'
import { fmtBytes, fmtUptime } from '../../lib/utils'
import { ExternalLink, Copy, Check } from 'lucide-react'

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
      <div className="bg-surface-2 border border-surface-border rounded-lg p-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-3">Notifications</div>
        <div className="text-xs text-slate-400 font-mono mb-3">
          Configure in <code className="text-slate-300 bg-surface-3 px-1.5 py-0.5 rounded">apps/api/.env</code>
        </div>
        <div className="space-y-1 text-[11px] font-mono">
          {[
            ['TELEGRAM_BOT_TOKEN', 'Bot token from @BotFather'],
            ['TELEGRAM_CHAT_ID', 'Chat/channel ID'],
            ['DISCORD_WEBHOOK_URL', 'Webhook URL from Discord'],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3 py-1.5 border-b border-surface-border last:border-0">
              <span className="text-accent-blue w-44 flex-shrink-0">{k}</span>
              <span className="text-slate-600">{v}</span>
            </div>
          ))}
        </div>
      </div>

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
