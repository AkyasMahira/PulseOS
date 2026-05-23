import { useEffect } from 'react'
import { useMetricsStore } from '../../stores/metrics'
import { useSocket } from '../../hooks/useSocket'
import { MetricCard } from './MetricCard'
import { SparkLine } from '../charts/SparkLine'
import { ServicesTable } from '../services/ServicesTable'
import { ProcessTable } from '../services/ProcessTable'
import { fmtBytes, fmtBytesPerSec, fmtUptime, fmtPct } from '../../lib/utils'
import {
  Cpu, MemoryStick, HardDrive, ArrowDownUp, Clock, Activity,
  Wifi, WifiOff, Bell
} from 'lucide-react'

function AlertBanner() {
  const alerts = useMetricsStore(s => s.alerts)
  const latest = alerts[0]
  if (!latest) return null

  const colors = {
    critical: 'border-red-800/60 bg-red-950/30 text-red-400',
    warning: 'border-amber-800/60 bg-amber-950/30 text-amber-400',
    info: 'border-blue-800/60 bg-blue-950/30 text-blue-400',
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-mono mb-4 animate-slide-up ${colors[latest.severity]}`}>
      <Bell size={12} />
      <span className="font-semibold">[{latest.severity.toUpperCase()}]</span>
      <span className="text-slate-400">{latest.message}</span>
    </div>
  )
}

export function Dashboard() {
  useSocket()

  const {
    connected, snapshot,
    containers, services, processes,
    cpuHistory, memHistory, netRxHistory, netTxHistory
  } = useMetricsStore()

  const cpu = snapshot?.cpu
  const mem = snapshot?.mem
  const disk = snapshot?.disks[0]
  const net = snapshot?.net ?? []
  const netRx = net.reduce((a, n) => a + n.rxBytes, 0)
  const netTx = net.reduce((a, n) => a + n.txBytes, 0)

  return (
    <div className="min-h-screen bg-surface-0 text-slate-100 font-mono flex flex-col">
      {/* Topbar */}
      <header className="bg-surface-1 border-b border-surface-border px-5 py-2.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-accent-green shadow-[0_0_6px_#22c55e88] animate-pulse-slow" />
          <span className="text-sm font-semibold tracking-widest">PULSE<span className="text-accent-blue">OS</span></span>
          {snapshot?.hostname && (
            <span className="text-slate-600 text-xs">· {snapshot.hostname}</span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="hidden sm:block">Ubuntu 22.04 LTS</span>
          <div className="flex items-center gap-1.5">
            {connected
              ? <><Wifi size={12} className="text-accent-green" /> <span className="text-accent-green">live</span></>
              : <><WifiOff size={12} className="text-accent-red" /> <span className="text-accent-red">disconnected</span></>
            }
          </div>
          {snapshot && (
            <span className="hidden md:block text-slate-600">
              up {fmtUptime(snapshot.uptime)}
            </span>
          )}
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="hidden lg:flex flex-col w-48 bg-surface-1 border-r border-surface-border py-4 flex-shrink-0">
          {[
            { icon: Activity, label: 'Overview', active: true },
            { icon: Cpu, label: 'Containers' },
            { icon: HardDrive, label: 'Processes' },
            { icon: ArrowDownUp, label: 'Network' },
            { icon: Bell, label: 'Alerts', badge: '2' },
          ].map(({ icon: Icon, label, active, badge }) => (
            <button key={label} className={`flex items-center gap-2.5 px-4 py-2 text-xs transition-all border-l-2 ${
              active
                ? 'text-slate-100 border-accent-blue bg-accent-blue/5'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-surface-2/50'
            }`}>
              <Icon size={14} />
              {label}
              {badge && <span className="ml-auto text-[9px] bg-surface-3 text-slate-500 px-1.5 py-0.5 rounded">{badge}</span>}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <AlertBanner />

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <MetricCard
              label="CPU"
              value={cpu ? fmtPct(cpu.usage) : '—'}
              sub={cpu ? `${cpu.cores}c · load ${cpu.loadAvg[0].toFixed(2)}` : undefined}
              pct={cpu?.usage}
              icon={<Cpu size={13} />}
              alert={cpu !== undefined && cpu.usage > 90}
            />
            <MetricCard
              label="Memory"
              value={mem ? fmtPct(mem.usagePercent) : '—'}
              sub={mem ? `${fmtBytes(mem.used)} / ${fmtBytes(mem.total)}` : undefined}
              pct={mem?.usagePercent}
              icon={<MemoryStick size={13} />}
              alert={mem !== undefined && mem.usagePercent > 85}
            />
            <MetricCard
              label="Disk"
              value={disk ? fmtPct(disk.usagePercent) : '—'}
              sub={disk ? `${fmtBytes(disk.used)} / ${fmtBytes(disk.total)}` : undefined}
              pct={disk?.usagePercent}
              icon={<HardDrive size={13} />}
              alert={disk !== undefined && disk.usagePercent > 90}
            />
            <MetricCard
              label="Net In"
              value={fmtBytesPerSec(netRx)}
              sub={`tx: ${fmtBytesPerSec(netTx)}`}
              icon={<ArrowDownUp size={13} />}
            />
            <MetricCard
              label="Uptime"
              value={snapshot ? fmtUptime(snapshot.uptime) : '—'}
              sub="continuous"
              icon={<Clock size={13} />}
            />
            <MetricCard
              label="Services"
              value={String(services.filter(s => s.status === 'online').length)}
              sub={`${services.filter(s => s.status === 'offline').length} down`}
              icon={<Activity size={13} />}
              alert={services.some(s => s.status === 'offline')}
            />
          </div>

          {/* Sparkline charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <SparkLine
              data={cpuHistory}
              color="#f59e0b"
              label="CPU History"
              currentValue={cpu ? String(Math.round(cpu.usage)) : '0'}
            />
            <SparkLine
              data={memHistory}
              color="#3b82f6"
              label="Memory History"
              currentValue={mem ? String(Math.round(mem.usagePercent)) : '0'}
            />
            <SparkLine
              data={netRxHistory.map(b => b / 1024)}
              color="#22c55e"
              label="Net RX"
              currentValue={fmtBytesPerSec(netRx)}
              unit=""
              domain={[0, Math.max(...netRxHistory.map(b => b / 1024), 1)]}
            />
            <SparkLine
              data={netTxHistory.map(b => b / 1024)}
              color="#8b5cf6"
              label="Net TX"
              currentValue={fmtBytesPerSec(netTx)}
              unit=""
              domain={[0, Math.max(...netTxHistory.map(b => b / 1024), 1)]}
            />
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            <ServicesTable services={services} containers={containers} />
            <ProcessTable processes={processes} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-1 border-t border-surface-border px-5 py-1.5 flex items-center gap-4 text-[10px] text-slate-600">
        <span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-green mr-1.5 animate-pulse-slow" />
          {connected ? 'Socket.IO connected · 5s' : 'reconnecting...'}
        </span>
        <span className="hidden sm:block text-slate-700">·</span>
        <span className="hidden sm:block">PulseOS v0.1.0</span>
        {snapshot && (
          <>
            <span className="hidden md:block text-slate-700">·</span>
            <span className="hidden md:block ml-auto">
              {cpu?.model ?? ''}
            </span>
          </>
        )}
      </footer>
    </div>
  )
}
