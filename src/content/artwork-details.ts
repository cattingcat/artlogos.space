import type { Artwork } from './artworks'

// Keep the facts in text summaries even when the painting has no artist statement.
export function artworkDescriptionText(artwork: Pick<Artwork, 'size' | 'material' | 'description'>) {
  return [artwork.size, artwork.material, artwork.description].filter(Boolean).join('\n\n') || undefined
}
