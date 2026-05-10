import type { NotificationPayload } from './index'
import { typeLabel } from './messages'

export async function sendTelegram(
  config: Record<string, string>,
  payload: NotificationPayload,
  locale: string,
): Promise<void> {
  const icon = payload.status === 'up' ? '✅' : '🔴'
  const label = typeLabel(payload.type, locale)

  let text = `${icon} <b>${label}: ${payload.monitor.name}</b>`
  if (payload.message) text += `\n${payload.message}`
  if (payload.monitor.url) text += `\n<code>${payload.monitor.url}</code>`
  if (payload.responseTimeMs != null) text += `\n${payload.responseTimeMs}ms`

  await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: config.chatId, text, parse_mode: 'HTML' }),
  })
}
