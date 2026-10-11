export const locales = ['en', 'ru', 'fr', 'de', 'it', 'es', 'ja'] as const
export type Locale = (typeof locales)[number]
export const languageNames: Record<Locale, string> = {
  en: 'English', ru: 'Русский', fr: 'Français', de: 'Deutsch', it: 'Italiano', es: 'Español', ja: '日本語',
}
export const ogLocales: Record<Locale, string> = { en: 'en_US', ru: 'ru_RU', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', es: 'es_ES', ja: 'ja_JP' }
export const languageStorageKey = 'artlogos-language'
export const isLocale = (value: unknown): value is Locale => typeof value === 'string' && locales.includes(value as Locale)
export const homePath = (locale: Locale) => `/${locale}/`
export function localeFromPath(pathname: string): Locale | undefined {
  const segment = pathname.split('/')[1]
  return isLocale(segment) ? segment : undefined
}
export function preferredLocale(saved: unknown, languages: readonly string[]): Locale {
  if (isLocale(saved)) return saved
  for (const language of languages) {
    const base = language.toLowerCase().replace('_', '-').split('-')[0]
    if (isLocale(base)) return base
  }
  return 'en'
}
export function entryRedirect(pathname: string, search: string, hash: string, saved: unknown, languages: readonly string[]) {
  // Explicit language URLs always win over stored or browser preferences.
  if (pathname !== '/' && pathname !== '/index.html') return null
  return `${homePath(preferredLocale(saved, languages))}${search}${hash}`
}
