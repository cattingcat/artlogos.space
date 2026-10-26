import en from './locales/en.json'
import ru from './locales/ru.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import it from './locales/it.json'
import es from './locales/es.json'
import ja from './locales/ja.json'
import { artworks, type Artwork } from '../content/artworks'
import { site } from '../content/site'
import type { Locale } from './locale'

export type Messages = {
  ui: Record<keyof typeof en.ui, string>
  site: typeof en.site
  categories: Record<string, string>
  tags: Record<string, string>
  artworks: Record<string, { title: string; size?: string; material?: string; description?: string; images: { label: string; alt: string }[] }>
}
export const dictionaries: Record<Locale, Messages> = { en, ru, fr, de, it, es, ja }
export type MessageKey = keyof typeof en.ui
export function translate(locale: Locale, key: MessageKey, values: Record<string, string | number> = {}) {
  return dictionaries[locale].ui[key].replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder))
}
export function countText(locale: Locale, key: 'workCount' | 'photoCount', count: number) {
  const form = new Intl.PluralRules(locale).select(count)
  const selected = `${key}_${form}` as MessageKey
  return translate(locale, selected in dictionaries[locale].ui ? selected : `${key}_other`, { count })
}
const localizedArtworks = new Map<Locale, Artwork[]>()
export function getArtworks(locale: Locale) {
  let result = localizedArtworks.get(locale)
  if (!result) {
    result = artworks.map(work => {
      const copy = dictionaries[locale].artworks[work.id]
      return { ...work, title: copy.title, size: copy.size, material: copy.material, description: copy.description, images: work.images.map((image, index) => ({ ...image, ...copy.images[index] })) }
    })
    localizedArtworks.set(locale, result)
  }
  return result
}
export function getSite(locale: Locale) {
  const copy = dictionaries[locale].site
  return { ...site, fullName: copy.fullName, pageTitle: copy.pageTitle, description: copy.description, collectionHeading: copy.collectionHeading, sidebarNote: copy.sidebarNote, footerNote: copy.footerNote,
    about: { ...site.about, eyebrow: copy.aboutEyebrow, title: copy.aboutTitle, imageAlt: copy.aboutImageAlt, caption: copy.aboutCaption, paragraphs: copy.aboutParagraphs },
    studio: { ...site.studio, eyebrow: copy.studioEyebrow, title: copy.studioTitle, imageAlt: copy.studioImageAlt, paragraphs: copy.studioParagraphs },
    contact: { ...site.contact, eyebrow: copy.contactEyebrow, title: copy.contactTitle, description: copy.contactDescription },
  }
}
