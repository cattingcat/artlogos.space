import type { Artwork } from './artworks'
import { site } from './site'
import { type Locale, homePath } from '../i18n/locale'
import { getSite, translate } from '../i18n/catalog'

export const artworkPath = (artwork: Pick<Artwork, 'id'>, locale: Locale = 'en') => `${homePath(locale)}works/${artwork.id}/`
export const artworkUrl = (artwork: Pick<Artwork, 'id'>, locale: Locale = 'en') => new URL(artworkPath(artwork, locale), site.url).href
export const artworkPageTitle = (artwork: Artwork, locale: Locale = 'en') => `${artwork.title} — ${site.artistName} (${getSite(locale).fullName})`
export const artworkPageDescription = (artwork: Artwork, locale: Locale = 'en') => {
  const introduction = translate(locale, 'paintingIntro', { title: artwork.title })
  const description = artwork.description?.replace(/\s+/g, ' ').trim()
  return description ? `${introduction} ${description}` : `${introduction} ${translate(locale, 'paintingFallback')}`
}

export function artworkIdFromPath(pathname: string) {
  return /^\/(?:en\/|ru\/|fr\/|de\/|it\/|es\/|ja\/)?works\/([a-z0-9-]+)\/?$/.exec(pathname)?.[1]
}
