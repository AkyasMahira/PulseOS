import type { ProcessInfo } from '@pulseos/types'
import { fmtBytes } from '../../lib/utils'

interface Props {
  processes: ProcessInfo[]
}

export function ProcessTable({ processes }: Props) {
  return (
    <div className="bg-surface-2 border border-surface-border rounded-lg p-4 flex flex-col gap-3">
      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Top Processes</div>

      <div className="overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_52px_52px_64px] gap-1 pb-1.5 border-b border-surface-border mb-1">
          {['PID', 'Process', 'CPU', 'MEM', ''].map(h => (
            <div key={h} className="text-[9px] text-slate-600 font-mono">{h}</div>
          ))}
        </div>

        {processes.slice(0, 12).map(p => {
          const cpuPct = Math.min(p.cpu, 100)
          const cpuColor = cpuPct > 50 ? '#f59e0b' : '#3b82f6'
          return (
            <div key={p.pid} className="grid grid-cols-[48px_1fr_52px_52px_64px] gap-1 py-1 items-center hover:bg-surface-3/50 rounded px-0.5 -mx-0.5 transition-colors">
              <span className="text-[10px] text-slate-600 font-mono">{p.pid}</span>
              <span className="text-[11px] text-slate-400 font-mono truncate" title={p.command}>{p.name}</span>
              <span className="text-[11px] font-mono" style={{ color: cpuColor }}>{p.cpu.toFixed(1)}%</span>
              <span className="text-[11px] text-slate-500 font-mono">{fmtBytes(p.mem)}</span>
              <div className="h-0.5 bg-surface-3 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${cpuPct}%`, background: cpuColor }} />
              </div>
            </div>
          )
        })}

        {processes.length === 0 && (
          <div className="text-slate-600 text-xs font-mono py-4 text-center">Loading processes...</div>
        )}
      </div>
    </div>
  )
}
