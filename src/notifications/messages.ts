import type { NotificationPayload } from './index'
import en from '../../locales/en.json'
import ptBR from '../../locales/pt-BR.json'

type LocaleData = Record<string, string>
const locales: Record<string, LocaleData> = {
  en: en as LocaleData,
  'pt-BR': ptBR as LocaleData,
}

function sf(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? k))
}

function s(locale: string, key: string): string {
  return locales[locale]?.[key] ?? locales.en[key] ?? key
}

export function typeLabel(type: NotificationPayload['type'], locale: string): string {
  return s(locale, `notify.${type}`)
}

export function formatMessage(payload: NotificationPayload, locale: string): string {
  const icon = payload.status === 'up' ? '✅' : '🔴'
  const label = s(locale, `notify.${payload.type}`).toUpperCase()
  const statusDesc = payload.type === 'reminder'
    ? s(locale, 'notify.stillDown')
    : payload.status === 'up' ? s(locale, 'notify.up') : s(locale, 'notify.down')

  let text = `${icon} [${label}] ${payload.monitor.name} ${statusDesc}`
  if (payload.message) text += `: ${payload.message}`
  return text
}

export function msgHeartbeatReceived(locale: string): string {
  return s(locale, 'notify.heartbeatReceived')
}

export function msgNoHeartbeatYet(locale: string): string {
  return s(locale, 'notify.noHeartbeatYet')
}

export function msgLastHeartbeat(locale: string, secondsAgo: number): string {
  return sf(s(locale, 'notify.lastHeartbeat'), { n: secondsAgo })
}

export function msgHeartbeatOverdue(locale: string, overdue: number, lastSeen: number): string {
  return sf(s(locale, 'notify.heartbeatOverdue'), { overdue, lastSeen })
}

export function msgTimeoutAfter(locale: string, seconds: number): string {
  return sf(s(locale, 'notify.timeoutAfter'), { n: seconds })
}

export function metaFields(
  payload: NotificationPayload,
  locale: string,
): { name: string; value: string; inline: boolean }[] {
  const fields: { name: string; value: string; inline: boolean }[] = []
  if (payload.monitor.url)
    fields.push({ name: s(locale, 'notify.url'), value: payload.monitor.url, inline: true })
  if (payload.responseTimeMs != null)
    fields.push({ name: s(locale, 'notify.responseTime'), value: `${payload.responseTimeMs}ms`, inline: true })
  if (payload.incidentStartedAt)
    fields.push({ name: s(locale, 'notify.incidentStarted'), value: new Date(payload.incidentStartedAt * 1000).toUTCString(), inline: false })
  return fields
}
