import type { Artwork } from '../content/artworks'
import { useI18n } from '../i18n/context'
import './ArtworkFacts.css'

export default function ArtworkFacts({ artwork }: { artwork: Pick<Artwork, 'size' | 'material'> }) {
  const { t } = useI18n()
  if (!artwork.size && !artwork.material) return null

  return <dl className={`artwork-facts${artwork.size && artwork.material ? ' artwork-facts--paired' : ''}`}>
    {artwork.size && <div className="artwork-fact artwork-fact--size">
      <dt>{t('artworkSize')}</dt>
      <dd>{artwork.size}</dd>
    </div>}
    {artwork.material && <div className="artwork-fact artwork-fact--material">
      <dt>{t('artworkMaterial')}</dt>
      <dd>{artwork.material}</dd>
    </div>}
  </dl>
}
