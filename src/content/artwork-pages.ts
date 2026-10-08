import type { Artwork } from './artworks'
import { site } from './site'

export const artworkPath = (artwork: Pick<Artwork, 'id'>) => `/works/${artwork.id}/`
export const artworkUrl = (artwork: Pick<Artwork, 'id'>) => new URL(artworkPath(artwork), site.url).href
export const artworkPageTitle = (artwork: Artwork) => `${artwork.title} — ${site.artistName} (${site.fullName})`
export const artworkPageDescription = (artwork: Artwork) => {
  const introduction = `${artwork.title}, a painting by ${site.artistName} (${site.fullName}).`
  const description = artwork.description?.replace(/\s+/g, ' ').trim()
  return description ? `${introduction} ${description}` : `${introduction} View the painting and its photographs.`
}

export function artworkIdFromPath(pathname: string) {
  return /^\/works\/([a-z0-9-]+)\/?$/.exec(pathname)?.[1]
}
