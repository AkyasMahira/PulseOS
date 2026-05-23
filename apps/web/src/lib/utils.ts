export function fmtBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function fmtBytesPerSec(bytesPerSec: number): string {
  return `${fmtBytes(bytesPerSec)}/s`
}

export function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function fmtPct(value: number): string {
  return `${Math.round(value)}%`
}

export function statusColor(pct: number): string {
  if (pct >= 90) return 'text-accent-red'
  if (pct >= 75) return 'text-accent-amber'
  return 'text-accent-green'
}

export function statusBarColor(pct: number): string {
  if (pct >= 90) return '#ef4444'
  if (pct >= 75) return '#f59e0b'
  return '#3b82f6'
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
