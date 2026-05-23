import { useMetricsStore } from '../../stores/metrics'
import { SparkLine } from '../charts/SparkLine'
import { fmtBytes, fmtBytesPerSec } from '../../lib/utils'

export function NetworkPage() {
  const { snapshot, netRxHistory, netTxHistory } = useMetricsStore()
  const interfaces = snapshot?.net ?? []

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      {/* Aggregate charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <SparkLine
          data={netRxHistory.map(b => b / 1024)}
          color="#22c55e"
          label="RX Bandwidth"
          currentValue={fmtBytesPerSec(netRxHistory[netRxHistory.length - 1] ?? 0)}
          unit=""
          domain={[0, Math.max(...netRxHistory.map(b => b / 1024), 1)]}
        />
        <SparkLine
          data={netTxHistory.map(b => b / 1024)}
          color="#8b5cf6"
          label="TX Bandwidth"
          currentValue={fmtBytesPerSec(netTxHistory[netTxHistory.length - 1] ?? 0)}
          unit=""
          domain={[0, Math.max(...netTxHistory.map(b => b / 1024), 1)]}
        />
      </div>

      {/* Per-interface table */}
      <div className="bg-surface-2 border border-surface-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_110px_110px_130px_130px] gap-2 px-4 py-2.5 border-b border-surface-border text-[9px] text-slate-600 uppercase tracking-widest font-mono">
          <span>Interface</span>
          <span>RX Rate</span>
          <span>TX Rate</span>
          <span>Total RX</span>
          <span>Total TX</span>
        </div>

        {interfaces.length === 0 && (
          <div className="text-slate-600 text-xs font-mono px-4 py-8 text-center">No network interfaces detected</div>
        )}

        {interfaces.map(iface => (
          <div key={iface.interface} className="grid grid-cols-[1fr_110px_110px_130px_130px] gap-2 px-4 py-3 border-b border-surface-border last:border-0 items-center hover:bg-surface-3/30 transition-colors">
            <div>
              <span className="text-slate-200 text-xs font-mono">{iface.interface}</span>
            </div>
            <div>
              <span className="text-accent-green text-xs font-mono">↓ {fmtBytesPerSec(iface.rxBytes)}</span>
            </div>
            <div>
              <span className="text-purple-400 text-xs font-mono">↑ {fmtBytesPerSec(iface.txBytes)}</span>
            </div>
            <div className="text-slate-500 text-xs font-mono">{fmtBytes(iface.rxTotal)}</div>
            <div className="text-slate-500 text-xs font-mono">{fmtBytes(iface.txTotal)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
