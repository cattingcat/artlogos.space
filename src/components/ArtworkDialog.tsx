import { useEffect, useRef, useState } from 'react'
import type { Artwork } from '../content/artworks'
import { artworkPath } from '../content/artwork-pages'
import { useI18n } from '../i18n/context'
import ImageLightbox from './ImageLightbox'
import ImageZoomHint from './ImageZoomHint'
import SocialIconLinks from './SocialIconLinks'
import { useModalDialog } from './useModalDialog'
import './ArtworkDialog.css'
import ArtworkFacts from './ArtworkFacts'

type Props = {
  artwork: Artwork
  index: number
  total: number
  onClose: () => void
  onMove: (direction: number) => void
}

export default function ArtworkDialog({ artwork, index, total, onClose, onMove }: Props) {
  const { locale, t, category, tag } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const thumbnails = useRef<HTMLDivElement>(null)
  const activeThumbnail = useRef<HTMLButtonElement>(null)
  const swipeStart = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const suppressZoomClick = useRef(false)
  const [selection, setSelection] = useState({ artworkId: artwork.id, photo: 0 })
  const [zoomedPhoto, setZoomedPhoto] = useState<number | null>(null)
  if (selection.artworkId !== artwork.id) {
    setSelection({ artworkId: artwork.id, photo: 0 })
    setZoomedPhoto(null)
  }
  const photoCount = artwork.images.length
  const activePhoto = selection.artworkId === artwork.id
    ? Math.min(selection.photo, Math.max(0, photoCount - 1))
    : 0
  const photo = artwork.images[activePhoto]
  const hasMultiplePhotos = photoCount > 1

  function selectPhoto(photoIndex: number) {
    setSelection({ artworkId: artwork.id, photo: photoIndex })
  }

  function movePhoto(direction: number) {
    if (!hasMultiplePhotos) return
    setSelection(current => ({
      artworkId: artwork.id,
      photo: ((current.artworkId === artwork.id ? current.photo : 0) + direction + photoCount) % photoCount,
    }))
  }

  useModalDialog(dialog)

  useEffect(() => {
    const strip = thumbnails.current
    const thumbnail = activeThumbnail.current
    if (!strip || !thumbnail) return
    const left = thumbnail.offsetLeft
    const right = left + thumbnail.offsetWidth
    if (left < strip.scrollLeft) strip.scrollLeft = left
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth
  }, [activePhoto, artwork.id])

  return (
    <dialog
      ref={dialog}
      className="artwork-dialog artwork-viewer"
      aria-labelledby="artwork-title"
      onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
      onKeyDown={event => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !hasMultiplePhotos) return
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault()
          movePhoto(event.key === 'ArrowRight' ? 1 : -1)
        }
      }}
    >
      <div className="artwork-viewer-inner">
        <button className="viewer-close" onClick={onClose} aria-label={t('closeArtwork')} autoFocus>×</button>

        <section className="viewer-gallery" aria-label={t('photosOf', { title: artwork.title })}>
          <div
            className="viewer-photo-stage"
            onPointerDown={event => {
              suppressZoomClick.current = false
              if (!hasMultiplePhotos || event.pointerType !== 'touch' || !event.isPrimary) return
              swipeStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
            }}
            onPointerUp={event => {
              const start = swipeStart.current
              swipeStart.current = null
              if (!start || start.pointerId !== event.pointerId) return
              const deltaX = event.clientX - start.x
              const deltaY = event.clientY - start.y
              if (Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                suppressZoomClick.current = true
                movePhoto(deltaX < 0 ? 1 : -1)
              }
            }}
            onPointerCancel={() => { swipeStart.current = null; suppressZoomClick.current = false }}
          >
            {photo
              ? <a className="viewer-photo-zoom image-zoom-trigger" href={photo.src} aria-label={t('enlargeImage', { label: `${artwork.title} — ${photo.label}` })} aria-haspopup="dialog" onClick={event => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                event.preventDefault()
                if (suppressZoomClick.current && event.detail > 0) {
                  suppressZoomClick.current = false
                  return
                }
                event.currentTarget.focus({ preventScroll: true })
                setZoomedPhoto(activePhoto)
              }}><img key={photo.src} src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} draggable={false} /><ImageZoomHint /></a>
              : <p className="viewer-no-photo">{t('photosSoon')}</p>}
          </div>

          {photo && <div className={`viewer-photo-navigation${hasMultiplePhotos ? '' : ' is-single'}`}>
            {hasMultiplePhotos && <button className="viewer-photo-arrow" onClick={() => movePhoto(-1)} aria-label={t('previousPhoto')}>←</button>}
            <div className="viewer-photo-caption" role="status" aria-live="polite" aria-atomic="true">
              <span className="viewer-photo-label">{photo.label}</span>
              <span className="viewer-photo-count">{t('photoPosition', { current: activePhoto + 1, total: photoCount })}</span>
            </div>
            {hasMultiplePhotos && <button className="viewer-photo-arrow" onClick={() => movePhoto(1)} aria-label={t('nextPhoto')}>→</button>}
          </div>}

          {hasMultiplePhotos && <div className="viewer-thumbnails" ref={thumbnails} role="group" aria-label={t('choosePhoto')}>
            {artwork.images.map((image, photoIndex) => (
              <button
                key={image.src}
                ref={photoIndex === activePhoto ? activeThumbnail : undefined}
                className="viewer-thumbnail"
                aria-label={t('viewPhoto', { number: photoIndex + 1, label: image.label })}
                aria-pressed={photoIndex === activePhoto}
                title={image.label}
                onClick={() => selectPhoto(photoIndex)}
              >
                <img src={image.thumbnail} alt="" width={image.width} height={image.height} loading="lazy" draggable={false} />
              </button>
            ))}
          </div>}
        </section>

        <div className="viewer-information">
          <span className="eyebrow">{category(artwork.category)}</span>
          <h2 id="artwork-title">{artwork.title}</h2>
          <a className="underlined-link" href={artworkPath(artwork, locale)}>{t('paintingPage')} ↗</a>
          <ArtworkFacts artwork={artwork} />
          {artwork.description && <div className="viewer-description">
            {artwork.description.split(/\n\s*\n/).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
          </div>}
          {artwork.tags.length > 0 && <ul className="viewer-tags" aria-label={t('artworkSubjects')}>
            {artwork.tags.map(value => <li key={value}>{tag(value)}</li>)}
          </ul>}
          <SocialIconLinks className="artwork-social-links" sources={artwork.sources} />
          {hasMultiplePhotos && <p className="viewer-hint">{t('viewerHint', { count: photoCount })}</p>}
          {total > 1 && <nav className="viewer-artwork-navigation" aria-label={t('browseArtworks')}>
            <p>{t('artworkPosition', { current: index + 1, total })}</p>
            <div>
              <button onClick={() => onMove(-1)}><span aria-hidden="true">←</span> {t('previousArtwork')}</button>
              <button onClick={() => onMove(1)}>{t('nextArtwork')} <span aria-hidden="true">→</span></button>
            </div>
          </nav>}
        </div>
      </div>
      {zoomedPhoto !== null && <ImageLightbox images={artwork.images} initialIndex={zoomedPhoto} title={artwork.title} onClose={() => setZoomedPhoto(null)} />}
    </dialog>
  )
}
