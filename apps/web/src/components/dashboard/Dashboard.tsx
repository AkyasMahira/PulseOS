import { useState } from 'react'
import { useMetricsStore } from '../../stores/metrics'
import { useSocket } from '../../hooks/useSocket'
import { Sidebar } from '../layout/Sidebar'
import { Topbar } from '../layout/Topbar'
import { MetricCard } from './MetricCard'
import { SparkLine } from '../charts/SparkLine'
import { ServicesTable } from '../services/ServicesTable'
import { ProcessTable } from '../services/ProcessTable'
import { ContainersPage } from '../containers/ContainersPage'
import { HistoryPage } from '../history/HistoryPage'
import { AlertsPage } from '../alerts/AlertsPage'
import { SettingsPage } from '../alerts/SettingsPage'
import { NetworkPage } from './NetworkPage'
import { ProcessesPage } from '../services/ProcessesPage'
import { fmtBytes, fmtBytesPerSec, fmtUptime, fmtPct } from '../../lib/utils'
import { Cpu, HardDrive, ArrowDownUp, Clock, Activity, MemoryStick, Bell } from 'lucide-react'

function OverviewPage() {
  const { snapshot, containers, services, processes, cpuHistory, memHistory, netRxHistory, netTxHistory, alerts } = useMetricsStore()

  const cpu = snapshot?.cpu
  const mem = snapshot?.mem
  const disk = snapshot?.disks[0]
  const net = snapshot?.net ?? []
  const netRx = net.reduce((a, n) => a + n.rxBytes, 0)
  const netTx = net.reduce((a, n) => a + n.txBytes, 0)
  const latestAlert = alerts[0]

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      {/* Alert banner */}
      {latestAlert && !latestAlert.resolvedAt && (
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-mono ${
          latestAlert.severity === 'critical' ? 'bg-red-950/30 border-red-900/40 text-red-400' :
          latestAlert.severity === 'warning' ? 'bg-amber-950/30 border-amber-900/40 text-amber-400' :
          'bg-blue-950/30 border-blue-900/40 text-blue-400'
        }`}>
          <Bell size={12} />
          <span className="font-semibold">[{latestAlert.severity.toUpperCase()}]</span>
          <span className="text-slate-400">{latestAlert.message}</span>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <MetricCard label="CPU" value={cpu ? fmtPct(cpu.usage) : '—'} sub={cpu ? `${cpu.cores}c · load ${cpu.loadAvg[0].toFixed(2)}` : undefined} pct={cpu?.usage} icon={<Cpu size={13} />} alert={cpu !== undefined && cpu.usage > 90} />
        <MetricCard label="Memory" value={mem ? fmtPct(mem.usagePercent) : '—'} sub={mem ? `${fmtBytes(mem.used)} / ${fmtBytes(mem.total)}` : undefined} pct={mem?.usagePercent} icon={<MemoryStick size={13} />} alert={mem !== undefined && mem.usagePercent > 85} />
        <MetricCard label="Disk" value={disk ? fmtPct(disk.usagePercent) : '—'} sub={disk ? `${fmtBytes(disk.used)} / ${fmtBytes(disk.total)}` : undefined} pct={disk?.usagePercent} icon={<HardDrive size={13} />} alert={disk !== undefined && disk.usagePercent > 90} />
        <MetricCard label="Net In" value={fmtBytesPerSec(netRx)} sub={`tx: ${fmtBytesPerSec(netTx)}`} icon={<ArrowDownUp size={13} />} />
        <MetricCard label="Uptime" value={snapshot ? fmtUptime(snapshot.uptime) : '—'} sub="continuous" icon={<Clock size={13} />} />
        <MetricCard label="Services" value={String(services.filter(s => s.status === 'online').length)} sub={`${services.filter(s => s.status === 'offline').length} down · ${containers.filter(c => c.status === 'running').length} containers`} icon={<Activity size={13} />} alert={services.some(s => s.status === 'offline')} />
      </div>

      {/* Sparkline charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <SparkLine data={cpuHistory} color="#f59e0b" label="CPU History" currentValue={cpu ? String(Math.round(cpu.usage)) : '0'} />
        <SparkLine data={memHistory} color="#3b82f6" label="Memory History" currentValue={mem ? String(Math.round(mem.usagePercent)) : '0'} />
        <SparkLine data={netRxHistory.map(b => b / 1024)} color="#22c55e" label="Net RX" currentValue={fmtBytesPerSec(netRx)} unit="" domain={[0, Math.max(...netRxHistory.map(b => b / 1024), 1)]} />
        <SparkLine data={netTxHistory.map(b => b / 1024)} color="#8b5cf6" label="Net TX" currentValue={fmtBytesPerSec(netTx)} unit="" domain={[0, Math.max(...netTxHistory.map(b => b / 1024), 1)]} />
      </div>

      {/* Services + Processes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <ServicesTable services={services} containers={containers} />
        <ProcessTable processes={processes} />
      </div>
    </div>
  )
}

export function Dashboard() {
  useSocket()
  const { currentPage, connected } = useMetricsStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const PAGE_TITLES: Record<string, string> = {
    overview: 'Overview', containers: 'Containers', processes: 'Processes',
    network: 'Network', alerts: 'Alerts', history: 'Metrics History', settings: 'Settings',
  }

  return (
    <div className="h-screen bg-surface-0 text-slate-100 flex overflow-hidden">
      <Sidebar />

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute left-0 top-0 bottom-0 w-48 z-50" onClick={e => e.stopPropagation()}>
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Page header */}
        <div className="px-4 pt-3 pb-0 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-slate-200 font-mono tracking-wide">
            {PAGE_TITLES[currentPage]}
          </h1>
          <div className="text-[10px] text-slate-600 font-mono hidden sm:block">
            {connected ? '● collecting every 5s' : '○ disconnected'}
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {currentPage === 'overview'   && <OverviewPage />}
          {currentPage === 'containers' && <ContainersPage />}
          {currentPage === 'processes'  && <ProcessesPage />}
          {currentPage === 'network'    && <NetworkPage />}
          {currentPage === 'alerts'     && <AlertsPage />}
          {currentPage === 'history'    && <HistoryPage />}
          {currentPage === 'settings'   && <SettingsPage />}
        </div>

        {/* Footer */}
        <div className="bg-surface-1 border-t border-surface-border px-4 py-1.5 flex items-center gap-3 text-[10px] text-slate-600 font-mono flex-shrink-0">
          <span className={`flex items-center gap-1.5 ${connected ? 'text-accent-green' : 'text-accent-red'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-slow" />
            {connected ? 'live' : 'offline'}
          </span>
          <span className="text-slate-700">·</span>
          <span>Socket.IO · 5s interval</span>
          <span className="text-slate-700 hidden sm:block">·</span>
          <span className="hidden sm:block">PulseOS v0.1.0</span>
        </div>
      </div>
    </div>
  )
}
