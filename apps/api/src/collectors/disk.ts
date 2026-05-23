import { exec } from 'child_process'
import { promisify } from 'util'
import type { DiskMetric } from '@pulseos/types'

const execAsync = promisify(exec)

export async function collectDisk(): Promise<DiskMetric[]> {
  try {
    const { stdout } = await execAsync("df -Pk --exclude-type=tmpfs --exclude-type=devtmpfs --exclude-type=squashfs")
    const lines = stdout.trim().split('\n').slice(1)  // skip header

    return lines.map(line => {
      const parts = line.split(/\s+/)
      const device = parts[0]
      const total = parseInt(parts[1]) * 1024       // 1K-blocks → bytes
      const used = parseInt(parts[2]) * 1024
      const free = parseInt(parts[3]) * 1024
      const mountpoint = parts[5]

      return {
        device,
        mountpoint,
        total,
        used,
        free,
        usagePercent: total > 0 ? Math.round((used / total) * 100) : 0,
      }
    }).filter(d => d.total > 0)
  } catch {
    return []
  }
}
