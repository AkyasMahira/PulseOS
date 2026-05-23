import { useState } from 'react'
import { useMetricsStore, useAuthStore } from '../../stores/metrics'
import { fmtBytes, fmtPct } from '../../lib/utils'
import { Play, Square, RotateCcw, Terminal, ChevronDown, ChevronRight } from 'lucide-react'

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

type ContainerState = 'running' | 'exited' | 'paused' | 'restarting' | 'dead' | string

function StatusPill({ status }: { status: ContainerState }) {
  const cfg = {
    running:    'bg-green-950/50 text-green-400 border-green-900/40',
    exited:     'bg-red-950/50 text-red-400 border-red-900/40',
    paused:     'bg-amber-950/50 text-amber-400 border-amber-900/40',
    restarting: 'bg-blue-950/50 text-blue-400 border-blue-900/40',
    dead:       'bg-red-950/50 text-red-500 border-red-900/40',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${cfg[status as keyof typeof cfg] ?? 'bg-surface-3 text-slate-500 border-surface-border'}`}>
      {status}
    </span>
  )
}

function LogViewer({ containerId, onClose }: { containerId: string; onClose: () => void }) {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuthStore()

  useState(() => {
    fetch(`${API_URL}/api/docker/${containerId}/logs?tail=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setLogs(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  })

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface-2 border border-surface-border rounded-xl w-full max-w-3xl max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Terminal size={13} />
            <span>Logs — {containerId}</span>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 text-xs font-mono">✕ close</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] text-slate-400 space-y-0.5">
          {loading && <div className="text-slate-600">Loading logs...</div>}
          {logs.map((line, i) => (
            <div key={i} className="hover:bg-surface-3/30 px-1 rounded leading-relaxed">
              {line.length > 8 ? (
                <>
                  <span className="text-slate-600 select-none">{line.slice(0, 30)} </span>
                  <span>{line.slice(30)}</span>
                </>
              ) : line}
            </div>
          ))}
          {!loading && logs.length === 0 && <div className="text-slate-600">No logs available</div>}
        </div>
      </div>
    </div>
  )
}

export function ContainersPage() {
  const containers = useMetricsStore(s => s.containers)
  const { token } = useAuthStore()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [logsFor, setLogsFor] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const doAction = async (id: string, action: string) => {
    setActionLoading(`${id}:${action}`)
    try {
      await fetch(`${API_URL}/api/docker/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch { /* ignore — ws will update state */ }
    finally { setActionLoading(null) }
  }

  const running = containers.filter(c => c.status === 'running')
  const stopped = containers.filter(c => c.status !== 'running')

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      {logsFor && <LogViewer containerId={logsFor} onClose={() => setLogsFor(null)} />}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: 'Running', value: running.length, color: 'text-accent-green' },
          { label: 'Stopped', value: stopped.length, color: 'text-accent-red' },
          { label: 'Total', value: containers.length, color: 'text-slate-300' },
        ].map(s => (
          <div key={s.label} className="bg-surface-2 border border-surface-border rounded-lg px-4 py-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1">{s.label}</div>
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Container list */}
      <div className="bg-surface-2 border border-surface-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_80px_80px_100px_32px_100px] gap-2 px-4 py-2.5 border-b border-surface-border text-[9px] text-slate-600 uppercase tracking-widest font-mono">
          <span>Name / Image</span>
          <span>Status</span>
          <span>CPU</span>
          <span>Memory</span>
          <span>Network</span>
          <span>↺</span>
          <span>Actions</span>
        </div>

        {containers.length === 0 && (
          <div className="text-slate-600 text-xs font-mono px-4 py-8 text-center">
            No containers found. Is Docker running?
          </div>
        )}

        {containers.map(c => {
          const isExpanded = expanded === c.id
          const isLoading = actionLoading?.startsWith(c.id)

          return (
            <div key={c.id} className="border-b border-surface-border last:border-0">
              <div
                className="grid grid-cols-[1fr_120px_80px_80px_100px_32px_100px] gap-2 px-4 py-3 items-center hover:bg-surface-3/30 cursor-pointer transition-colors"
                onClick={() => setExpanded(isExpanded ? null : c.id)}
              >
                {/* Name */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isExpanded ? <ChevronDown size={11} className="text-slate-600 flex-shrink-0" /> : <ChevronRight size={11} className="text-slate-600 flex-shrink-0" />}
                    <span className="text-slate-200 text-xs font-mono truncate">{c.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono truncate pl-4">{c.image}</div>
                </div>

                {/* Status */}
                <div><StatusPill status={c.status} /></div>

                {/* CPU */}
                <div className="text-xs font-mono text-slate-300">{c.cpuPercent.toFixed(1)}%</div>

                {/* Memory */}
                <div className="text-xs font-mono text-slate-300">
                  {fmtBytes(c.memUsed)}
                  {c.memPercent > 0 && <span className="text-slate-600 text-[10px]"> {c.memPercent}%</span>}
                </div>

                {/* Network */}
                <div className="text-[10px] font-mono text-slate-500">
                  ↓{fmtBytes(c.rxBytes)} ↑{fmtBytes(c.txBytes)}
                </div>

                {/* Restart count */}
                <div className="text-[10px] font-mono text-slate-600 text-center">{c.restartCount}</div>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {c.status === 'running' ? (
                    <>
                      <button
                        onClick={() => doAction(c.id, 'stop')}
                        disabled={!!isLoading}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-40"
                        title="Stop"
                      >
                        <Square size={12} />
                      </button>
                      <button
                        onClick={() => doAction(c.id, 'restart')}
                        disabled={!!isLoading}
                        className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-amber-950/30 transition-colors disabled:opacity-40"
                        title="Restart"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => doAction(c.id, 'start')}
                      disabled={!!isLoading}
                      className="p-1 rounded text-slate-500 hover:text-green-400 hover:bg-green-950/30 transition-colors disabled:opacity-40"
                      title="Start"
                    >
                      <Play size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => setLogsFor(c.id)}
                    className="p-1 rounded text-slate-500 hover:text-blue-400 hover:bg-blue-950/30 transition-colors"
                    title="Logs"
                  >
                    <Terminal size={12} />
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="bg-surface-3/30 border-t border-surface-border px-8 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
                  <div><span className="text-slate-600">ID: </span><span className="text-slate-400">{c.id}</span></div>
                  <div><span className="text-slate-600">Mem limit: </span><span className="text-slate-400">{fmtBytes(c.memLimit)}</span></div>
                  <div><span className="text-slate-600">State: </span><span className="text-slate-400">{c.state}</span></div>
                  <div><span className="text-slate-600">Restarts: </span><span className="text-slate-400">{c.restartCount}</span></div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
