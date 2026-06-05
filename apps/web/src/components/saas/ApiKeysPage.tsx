import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/metrics'
import { Key, Plus, Trash2, Webhook, Globe, Clock, Copy, Check } from 'lucide-react'
import type { ApiKey, Webhook as WebhookType } from '@pulseos/types'

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="text-slate-600 hover:text-slate-400 transition-colors"
    >
      {copied ? <Check size={12} className="text-accent-green" /> : <Copy size={12} />}
    </button>
  )
}

function CreateKeyForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const { token } = useAuthStore()
  const [scope, setScope] = useState('read')
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState('')

  const handleSubmit = async () => {
    setCreating(true)
    try {
      const res = await fetch(`${API_URL}/api/apikeys`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      })
      const data = await res.json()
      if (data.ok) setNewKey(data.data.fullKey)
    } catch {}
    setCreating(false)
  }

  if (newKey) {
    return (
      <div className="bg-surface-2 border border-accent-green/20 rounded-xl p-4 animate-slide-up">
        <div className="text-[11px] text-accent-green font-mono uppercase tracking-widest mb-2">API Key Created</div>
        <div className="text-[10px] text-slate-500 font-mono mb-2">Copy this key now — it will not be shown again.</div>
        <div className="flex items-center gap-2 bg-surface-3 border border-surface-border rounded px-3 py-2">
          <code className="text-[11px] text-slate-200 font-mono flex-1 break-all">{newKey}</code>
          <CopyButton text={newKey} />
        </div>
        <button onClick={onCreated} className="mt-3 bg-surface-3 border border-surface-border text-slate-400 text-xs font-mono px-4 py-1.5 rounded-lg hover:text-slate-200 transition-all">
          Done
        </button>
      </div>
    )
  }

  const inp = "bg-surface-3 border border-surface-border rounded px-2 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-accent-blue/50 w-full"

  return (
    <div className="bg-surface-2 border border-accent-blue/20 rounded-xl p-4 animate-slide-up">
      <div className="text-[11px] text-slate-300 font-mono uppercase tracking-widest mb-3">Create API Key</div>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1">Scope</label>
          <select className={inp} value={scope} onChange={e => setScope(e.target.value)}>
            <option value="read">Read</option>
            <option value="write">Write</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={creating}
            className="bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono px-4 py-1.5 rounded-lg hover:bg-accent-blue/20 transition-all disabled:opacity-50">
            {creating ? 'Creating...' : 'Generate Key'}
          </button>
          <button onClick={onCancel} className="bg-surface-3 border border-surface-border text-slate-500 text-xs font-mono px-4 py-1.5 rounded-lg hover:text-slate-300 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function WebhookForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const { token } = useAuthStore()
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>(['alert:fired'])
  const [saving, setSaving] = useState(false)

  const toggleEvent = (e: string) => {
    setEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])
  }

  const handleSubmit = async () => {
    if (!url) return
    setSaving(true)
    try {
      await fetch(`${API_URL}/api/apikeys/webhooks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, events }),
      })
      onCreated()
    } catch {}
    setSaving(false)
  }

  const inp = "bg-surface-3 border border-surface-border rounded px-2 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-accent-blue/50 w-full"

  return (
    <div className="bg-surface-2 border border-accent-blue/20 rounded-xl p-4 animate-slide-up">
      <div className="text-[11px] text-slate-300 font-mono uppercase tracking-widest mb-3">Add Webhook</div>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1">Endpoint URL</label>
          <input className={inp} placeholder="https://hooks.example.com/pulseos" value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div>
          <label className="text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1">Events</label>
          <div className="flex gap-2">
            {['alert:fired', 'alert:resolved', 'server:offline'].map(e => (
              <label key={e} className={`text-[10px] font-mono px-2 py-1 rounded border cursor-pointer transition-all ${
                events.includes(e)
                  ? 'bg-accent-blue/15 border-accent-blue/30 text-accent-blue'
                  : 'bg-surface-3 border-surface-border text-slate-600'
              }`}>
                <input type="checkbox" checked={events.includes(e)} onChange={() => toggleEvent(e)} className="sr-only" />
                {e}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={saving}
            className="bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono px-4 py-1.5 rounded-lg hover:bg-accent-blue/20 transition-all disabled:opacity-50">
            {saving ? 'Adding...' : 'Add Webhook'}
          </button>
          <button onClick={onCancel} className="bg-surface-3 border border-surface-border text-slate-500 text-xs font-mono px-4 py-1.5 rounded-lg hover:text-slate-300 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function ApiKeysPage() {
  const { token } = useAuthStore()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [webhooks, setWebhooks] = useState<WebhookType[]>([])
  const [tab, setTab] = useState<'keys' | 'webhooks'>('keys')
  const [showKeyForm, setShowKeyForm] = useState(false)
  const [showWebhookForm, setShowWebhookForm] = useState(false)

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/apikeys`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.ok) setKeys(data.data)
    } catch {}
  }, [token])

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/apikeys/webhooks`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.ok) setWebhooks(data.data)
    } catch {}
  }, [token])

  useEffect(() => {
    fetchKeys()
    fetchWebhooks()
  }, [fetchKeys, fetchWebhooks])

  const revokeKey = async (id: string) => {
    if (!confirm('Revoke this API key?')) return
    await fetch(`${API_URL}/api/apikeys/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    fetchKeys()
  }

  const removeWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) return
    await fetch(`${API_URL}/api/apikeys/webhooks/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    fetchWebhooks()
  }

  const formatDate = (ts: number | null) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'never'

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['keys', 'webhooks'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-[11px] font-mono rounded capitalize transition-all ${
                tab === t
                  ? 'bg-accent-blue/15 border border-accent-blue/30 text-accent-blue'
                  : 'bg-surface-2 border border-surface-border text-slate-500 hover:text-slate-300'
              }`}
            >{t}</button>
          ))}
        </div>
        {tab === 'keys' && (
          <button onClick={() => setShowKeyForm(true)}
            className="flex items-center gap-1.5 bg-surface-2 border border-surface-border text-slate-400 text-[11px] font-mono px-3 py-1.5 rounded-lg hover:text-slate-200 transition-all">
            <Plus size={11} /> New Key
          </button>
        )}
        {tab === 'webhooks' && (
          <button onClick={() => setShowWebhookForm(true)}
            className="flex items-center gap-1.5 bg-surface-2 border border-surface-border text-slate-400 text-[11px] font-mono px-3 py-1.5 rounded-lg hover:text-slate-200 transition-all">
            <Plus size={11} /> Add Webhook
          </button>
        )}
      </div>

      {tab === 'keys' && (
        <div className="flex flex-col gap-3">
          {showKeyForm && <CreateKeyForm onCreated={() => { fetchKeys(); setShowKeyForm(false) }} onCancel={() => setShowKeyForm(false)} />}

          {keys.length === 0 && !showKeyForm && (
            <div className="bg-surface-2 border border-surface-border rounded-lg p-8 text-center">
              <Key size={24} className="text-slate-600 mx-auto mb-2" />
              <div className="text-slate-500 text-xs font-mono">No API keys created</div>
            </div>
          )}

          {keys.map(key => (
            <div key={key.id} className="bg-surface-2 border border-surface-border rounded-lg px-4 py-3 flex items-center gap-3">
              <Key size={13} className="text-slate-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-200 font-mono">{key.prefix}••••</div>
                <div className="text-[10px] text-slate-600 font-mono flex items-center gap-2">
                  <span className={`text-[9px] px-1 rounded ${key.scope === 'admin' ? 'bg-purple-950/40 text-purple-400' : key.scope === 'write' ? 'bg-amber-950/40 text-amber-400' : 'bg-blue-950/40 text-blue-400'}`}>{key.scope}</span>
                  <span><Clock size={9} /> {formatDate(key.lastUsedAt)}</span>
                </div>
              </div>
              <button onClick={() => revokeKey(key.id)}
                className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'webhooks' && (
        <div className="flex flex-col gap-3">
          {showWebhookForm && <WebhookForm onCreated={() => { fetchWebhooks(); setShowWebhookForm(false) }} onCancel={() => setShowWebhookForm(false)} />}

          {webhooks.length === 0 && !showWebhookForm && (
            <div className="bg-surface-2 border border-surface-border rounded-lg p-8 text-center">
              <Webhook size={24} className="text-slate-600 mx-auto mb-2" />
              <div className="text-slate-500 text-xs font-mono">No webhooks configured</div>
              <div className="text-slate-700 text-[10px] font-mono mt-1">Webhooks receive real-time alert events</div>
            </div>
          )}

          {webhooks.map(w => (
            <div key={w.id} className="bg-surface-2 border border-surface-border rounded-lg px-4 py-3 flex items-center gap-3">
              <Webhook size={13} className="text-slate-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Globe size={10} className="text-slate-600" />
                  <span className="text-xs text-slate-300 font-mono truncate">{w.url}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${w.enabled ? 'bg-accent-green' : 'bg-slate-600'}`} />
                </div>
                <div className="text-[10px] text-slate-600 font-mono flex items-center gap-2">
                  {w.events.map(e => (
                    <span key={e} className="text-[9px] px-1 bg-surface-3 rounded">{e}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => removeWebhook(w.id)}
                className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
