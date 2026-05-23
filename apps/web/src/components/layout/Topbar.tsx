import { useMetricsStore } from '../../stores/metrics'
import { fmtUptime } from '../../lib/utils'
import { Wifi, WifiOff, Menu } from 'lucide-react'

interface Props {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: Props) {
  const { connected, snapshot } = useMetricsStore()

  return (
    <header className="bg-surface-1 border-b border-surface-border px-4 py-2.5 flex items-center justify-between flex-shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Menu size={16} />
        </button>

        {/* Mobile logo */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
          <span className="text-sm font-bold tracking-widest font-mono">
            PULSE<span className="text-accent-blue">OS</span>
          </span>
        </div>

        {snapshot?.hostname && (
          <span className="hidden sm:block text-slate-600 text-xs font-mono">
            {snapshot.hostname}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs font-mono">
        {snapshot && (
          <span className="hidden md:block text-slate-600">
            up {fmtUptime(snapshot.uptime)}
          </span>
        )}

        {snapshot?.cpu && (
          <span className="hidden sm:block text-slate-600">
            {snapshot.cpu.cores}c · {snapshot.cpu.model.split(' ').slice(0, 3).join(' ')}
          </span>
        )}

        <div className="flex items-center gap-1.5">
          {connected
            ? <><Wifi size={12} className="text-accent-green" /><span className="text-accent-green text-[11px]">live</span></>
            : <><WifiOff size={12} className="text-accent-red" /><span className="text-accent-red text-[11px]">offline</span></>
          }
        </div>
      </div>
    </header>
  )
}
