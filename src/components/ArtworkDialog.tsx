import { useEffect, useRef, useState } from 'react'
import type { Artwork } from '../content/artworks'

const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 })

type Props = { artwork: Artwork; index: number; total: number; onClose: () => void; onMove: (direction: number) => void }

export default function ArtworkDialog({ artwork, index, total, onClose, onMove }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    const element = dialog.current!
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  return (
    <dialog ref={dialog} className="artwork-dialog" aria-labelledby="artwork-title"
      onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); setShowDetail(false); onMove(1) }
        if (event.key === 'ArrowLeft') { event.preventDefault(); setShowDetail(false); onMove(-1) }
      }}>
      <div className="artwork-dialog-inner">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close artwork">×</button>
        <div className="dialog-image-panel">
          <img src={showDetail && artwork.alternateImage ? artwork.alternateImage : artwork.image} alt={`${artwork.title}${showDetail ? ' — detail' : ''}`} />
          {artwork.alternateImage && <button className="image-toggle" onClick={() => setShowDetail(!showDetail)}>{showDetail ? 'View artwork' : 'Another view'}</button>}
        </div>
        <div className="dialog-information">
          <span className="eyebrow">{artwork.category} / {artwork.medium}</span>
          <h2 id="artwork-title">{artwork.title}</h2>
          <p className="dialog-artist">By {artwork.artist}</p>
          <div className="artwork-facts">
            <div><span>Medium</span><span>{artwork.medium}</span></div>
            <div><span>Collection</span><span>{artwork.category}</span></div>
            <div><span>Availability</span><span>{artwork.status === 'sold' ? 'Sold' : artwork.status === 'enquire' ? 'Enquire with artist' : 'Available'}</span></div>
          </div>
          {artwork.price !== null && <p className="dialog-price">{currency.format(artwork.price)}</p>}
          <a className="outline-button" href={artwork.sourceUrl} target="_blank" rel="noreferrer">View on artist’s website</a>
          <p className="reference-note">Reference artwork · © {artwork.artist}</p>
          <div className="dialog-pagination">
            <button className="icon-button" onClick={() => { setShowDetail(false); onMove(-1) }} aria-label="Previous artwork">←</button>
            <span>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
            <button className="icon-button" onClick={() => { setShowDetail(false); onMove(1) }} aria-label="Next artwork">→</button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
