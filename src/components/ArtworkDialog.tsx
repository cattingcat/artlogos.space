import { useEffect, useRef, useState } from 'react'
import type { Artwork } from '../content/artworks'
import './ArtworkDialog.css'

type Props = {
  artwork: Artwork
  index: number
  total: number
  onClose: () => void
  onMove: (direction: number) => void
}

export default function ArtworkDialog({ artwork, index, total, onClose, onMove }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const thumbnails = useRef<HTMLDivElement>(null)
  const activeThumbnail = useRef<HTMLButtonElement>(null)
  const swipeStart = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const [selection, setSelection] = useState({ artworkId: artwork.id, photo: 0 })
  if (selection.artworkId !== artwork.id) setSelection({ artworkId: artwork.id, photo: 0 })
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

  useEffect(() => {
    const element = dialog.current!
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    if (!element.open) element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])

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
        if (event.altKey || event.ctrlKey || event.metaKey || !hasMultiplePhotos) return
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault()
          movePhoto(event.key === 'ArrowRight' ? 1 : -1)
        }
      }}
    >
      <div className="artwork-viewer-inner">
        <button className="viewer-close" onClick={onClose} aria-label="Close artwork" autoFocus>×</button>

        <section className="viewer-gallery" aria-label={`Photos of ${artwork.title}`}>
          <div
            className="viewer-photo-stage"
            onPointerDown={event => {
              if (!hasMultiplePhotos || event.pointerType !== 'touch' || !event.isPrimary) return
              swipeStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerUp={event => {
              const start = swipeStart.current
              swipeStart.current = null
              if (!start || start.pointerId !== event.pointerId) return
              const deltaX = event.clientX - start.x
              const deltaY = event.clientY - start.y
              if (Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                movePhoto(deltaX < 0 ? 1 : -1)
              }
            }}
            onPointerCancel={() => { swipeStart.current = null }}
          >
            {photo
              ? <img key={photo.src} src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} draggable={false} />
              : <p className="viewer-no-photo">Photos coming soon.</p>}
          </div>

          {photo && <div className={`viewer-photo-navigation${hasMultiplePhotos ? '' : ' is-single'}`}>
            {hasMultiplePhotos && <button className="viewer-photo-arrow" onClick={() => movePhoto(-1)} aria-label="Previous photo">←</button>}
            <div className="viewer-photo-caption" role="status" aria-live="polite" aria-atomic="true">
              <span className="viewer-photo-label">{photo.label}</span>
              <span className="viewer-photo-count">Photo {activePhoto + 1} of {photoCount}</span>
            </div>
            {hasMultiplePhotos && <button className="viewer-photo-arrow" onClick={() => movePhoto(1)} aria-label="Next photo">→</button>}
          </div>}

          {hasMultiplePhotos && <div className="viewer-thumbnails" ref={thumbnails} role="group" aria-label="Choose a photo">
            {artwork.images.map((image, photoIndex) => (
              <button
                key={image.src}
                ref={photoIndex === activePhoto ? activeThumbnail : undefined}
                className="viewer-thumbnail"
                aria-label={`View photo ${photoIndex + 1}: ${image.label}`}
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
          <span className="eyebrow">{artwork.category}</span>
          <h2 id="artwork-title">{artwork.title}</h2>
          {artwork.description && <div className="viewer-description">
            {artwork.description.split(/\n\s*\n/).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
          </div>}
          {artwork.tags.length > 0 && <ul className="viewer-tags" aria-label="Artwork subjects">
            {artwork.tags.map(tag => <li key={tag}>{tag}</li>)}
          </ul>}
          {artwork.sources && artwork.sources.length > 0 && <div className="viewer-sources">
            {artwork.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">View on {source.label} <span aria-hidden="true">↗</span></a>)}
          </div>}
          {hasMultiplePhotos && <p className="viewer-hint">Explore the painting through {photoCount} photographs. Choose a view below the image or use the arrow keys.</p>}
          {total > 1 && <nav className="viewer-artwork-navigation" aria-label="Browse artworks">
            <p>Artwork {index + 1} of {total}</p>
            <div>
              <button onClick={() => onMove(-1)}><span aria-hidden="true">←</span> Previous artwork</button>
              <button onClick={() => onMove(1)}>Next artwork <span aria-hidden="true">→</span></button>
            </div>
          </nav>}
        </div>
      </div>
    </dialog>
  )
}
