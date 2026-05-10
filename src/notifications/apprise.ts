import type { NotificationPayload } from './index'
import { formatMessage } from './messages'

export async function sendApprise(
  config: Record<string, string>,
  payload: NotificationPayload,
  locale: string,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.token) headers['Authorization'] = `Bearer ${config.token}`

  await fetch(`${config.url}/notify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      urls: config.urls,
      title: payload.monitor.name,
      body: formatMessage(payload, locale),
      type: payload.status === 'up' ? 'success' : 'failure',
    }),
  })
}
