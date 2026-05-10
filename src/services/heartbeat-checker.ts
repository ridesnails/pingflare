import type { Monitor } from '../db/schema'
import { msgNoHeartbeatYet, msgLastHeartbeat, msgHeartbeatOverdue } from '../notifications/messages'

export interface HeartbeatCheckResult {
  status: 'up' | 'down'
  message: string
  logKey?: string
}

export function checkHeartbeat(
  monitor: Monitor,
  lastPingAt: number | null,
  now = Math.floor(Date.now() / 1000),
  locale = 'en',
): HeartbeatCheckResult {
  if (lastPingAt === null) {
    return { status: 'down', message: msgNoHeartbeatYet(locale), logKey: 'notify.noHeartbeatYet' }
  }

  const interval = monitor.heartbeatInterval ?? monitor.interval
  const grace = monitor.heartbeatGrace ?? 30
  const deadline = lastPingAt + interval + grace

  if (now <= deadline) {
    return { status: 'up', message: msgLastHeartbeat(locale, now - lastPingAt) }
  }

  const overdue = now - deadline
  return {
    status: 'down',
    message: msgHeartbeatOverdue(locale, overdue, now - lastPingAt),
  }
}
