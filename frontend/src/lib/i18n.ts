import { writable, derived } from 'svelte/store'
import en from '$locales/en.json'
import ptBR from '$locales/pt-BR.json'

export type Locale = string
type TranslationKey = keyof typeof en

const translations: Record<string, Record<TranslationKey, string>> = {
  en: en as Record<TranslationKey, string>,
  'pt-BR': ptBR as Record<TranslationKey, string>,
}

const availableCodes = Object.keys(translations)

function getDisplayName(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return code
  }
}

export const localeOptions = availableCodes
  .sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)))
  .map((code) => ({ code, name: getDisplayName(code) }))

function detectLocale(): string {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language

  if (availableCodes.includes(lang)) return lang

  const prefix = lang.split('-')[0].toLowerCase()
  const prefixMatch = availableCodes.find((l) => l.toLowerCase().startsWith(prefix))
  if (prefixMatch) return prefixMatch

  return 'en'
}

function createLocale() {
  const stored = typeof localStorage !== 'undefined'
    ? localStorage.getItem('locale')
    : null
  const initial = stored && availableCodes.includes(stored) ? stored : detectLocale()

  const { subscribe, set } = writable<string>(initial)

  return {
    subscribe,
    set(l: string) {
      if (typeof localStorage !== 'undefined') localStorage.setItem('locale', l)
      set(l)
    },
  }
}

export const locale = createLocale()

export const t = derived(locale, ($locale) => {
  const dict = translations[$locale] ?? translations.en
  return (key: TranslationKey, vars?: Record<string, string | number>): string => {
    let str = (dict[key] ?? en[key] ?? key) as string
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v))
      }
    }
    return str
  }
})

export function nMonitors(loc: Locale, n: number): string {
  if (loc === 'pt-BR') return `${n} ${n === 1 ? 'monitor' : 'monitores'}`
  return `${n} monitor${n === 1 ? '' : 's'}`
}
