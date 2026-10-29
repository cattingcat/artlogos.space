import collection from './portfolio.json'

export const categories = ['All works', 'Landscapes', 'Cityscapes', 'Figures', 'Portraits', 'Interiors', 'Still lifes'] as const
export type Category = (typeof categories)[number]
export type ArtworkCategory = Exclude<Category, 'All works'>

export type ArtworkImage = {
  src: string
  thumbnail: string
  alt: string
  label: string
  width: number
  height: number
}

export type Artwork = {
  id: string
  title: string
  size?: string
  material?: string
  description?: string
  sources?: { label: string; url: string }[]
  category: ArtworkCategory
  tags: string[]
  images: ArtworkImage[]
}

// Shared artwork metadata lives in portfolio.json; displayed text lives in i18n/locales.
// Unmatched works retain descriptive working titles; sources identify verified publications.
export const artworks = collection as Artwork[]
