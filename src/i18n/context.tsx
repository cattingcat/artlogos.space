import { createContext, useContext, type ReactNode } from 'react'
import type { Locale } from './locale'
import { countText, dictionaries, getArtworks, getSite, translate, type MessageKey } from './catalog'

const LocaleContext = createContext<Locale>('en')
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}
export function useI18n() {
  const locale = useContext(LocaleContext)
  return { locale, messages: dictionaries[locale], site: getSite(locale), artworks: getArtworks(locale),
    t: (key: MessageKey, values?: Record<string, string | number>) => translate(locale, key, values),
    count: (key: 'workCount' | 'photoCount', value: number) => countText(locale, key, value),
    category: (key: string) => dictionaries[locale].categories[key] ?? key,
    tag: (key: string) => dictionaries[locale].tags[key] ?? key,
  }
}
