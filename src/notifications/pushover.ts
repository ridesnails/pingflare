import type { NotificationPayload } from './index'
import { formatMessage } from './messages'

export async function sendPushover(
  config: Record<string, string>,
  payload: NotificationPayload,
  locale: string,
): Promise<void> {
  const priority = payload.status === 'down' ? '1' : '0'

  await fetch('https://api.pushover.net/1/messages.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: config.token,
      user: config.user,
      message: formatMessage(payload, locale),
      priority,
      title: payload.monitor.name,
    }),
  })
}
