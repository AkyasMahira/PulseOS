import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/metrics'
import { Server, Plus, Trash2, Globe, Wifi, WifiOff, Cpu, HardDrive, RefreshCw } from 'lucide-react'
import type { ServerConfig } from '@pulseos/types'
import { fmtBytes, fmtPct } from '../../lib/utils'

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

interface ServerWithStatus extends Omit<ServerConfig, 'apiToken'> {
  status: {
    serverId: string
    online: boolean
    error?: string
    snapshot?: {
      cpu: { usage: number; cores: number; model: string }
      mem: { usagePercent: number; used: number; total: number }
      disks: { usagePercent: number }[]
      net: { rxBytes: number; txBytes: number }[]
      hostname: string
      uptime: number
    }
    lastSeen: number
  } | null
}

function AddServerForm({ onAdded, onCancel }: { onAdded: () => void; onCancel: () => void }) {
  const { token } = useAuthStore()
  const [form, setForm] = useState({ name: '', host: '', apiUrl: '', apiToken: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const inp = "bg-surface-3 border border-surface-border rounded px-2 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-accent-blue/50 w-full"

  const handleSubmit = async () => {
    if (!form.name || !form.host || !form.apiUrl || !form.apiToken) {
      setError('All fields are required'); return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error || 'Failed to add server'); return }
      onAdded()
    } catch { setError('Network error') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-surface-2 border border-accent-blue/20 rounded-xl p-4 animate-slide-up">
      <div className="text-[11px] text-slate-300 font-mono uppercase tracking-widest mb-3">Add Remote Server</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1">Server Name</label>
          <input className={inp} placeholder="My VPS" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1">Host / IP</label>
          <input className={inp} placeholder="192.168.1.10" value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} />
        </div>
        <div>
          <label className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1">API URL</label>
          <input className={inp} placeholder="http://192.168.1.10:3001" value={form.apiUrl} onChange={e => setForm(f => ({ ...f, apiUrl: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1">API Token</label>
          <input className={inp} type="password" placeholder="JWT token from remote PulseOS" value={form.apiToken} onChange={e => setForm(f => ({ ...f, apiToken: e.target.value }))} />
          <div className="text-[9px] text-slate-600 font-mono mt-1 leading-relaxed">
            Login to the remote PulseOS dashboard, then open DevTools (F12) → Application → Local Storage → copy <code className="text-slate-500 bg-surface-3 px-1 rounded">pulse_token</code> value. You can also find your token on your local Profile page.
          </div>
        </div>
      </div>
      {error && <div className="text-[10px] text-red-400 font-mono mt-2">{error}</div>}
      <div className="flex gap-2 mt-3">
        <button onClick={handleSubmit} disabled={saving}
          className="bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono px-4 py-1.5 rounded-lg hover:bg-accent-blue/20 transition-all disabled:opacity-50">
          {saving ? 'Adding...' : 'Add Server'}
        </button>
        <button onClick={onCancel} className="bg-surface-3 border border-surface-border text-slate-500 text-xs font-mono px-4 py-1.5 rounded-lg hover:text-slate-300 transition-all">
          Cancel
        </button>
      </div>
    </div>
  )
}

function ServerCard({ server, onRemove }: { server: ServerWithStatus; onRemove: () => void }) {
  const st = server.status
  const online = st?.online ?? false
  const snapshot = st?.snapshot

  return (
    <div className="bg-surface-2 border border-surface-border rounded-lg p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server size={14} className={online ? 'text-accent-green' : 'text-slate-600'} />
          <span className="text-xs text-slate-200 font-mono font-semibold">{server.name}</span>
          {online ? (
            <span className="flex items-center gap-1 text-[9px] text-accent-green font-mono"><Wifi size={10} /> online</span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] text-red-400 font-mono"><WifiOff size={10} /> offline</span>
          )}
        </div>
        <button onClick={onRemove} className="text-slate-600 hover:text-red-400 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Details */}
      <div className="text-[10px] text-slate-600 font-mono flex items-center gap-2">
        <Globe size={10} /> {server.host}
      </div>

      {snapshot ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-3 rounded-lg p-2 flex flex-col items-center">
            <Cpu size={12} className="text-accent-blue mb-1" />
            <span className="text-xs text-slate-200 font-mono">{fmtPct(snapshot.cpu.usage)}</span>
            <span className="text-[9px] text-slate-600 font-mono">{snapshot.cpu.cores} core</span>
          </div>
          <div className="bg-surface-3 rounded-lg p-2 flex flex-col items-center">
            <HardDrive size={12} className="text-accent-amber mb-1" />
            <span className="text-xs text-slate-200 font-mono">{fmtPct(snapshot.mem.usagePercent)}</span>
            <span className="text-[9px] text-slate-600 font-mono">{fmtBytes(snapshot.mem.used)}</span>
          </div>
          <div className="bg-surface-3 rounded-lg p-2 flex flex-col items-center">
            <HardDrive size={12} className="text-accent-purple mb-1" />
            <span className="text-xs text-slate-200 font-mono">{fmtPct(snapshot.disks[0]?.usagePercent ?? 0)}</span>
            <span className="text-[9px] text-slate-600 font-mono">disk</span>
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-slate-600 font-mono text-center py-2">
          {!st ? 'No data yet' : st.error ? st.error : 'Waiting for data...'}
        </div>
      )}
    </div>
  )
}

export function ServersPage() {
  const { token } = useAuthStore()
  const [servers, setServers] = useState<ServerWithStatus[]>([])
  const [showForm, setShowForm] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/servers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.ok) setServers(data.data)
    } catch {}
  }, [token])

  useEffect(() => {
    fetchServers()
    const interval = setInterval(fetchServers, 10000)
    return () => clearInterval(interval)
  }, [fetchServers])

  const removeServer = async (id: string) => {
    if (!confirm('Remove this server?')) return
    await fetch(`${API_URL}/api/servers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchServers()
  }

  const refreshAll = async () => {
    setRefreshing(true)
    await Promise.allSettled(
      servers.map(s =>
        fetch(`${API_URL}/api/servers/${s.id}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    )
    setRefreshing(false)
    fetchServers()
  }

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-500 font-mono uppercase tracking-widest">
          Servers ({servers.length})
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshAll} disabled={refreshing}
            className="flex items-center gap-1.5 bg-surface-2 border border-surface-border text-slate-400 text-[10px] font-mono px-2.5 py-1.5 rounded-lg hover:text-slate-200 transition-all">
            <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-surface-2 border border-surface-border text-slate-400 text-[11px] font-mono px-3 py-1.5 rounded-lg hover:text-slate-200 transition-all">
            <Plus size={11} /> Add Server
          </button>
        </div>
      </div>

      {showForm && <AddServerForm onAdded={() => { fetchServers(); setShowForm(false) }} onCancel={() => setShowForm(false)} />}

      {servers.length === 0 && !showForm && (
        <div className="bg-surface-2 border border-surface-border rounded-lg p-8 text-center">
          <Server size={24} className="text-slate-600 mx-auto mb-2" />
          <div className="text-slate-500 text-xs font-mono mb-1">No remote servers added</div>
          <div className="text-slate-700 text-[10px] font-mono">Add remote PulseOS instances to monitor them here</div>
        </div>
      )}

      <div className="grid gap-3">
        {servers.map(s => (
          <ServerCard key={s.id} server={s} onRemove={() => removeServer(s.id)} />
        ))}
      </div>
    </div>
  )
}
