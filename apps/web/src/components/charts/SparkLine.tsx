import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from 'recharts'

interface Props {
  data: number[]
  color: string
  label: string
  currentValue: string
  unit?: string
  domain?: [number, number]
}

export function SparkLine({ data, color, label, currentValue, unit = '%', domain = [0, 100] }: Props) {
  const chartData = data.map((v, i) => ({ i, v }))
  const fill = color + '18'

  return (
    <div className="bg-surface-2 border border-surface-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold font-mono text-slate-100">{currentValue}</span>
          <span className="text-[10px] text-slate-600">{unit}</span>
        </div>
      </div>

      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={domain} hide />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="bg-surface-3 border border-surface-border text-slate-300 text-[10px] font-mono px-2 py-1 rounded">
                    {Math.round(payload[0].value as number)}{unit}
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#grad-${label})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
