import { useMetricsStore } from '../../stores/metrics'
import type { PageId } from '@pulseos/types'
import {
  LayoutDashboard, Container, Cpu, Activity, Bell,
  BarChart2, Settings, Globe, LogOut
} from 'lucide-react'
import { useAuthStore } from '../../stores/metrics'

const NAV: { id: PageId; label: string; icon: any; section?: string }[] = [
  { id: 'overview',    label: 'Overview',    icon: LayoutDashboard, section: 'Monitor' },
  { id: 'containers',  label: 'Containers',  icon: Container },
  { id: 'processes',   label: 'Processes',   icon: Cpu },
  { id: 'network',     label: 'Network',     icon: Activity },
  { id: 'alerts',      label: 'Alerts',      icon: Bell, section: 'Manage' },
  { id: 'history',     label: 'History',     icon: BarChart2 },
  { id: 'settings',    label: 'Settings',    icon: Settings, section: 'System' },
]

export function Sidebar() {
  const { currentPage, setPage, alerts, services } = useMetricsStore()
  const { username, clearAuth } = useAuthStore()

  const offlineCount = services.filter(s => s.status === 'offline').length
  const unreadAlerts = alerts.filter(a => !a.resolvedAt).length

  const badges: Partial<Record<PageId, string>> = {
    alerts: unreadAlerts > 0 ? String(unreadAlerts) : undefined,
    overview: offlineCount > 0 ? `${offlineCount} ↓` : undefined,
  } as any

  return (
    <nav className="hidden lg:flex flex-col w-48 bg-surface-1 border-r border-surface-border flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-[0_0_5px_#22c55e88] animate-pulse-slow" />
        <span className="text-sm font-bold tracking-widest font-mono">
          PULSE<span className="text-accent-blue">OS</span>
        </span>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-3 overflow-y-auto">
        {NAV.map((item, i) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          const badge = badges[item.id]
          const showSection = item.section && (i === 0 || NAV[i - 1].section !== item.section)

          return (
            <div key={item.id}>
              {showSection && (
                <div className="px-4 pt-3 pb-1 text-[9px] text-slate-600 uppercase tracking-widest font-mono">
                  {item.section}
                </div>
              )}
              <button
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs transition-all border-l-2 font-mono ${
                  isActive
                    ? 'text-slate-100 border-accent-blue bg-accent-blue/5'
                    : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-surface-2/60'
                }`}
              >
                <Icon size={13} />
                <span>{item.label}</span>
                {badge && (
                  <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    item.id === 'alerts' ? 'bg-red-950/60 text-red-400' : 'bg-amber-950/60 text-amber-400'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* User footer */}
      <div className="border-t border-surface-border px-4 py-2.5 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-slate-400 font-mono truncate">{username}</div>
          <div className="text-[9px] text-slate-600">admin</div>
        </div>
        <button
          onClick={() => { clearAuth(); window.location.reload() }}
          className="text-slate-600 hover:text-slate-400 transition-colors"
          title="Sign out"
        >
          <LogOut size={13} />
        </button>
      </div>
    </nav>
  )
}
