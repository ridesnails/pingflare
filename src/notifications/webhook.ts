import type { NotificationPayload } from './index'

export async function sendWebhook(
  config: Record<string, string>,
  payload: NotificationPayload,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.secret) headers['X-Pingflare-Secret'] = config.secret

  await fetch(config.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...payload,
      timestamp: Math.floor(Date.now() / 1000),
    }),
  })
}
