import type { NotificationPayload } from './index'
import { formatMessage } from './messages'

export async function sendSlack(
  config: Record<string, string>,
  payload: NotificationPayload,
  locale: string,
): Promise<void> {
  await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: formatMessage(payload, locale) }),
  })
}
