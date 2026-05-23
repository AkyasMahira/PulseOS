import type { ReactNode } from 'react'
import { cn, statusBarColor } from '../../lib/utils'

interface Props {
  label: string
  value: string
  sub?: string
  pct?: number
  icon?: ReactNode
  alert?: boolean
  className?: string
}

export function MetricCard({ label, value, sub, pct, icon, alert, className }: Props) {
  const barColor = pct !== undefined ? statusBarColor(pct) : '#3b82f6'

  return (
    <div className={cn(
      'bg-surface-2 border border-surface-border rounded-lg p-3.5 flex flex-col gap-1.5 transition-all duration-200',
      alert && 'border-red-900/40 bg-red-950/20',
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">{label}</span>
        {icon && <span className="text-slate-600">{icon}</span>}
      </div>

      <div className={cn(
        'text-xl font-bold font-mono tracking-tight',
        pct !== undefined && pct >= 90 ? 'text-accent-red' :
        pct !== undefined && pct >= 75 ? 'text-accent-amber' :
        'text-slate-100'
      )}>
        {value}
      </div>

      {sub && <div className="text-[10px] text-slate-600 font-mono">{sub}</div>}

      {pct !== undefined && (
        <div className="h-0.5 bg-surface-3 rounded-full overflow-hidden mt-1">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
          />
        </div>
      )}
    </div>
  )
}
