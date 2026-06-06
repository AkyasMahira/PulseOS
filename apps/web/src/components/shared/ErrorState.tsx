import { AlertTriangle, WifiOff, FileQuestion, RefreshCw, Home } from 'lucide-react'
import { useMetricsStore } from '../../stores/metrics'

type ErrorType = '404' | '500' | 'offline' | 'crash' | 'generic'

interface Props {
  type: ErrorType
  title?: string
  message?: string
  onRetry?: () => void
}

const CONFIG: Record<ErrorType, { icon: typeof AlertTriangle; defaultTitle: string; defaultMessage: string }> = {
  '404': {
    icon: FileQuestion,
    defaultTitle: 'Page Not Found',
    defaultMessage: 'The page you\'re looking for doesn\'t exist or was moved.',
  },
  '500': {
    icon: AlertTriangle,
    defaultTitle: 'Server Error',
    defaultMessage: 'An unexpected error occurred on the server. Please try again.',
  },
  offline: {
    icon: WifiOff,
    defaultTitle: 'Connection Lost',
    defaultMessage: 'Unable to reach the server. Check your connection.',
  },
  crash: {
    icon: AlertTriangle,
    defaultTitle: 'Unexpected Error',
    defaultMessage: 'The application encountered an error and needs to reload.',
  },
  generic: {
    icon: AlertTriangle,
    defaultTitle: 'Error',
    defaultMessage: 'Something went wrong. Please try again.',
  },
}

export function ErrorState({ type, title, message, onRetry }: Props) {
  const { setPage } = useMetricsStore()
  const config = CONFIG[type]
  const Icon = config.icon

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-accent-green shadow-[0_0_6px_#22c55e88]" />
          <span className="text-lg font-bold tracking-widest font-mono">PULSE<span className="text-accent-blue">OS</span></span>
        </div>
        <p className="text-slate-600 text-xs font-mono">VPS Monitoring Dashboard</p>
      </div>

      <div className="bg-surface-2 border border-surface-border rounded-xl p-6 flex flex-col items-center text-center max-w-sm mx-auto gap-4">
        <div className="w-12 h-12 rounded-full bg-surface-3 border border-surface-border flex items-center justify-center">
          <Icon size={22} className={
            type === 'offline' ? 'text-amber-400' :
            type === '404' ? 'text-slate-500' :
            'text-accent-red'
          } />
        </div>

        <div>
          <div className="text-sm text-slate-200 font-mono font-semibold mb-1">
            {title ?? config.defaultTitle}
          </div>
          <div className="text-xs text-slate-500 font-mono leading-relaxed">
            {message ?? config.defaultMessage}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {type === '404' && (
            <button
              onClick={() => setPage('overview')}
              className="flex items-center gap-1.5 bg-surface-3 border border-surface-border text-slate-300 text-xs font-mono px-4 py-2 rounded-lg hover:text-slate-100 hover:bg-surface-3/80 transition-all"
            >
              <Home size={12} /> Go to Dashboard
            </button>
          )}
          {(type === '500' || type === 'offline' || type === 'crash') && onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs font-mono px-4 py-2 rounded-lg hover:bg-accent-blue/20 transition-all"
            >
              <RefreshCw size={12} /> {type === 'offline' ? 'Reconnect' : 'Reload'}
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-700 font-mono mt-4">
        PulseOS · self-hosted
      </p>
    </div>
  )
}
