import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Artwork } from '../content/artworks'
import { useI18n } from '../i18n/context'
import { useModalDialog } from './useModalDialog'
import './ImageLightbox.css'

type Props = {
  images: Artwork['images']
  initialIndex?: number
  title: string
  onClose: () => void
}

export default function ImageLightbox({ images, initialIndex = 0, title, onClose }: Props) {
  const { t } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const backdropPress = useRef(false)
  const [index, setIndex] = useState(() => Math.max(0, Math.min(Math.trunc(initialIndex) || 0, images.length - 1)))
  const activeIndex = Math.min(index, Math.max(0, images.length - 1))
  const image = images[activeIndex]
  const multiple = images.length > 1
  useModalDialog(dialog)

  function move(direction: number) {
    if (multiple) setIndex(current => (current + direction + images.length) % images.length)
  }

  function isBackdrop(target: EventTarget | null) {
    return target instanceof Element && !target.closest('button, img, .image-lightbox-toolbar')
  }

  if (typeof document === 'undefined') return null
  return createPortal(<dialog
    ref={dialog}
    className="image-lightbox"
    aria-label={t('enlargedView', { title })}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }}
    onPointerDown={event => {
      event.stopPropagation()
      backdropPress.current = event.isPrimary && event.button === 0 && isBackdrop(event.target)
    }}
    onPointerUp={event => {
      event.stopPropagation()
      // Hit-test the release point too: touch pointers may retain implicit capture.
      backdropPress.current = backdropPress.current && isBackdrop(document.elementFromPoint(event.clientX, event.clientY))
    }}
    onPointerCancel={() => { backdropPress.current = false }}
    onClick={event => {
      event.stopPropagation()
      const closeBackdrop = backdropPress.current && isBackdrop(event.target)
      backdropPress.current = false
      if (closeBackdrop) onClose()
    }}
    onKeyDown={event => {
      // React portal events still bubble through the parent artwork dialog.
      event.stopPropagation()
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (multiple && !event.altKey && !event.ctrlKey && !event.metaKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault()
        move(event.key === 'ArrowRight' ? 1 : -1)
      }
    }}
  >
    <button type="button" className="image-lightbox-close" onClick={onClose} aria-label={t('closeEnlargedImage')} autoFocus>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
    </button>
    <div className="image-lightbox-stage">
      {image
        ? <img key={image.src} src={image.src} alt={image.alt} width={image.width} height={image.height} decoding="async" draggable={false} />
        : <p>{t('photosSoon')}</p>}
    </div>
    {image && <div className={`image-lightbox-toolbar${multiple ? '' : ' is-single'}`}>
      {multiple && <button type="button" onClick={() => move(-1)} aria-label={t('previousPhoto')}>←</button>}
      <div className="image-lightbox-caption" role="status" aria-live="polite" aria-atomic="true">
        <span>{image.label}</span>
        {multiple && <span>{t('photoPosition', { current: activeIndex + 1, total: images.length })}</span>}
      </div>
      {multiple && <button type="button" onClick={() => move(1)} aria-label={t('nextPhoto')}>→</button>}
    </div>}
  </dialog>, document.body)
}
