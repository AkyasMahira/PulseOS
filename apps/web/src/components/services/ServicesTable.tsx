import type { ServiceStatus, ContainerMetric } from '@pulseos/types'
import { fmtUptime, fmtBytes } from '../../lib/utils'

interface Props {
  services: ServiceStatus[]
  containers: ContainerMetric[]
}

function StatusDot({ status }: { status: 'online' | 'offline' | 'warning' | 'running' | 'exited' | string }) {
  const s = status === 'running' ? 'online' : status === 'exited' ? 'offline' : status
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
      s === 'online' ? 'bg-accent-green shadow-[0_0_4px_#22c55e88]' :
      s === 'offline' ? 'bg-accent-red shadow-[0_0_4px_#ef444488]' :
      'bg-accent-amber'
    }`} />
  )
}

function Tag({ children, type }: { children: string; type: string }) {
  const colors: Record<string, string> = {
    systemd: 'text-blue-400 bg-blue-950/40',
    pm2: 'text-purple-400 bg-purple-950/40',
    docker: 'text-cyan-400 bg-cyan-950/40',
  }
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${colors[type] ?? 'text-slate-500 bg-surface-3'}`}>
      {children}
    </span>
  )
}

export function ServicesTable({ services, containers }: Props) {
  return (
    <div className="bg-surface-2 border border-surface-border rounded-lg p-4 flex flex-col gap-3">
      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Services & Containers</div>

      <div className="flex flex-col divide-y divide-surface-border">
        {services.map(svc => (
          <div key={svc.name} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
            <StatusDot status={svc.status} />
            <span className="text-slate-300 text-xs font-mono flex-1 truncate">{svc.name}</span>
            <Tag type={svc.type}>{svc.type}</Tag>
            {svc.uptime && (
              <span className="text-[10px] text-slate-600 font-mono">{fmtUptime(svc.uptime)}</span>
            )}
            {svc.restartCount !== undefined && svc.restartCount > 0 && (
              <span className="text-[9px] text-amber-600 font-mono">↺{svc.restartCount}</span>
            )}
          </div>
        ))}

        {containers.map(c => (
          <div key={c.id} className="flex items-center gap-2.5 py-2 last:pb-0">
            <StatusDot status={c.status} />
            <span className="text-slate-300 text-xs font-mono flex-1 truncate">{c.name}</span>
            <Tag type="docker">docker</Tag>
            {c.status === 'running' && (
              <span className="text-[10px] text-slate-600 font-mono">
                {c.cpuPercent.toFixed(1)}% · {fmtBytes(c.memUsed)}
              </span>
            )}
            {c.restartCount > 0 && (
              <span className="text-[9px] text-amber-600 font-mono">↺{c.restartCount}</span>
            )}
          </div>
        ))}

        {services.length === 0 && containers.length === 0 && (
          <div className="text-slate-600 text-xs font-mono py-4 text-center">No services configured</div>
        )}
      </div>
    </div>
  )
}
