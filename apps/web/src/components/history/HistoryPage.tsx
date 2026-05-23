import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { useAuthStore } from '../../stores/metrics'
import { format } from 'date-fns'

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001'

type Metric = 'cpu' | 'mem' | 'net_rx' | 'net_tx'
type Range = '1h' | '6h' | '24h' | '7d'

const RANGES: { label: string; value: Range; ms: number }[] = [
  { label: '1h',  value: '1h',  ms: 3_600_000 },
  { label: '6h',  value: '6h',  ms: 21_600_000 },
  { label: '24h', value: '24h', ms: 86_400_000 },
  { label: '7d',  value: '7d',  ms: 604_800_000 },
]

const METRICS: { label: string; value: Metric; color: string; unit: string }[] = [
  { label: 'CPU',     value: 'cpu',    color: '#f59e0b', unit: '%' },
  { label: 'Memory',  value: 'mem',    color: '#3b82f6', unit: '%' },
  { label: 'Net RX',  value: 'net_rx', color: '#22c55e', unit: 'B/s' },
  { label: 'Net TX',  value: 'net_tx', color: '#8b5cf6', unit: 'B/s' },
]

interface Point { t: number; v: number }

function fmtAxisVal(v: number, unit: string) {
  if (unit === 'B/s') {
    if (v > 1_048_576) return `${(v / 1_048_576).toFixed(1)}M`
    if (v > 1024) return `${(v / 1024).toFixed(0)}K`
    return `${v}B`
  }
  return `${Math.round(v)}%`
}

function HistoryChart({
  metric, range, color, unit, label
}: { metric: Metric; range: Range; color: string; unit: string; label: string }) {
  const [data, setData] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuthStore()

  useEffect(() => {
    setLoading(true)
    const to = Date.now()
    const ms = RANGES.find(r => r.value === range)!.ms
    const from = to - ms

    fetch(`${API_URL}/api/metrics/history?metric=${metric}&from=${from}&to=${to}&limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [metric, range, token])

  const chartData = data.map(p => ({
    t: p.t,
    v: Math.round(p.v * 10) / 10,
    label: format(new Date(p.t), range === '7d' ? 'MM/dd HH:mm' : 'HH:mm'),
  }))

  const max = Math.max(...chartData.map(d => d.v), unit === '%' ? 100 : 1)

  return (
    <div className="bg-surface-2 border border-surface-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400 uppercase tracking-widest font-mono">{label}</span>
        {loading && <span className="text-[10px] text-slate-600 font-mono animate-pulse">loading...</span>}
      </div>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id={`g-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, max]}
              tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => fmtAxisVal(v, unit)}
              width={42}
            />
            <Tooltip
              contentStyle={{
                background: '#161922',
                border: '1px solid #1e2330',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#94a3b8',
              }}
              formatter={(v: number) => [fmtAxisVal(v, unit), label]}
              labelStyle={{ color: '#475569' }}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#g-${metric})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {chartData.length > 0 && (
        <div className="flex gap-4 text-[10px] font-mono text-slate-600">
          <span>min: {fmtAxisVal(Math.min(...chartData.map(d => d.v)), unit)}</span>
          <span>max: {fmtAxisVal(Math.max(...chartData.map(d => d.v)), unit)}</span>
          <span>avg: {fmtAxisVal(chartData.reduce((a, d) => a + d.v, 0) / chartData.length, unit)}</span>
          <span className="ml-auto">{chartData.length} pts</span>
        </div>
      )}
    </div>
  )
}

export function HistoryPage() {
  const [range, setRange] = useState<Range>('1h')

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500 font-mono uppercase tracking-widest">Metrics History</div>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 text-[11px] font-mono rounded transition-all ${
                range === r.value
                  ? 'bg-accent-blue/15 border border-accent-blue/30 text-accent-blue'
                  : 'bg-surface-2 border border-surface-border text-slate-500 hover:text-slate-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2x2 grid of charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {METRICS.map(m => (
          <HistoryChart
            key={m.value}
            metric={m.value}
            range={range}
            color={m.color}
            unit={m.unit}
            label={m.label}
          />
        ))}
      </div>
    </div>
  )
}
