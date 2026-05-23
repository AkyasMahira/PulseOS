import { useState } from 'react'
import { useMetricsStore } from '../../stores/metrics'
import { fmtBytes } from '../../lib/utils'
import type { ProcessInfo } from '@pulseos/types'

type SortKey = 'cpu' | 'mem' | 'pid' | 'name'

export function ProcessesPage() {
  const { processes } = useMetricsStore()
  const [sortBy, setSortBy] = useState<SortKey>('cpu')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filter, setFilter] = useState('')

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setS(p => ({ ...p, sortDir: sortDir === 'asc' ? 'desc' : 'asc' }))
    else { setSortBy(key); setSortDir('desc') }
  }

  // fix: closure issue workaround
  const setS = (fn: (p: { sortBy: SortKey; sortDir: 'asc' | 'desc' }) => { sortBy: SortKey; sortDir: 'asc' | 'desc' }) => {
    const next = fn({ sortBy, sortDir })
    setSortBy(next.sortBy)
    setSortDir(next.sortDir)
  }

  const filtered = processes
    .filter(p => !filter || p.name.includes(filter) || p.command.includes(filter))
    .sort((a, b) => {
      const v = sortBy === 'pid' ? a.pid - b.pid
        : sortBy === 'name' ? a.name.localeCompare(b.name)
        : sortBy === 'mem' ? a.mem - b.mem
        : a.cpu - b.cpu
      return sortDir === 'asc' ? v : -v
    })

  const ColHeader = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`text-[9px] text-slate-600 uppercase tracking-widest font-mono hover:text-slate-400 transition-colors flex items-center gap-1 ${align === 'right' ? 'ml-auto' : ''}`}
    >
      {label}
      {sortBy === k && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  )

  return (
    <div className="p-4 flex flex-col gap-3 animate-fade-in">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by name or command..."
          className="bg-surface-2 border border-surface-border rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-accent-blue/40 transition-colors w-64 placeholder:text-slate-700"
        />
        <span className="text-[10px] text-slate-600 font-mono ml-auto">{filtered.length} processes</span>
      </div>

      {/* Table */}
      <div className="bg-surface-2 border border-surface-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[64px_1fr_3fr_72px_80px_80px] gap-2 px-4 py-2.5 border-b border-surface-border">
          <ColHeader k="pid" label="PID" />
          <ColHeader k="name" label="Name" />
          <div className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">Command</div>
          <div className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">State</div>
          <ColHeader k="cpu" label="CPU" align="right" />
          <ColHeader k="mem" label="MEM" align="right" />
        </div>

        <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
          {filtered.map(p => {
            const cpuPct = Math.min(p.cpu, 100)
            const cpuColor = cpuPct > 50 ? '#f59e0b' : cpuPct > 20 ? '#3b82f6' : '#475569'

            return (
              <div key={p.pid} className="grid grid-cols-[64px_1fr_3fr_72px_80px_80px] gap-2 px-4 py-2 border-b border-surface-border last:border-0 items-center hover:bg-surface-3/30 transition-colors group">
                <span className="text-[10px] text-slate-600 font-mono">{p.pid}</span>
                <span className="text-xs text-slate-300 font-mono truncate">{p.name}</span>
                <span className="text-[10px] text-slate-600 font-mono truncate" title={p.command}>
                  {p.command || '—'}
                </span>
                <span className="text-[10px] font-mono text-slate-600">{p.status}</span>
                <div className="flex items-center gap-1.5 justify-end">
                  <div className="w-10 h-0.5 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${cpuPct}%`, background: cpuColor }} />
                  </div>
                  <span className="text-[11px] font-mono w-10 text-right" style={{ color: cpuColor }}>
                    {p.cpu.toFixed(1)}%
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono text-right">{fmtBytes(p.mem)}</span>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-slate-600 text-xs font-mono px-4 py-8 text-center">No processes found</div>
          )}
        </div>
      </div>
    </div>
  )
}
