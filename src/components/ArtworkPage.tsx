import { useState, type MouseEvent } from 'react'
import type { Artwork } from '../content/artworks'
import { useI18n } from '../i18n/context'
import { homePath } from '../i18n/locale'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeSwitcher from './ThemeSwitcher'
import ArtistSchema from './ArtistSchema'
import SocialLinks from './SocialLinks'
import HeaderSocialLinks from './HeaderSocialLinks'
import SocialIconLinks from './SocialIconLinks'
import ContactMethods from './ContactMethods'
import BrandLink from './BrandLink'
import ImageLightbox from './ImageLightbox'
import ImageZoomHint from './ImageZoomHint'
import ArtworkFacts from './ArtworkFacts'
import './ArtworkPage.css'

export default function ArtworkPage({ artwork }: { artwork: Artwork }) {
  const { locale, site, t, category, tag } = useI18n()
  const home = homePath(locale)
  const [zoomedPhoto, setZoomedPhoto] = useState<number | null>(null)
  const enlargePhoto = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    setZoomedPhoto(index)
  }
  return <>
    <ArtistSchema artwork={artwork} />
    <a className="skip-link" href="#painting">{t('skipPainting')}</a>
    <header className="site-header painting-header">
      <BrandLink />
      <nav className="main-navigation" aria-label={t('mainNavigation')}><a href={home}>{t('allWorks')}</a><a href={`${home}#about`}>{t('about')}</a><a href="#contact">{t('contact')}</a></nav>
      <HeaderSocialLinks />
      <div className="header-controls"><LanguageSwitcher artworkId={artwork.id} /><ThemeSwitcher /></div>
    </header>
    <main id="painting" className="painting-page page-width">
      <div className="breadcrumbs"><a href={home}>{t('works')}</a><span aria-hidden="true">/</span><span>{artwork.title}</span></div>
      <div className="painting-layout">
        <div className="painting-photographs" aria-label={t('photosOf', { title: artwork.title })}>
          {artwork.images.map((image, index) => <figure key={image.src} id={`photo-${index + 1}`}>
            <a className="painting-full-image image-zoom-trigger" href={image.src} aria-label={t('openFullImage', { label: image.label })} aria-haspopup="dialog" onClick={event => enlargePhoto(event, index)}><img src={image.src} alt={image.alt} width={image.width} height={image.height} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" /><ImageZoomHint /></a>
            <figcaption><span>{image.label}</span><a href={image.src} aria-haspopup="dialog" onClick={event => enlargePhoto(event, index)}>{t('viewFullImage')} ↗</a></figcaption>
          </figure>)}
        </div>
        <div className="painting-information">
          <span className="eyebrow">{category(artwork.category)}</span>
          <h1>{artwork.title}</h1>
          <p className="painting-artist">{t('by')} <a href={`${home}#about`}>{site.artistName}</a><span>{site.fullName}</span></p>
          <ArtworkFacts artwork={artwork} />
          {artwork.description && <div className="painting-description">{artwork.description.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
          {artwork.tags.length > 0 && <ul className="painting-tags" aria-label={t('artworkSubjects')}>{artwork.tags.map(value => <li key={value}>{tag(value)}</li>)}</ul>}
          {artwork.images.length > 1 && <nav className="painting-photo-index" aria-label={t('photographs')}><h2>{t('viewsPainting')}</h2>{artwork.images.map((image, index) => <a key={image.src} href={`#photo-${index + 1}`}>{index + 1}. {image.label}</a>)}</nav>}
          <SocialIconLinks className="artwork-social-links" sources={artwork.sources} />
          <a href={home} className="underlined-link">← {t('exploreAll')}</a>
        </div>
      </div>
    </main>
    <section id="contact" className="contact-section page-width" aria-labelledby="contact-heading"><div><span className="eyebrow">{site.contact.eyebrow}</span><h2 id="contact-heading">{site.contact.title}</h2></div><div className="contact-copy"><p>{site.contact.description}</p><ContactMethods /><SocialLinks links={site.socialLinks} /></div></section>
    <footer className="site-footer page-width"><div><span>{site.name}</span><span>© {site.copyrightYear}</span></div><p>{site.footerNote}</p><a href="#painting">{t('backToTop')} ↑</a></footer>
    {zoomedPhoto !== null && <ImageLightbox images={artwork.images} initialIndex={zoomedPhoto} title={artwork.title} onClose={() => setZoomedPhoto(null)} />}
  </>
}
