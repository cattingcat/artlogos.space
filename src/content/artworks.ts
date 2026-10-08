import collection from './portfolio.json'

export const categories = ['All works', 'Landscapes', 'Cityscapes', 'Figures', 'Portraits', 'Interiors'] as const
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
  description?: string
  sources?: { label: string; url: string }[]
  category: ArtworkCategory
  tags: string[]
  images: ArtworkImage[]
}

// Titles and descriptions can be edited in portfolio.json.
// Unmatched works retain descriptive working titles; sources identify verified publications.
export const artworks = collection as Artwork[]
