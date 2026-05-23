import { useState, useEffect } from 'react'
import { useMetricsStore, useAuthStore } from '../../stores/metrics'
import { Bell, Plus, Trash2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import type { AlertRule, AlertEvent } from '@pulseos/types'

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

const SEVERITY_STYLE = {
  critical: 'text-red-400 bg-red-950/40 border-red-900/40',
  warning:  'text-amber-400 bg-amber-950/40 border-amber-900/40',
  info:     'text-blue-400 bg-blue-950/40 border-blue-900/40',
}

const SEVERITY_ICON = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Bell,
}

function AlertEventRow({ event }: { event: AlertEvent }) {
  const Icon = SEVERITY_ICON[event.severity]
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border text-xs font-mono ${SEVERITY_STYLE[event.severity]} animate-slide-up`}>
      <Icon size={13} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-semibold truncate">{event.ruleName}</span>
          <span className="text-slate-500 flex-shrink-0">{format(new Date(event.firedAt), 'MM/dd HH:mm:ss')}</span>
        </div>
        <div className="text-slate-400">{event.message}</div>
        {event.resolvedAt && (
          <div className="text-green-500 text-[10px] mt-0.5 flex items-center gap-1">
            <CheckCircle size={10} /> resolved {format(new Date(event.resolvedAt), 'HH:mm:ss')}
          </div>
        )}
      </div>
    </div>
  )
}

const DEFAULT_RULES: Omit<AlertRule, 'id'>[] = [
  { name: 'CPU Critical',  metric: 'cpu',  condition: 'gt', threshold: 90, severity: 'critical', channels: [], cooldownSecs: 300, enabled: true },
  { name: 'CPU High',      metric: 'cpu',  condition: 'gt', threshold: 75, severity: 'warning',  channels: [], cooldownSecs: 180, enabled: true },
  { name: 'RAM Critical',  metric: 'mem',  condition: 'gt', threshold: 85, severity: 'critical', channels: [], cooldownSecs: 300, enabled: true },
  { name: 'Disk Critical', metric: 'disk', condition: 'gt', threshold: 90, severity: 'critical', channels: [], cooldownSecs: 3600, enabled: true },
  { name: 'Service Down',  metric: 'service', condition: 'gt', threshold: 0, severity: 'critical', channels: [], cooldownSecs: 60, enabled: true },
]

function NewRuleForm({ onSave, onCancel }: { onSave: (rule: Omit<AlertRule, 'id'>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: '', metric: 'cpu', condition: 'gt', threshold: 80,
    severity: 'warning', cooldownSecs: 300, enabled: true,
    telegram: false, discord: false,
  })

  const handleSubmit = () => {
    if (!form.name) return
    const channels: AlertRule['channels'] = []
    if (form.telegram) channels.push('telegram')
    if (form.discord) channels.push('discord')
    onSave({ ...form, channels, threshold: Number(form.threshold), cooldownSecs: Number(form.cooldownSecs) } as any)
  }

  const inp = "bg-surface-3 border border-surface-border rounded px-2 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-accent-blue/50 w-full"
  const lbl = "text-[9px] text-slate-600 uppercase tracking-widest font-mono block mb-1"

  return (
    <div className="bg-surface-2 border border-accent-blue/20 rounded-xl p-4 flex flex-col gap-3 animate-slide-up">
      <div className="text-[11px] text-slate-300 font-mono uppercase tracking-widest mb-1">New Alert Rule</div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={lbl}>Rule Name</label>
          <input className={inp} placeholder="CPU High" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className={lbl}>Metric</label>
          <select className={inp} value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}>
            <option value="cpu">CPU</option>
            <option value="mem">Memory</option>
            <option value="disk">Disk</option>
            <option value="service">Service</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Condition</label>
          <select className={inp} value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
            <option value="gt">Greater than</option>
            <option value="lt">Less than</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Threshold (%)</label>
          <input type="number" className={inp} min={0} max={100} value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: Number(e.target.value) }))} />
        </div>
        <div>
          <label className={lbl}>Severity</label>
          <select className={inp} value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Cooldown (seconds)</label>
          <input type="number" className={inp} value={form.cooldownSecs} onChange={e => setForm(f => ({ ...f, cooldownSecs: Number(e.target.value) }))} />
        </div>
        <div className="flex items-center gap-4 pt-4">
          <label className="flex items-center gap-2 cursor-pointer text-[11px] font-mono text-slate-400">
            <input type="checkbox" checked={form.telegram} onChange={e => setForm(f => ({ ...f, telegram: e.target.checked }))} className="accent-blue-500" />
            Telegram
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-[11px] font-mono text-slate-400">
            <input type="checkbox" checked={form.discord} onChange={e => setForm(f => ({ ...f, discord: e.target.checked }))} className="accent-purple-500" />
            Discord
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleSubmit} className="bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono px-4 py-1.5 rounded-lg hover:bg-accent-blue/20 transition-all">
          Save Rule
        </button>
        <button onClick={onCancel} className="bg-surface-3 border border-surface-border text-slate-500 text-xs font-mono px-4 py-1.5 rounded-lg hover:text-slate-300 transition-all">
          Cancel
        </button>
      </div>
    </div>
  )
}

export function AlertsPage() {
  const { alerts } = useMetricsStore()
  const { token } = useAuthStore()
  const [rules, setRules] = useState<AlertRule[]>([])
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState<'events' | 'rules'>('events')

  useEffect(() => {
    fetch(`${API_URL}/api/alerts/rules`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setRules(d.data ?? []))
      .catch(() => {})
  }, [token])

  const saveRule = async (rule: Omit<AlertRule, 'id'>) => {
    await fetch(`${API_URL}/api/alerts/rules`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    })
    const res = await fetch(`${API_URL}/api/alerts/rules`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setRules(data.data ?? [])
    setShowForm(false)
  }

  const seedDefaults = async () => {
    for (const r of DEFAULT_RULES) await saveRule(r)
  }

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['events', 'rules'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-[11px] font-mono rounded capitalize transition-all ${
                tab === t
                  ? 'bg-accent-blue/15 border border-accent-blue/30 text-accent-blue'
                  : 'bg-surface-2 border border-surface-border text-slate-500 hover:text-slate-300'
              }`}
            >{t}</button>
          ))}
        </div>
        {tab === 'rules' && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-surface-2 border border-surface-border text-slate-400 text-[11px] font-mono px-3 py-1.5 rounded-lg hover:text-slate-200 transition-all">
            <Plus size={11} /> New Rule
          </button>
        )}
      </div>

      {tab === 'events' && (
        <div className="flex flex-col gap-2">
          {alerts.length === 0 && (
            <div className="bg-surface-2 border border-surface-border rounded-lg p-8 text-center">
              <CheckCircle size={24} className="text-accent-green mx-auto mb-2" />
              <div className="text-slate-400 text-sm font-mono">No alerts fired yet</div>
              <div className="text-slate-600 text-xs font-mono mt-1">Configure rules to start monitoring thresholds</div>
            </div>
          )}
          {alerts.map(a => <AlertEventRow key={a.id} event={a} />)}
        </div>
      )}

      {tab === 'rules' && (
        <div className="flex flex-col gap-3">
          {showForm && <NewRuleForm onSave={saveRule} onCancel={() => setShowForm(false)} />}

          {rules.length === 0 && !showForm && (
            <div className="bg-surface-2 border border-surface-border rounded-lg p-8 text-center">
              <Bell size={24} className="text-slate-600 mx-auto mb-2" />
              <div className="text-slate-400 text-sm font-mono mb-3">No alert rules configured</div>
              <button onClick={seedDefaults}
                className="bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono px-4 py-2 rounded-lg hover:bg-accent-blue/20 transition-all">
                Seed default rules
              </button>
            </div>
          )}

          {rules.map(rule => (
            <div key={rule.id} className="bg-surface-2 border border-surface-border rounded-lg px-4 py-3 flex items-center gap-3">
              <div className={`text-[10px] px-2 py-0.5 rounded border font-mono ${SEVERITY_STYLE[rule.severity]}`}>
                {rule.severity}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-200 font-mono">{rule.name}</div>
                <div className="text-[10px] text-slate-600 font-mono">
                  {rule.metric} {rule.condition} {rule.threshold}% · cooldown {rule.cooldownSecs}s
                  {rule.channels.length > 0 && ` · ${rule.channels.join(', ')}`}
                </div>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${rule.enabled ? 'bg-accent-green' : 'bg-slate-600'}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
