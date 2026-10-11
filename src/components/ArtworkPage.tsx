import type { Artwork } from '../content/artworks'
import { useI18n } from '../i18n/context'
import { homePath } from '../i18n/locale'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeSwitcher from './ThemeSwitcher'
import ArtistSchema from './ArtistSchema'
import SocialLinks from './SocialLinks'
import ContactMethods from './ContactMethods'
import BrandLink from './BrandLink'
import './ArtworkPage.css'

export default function ArtworkPage({ artwork }: { artwork: Artwork }) {
  const { locale, site, t, category, tag } = useI18n()
  const home = homePath(locale)
  return <>
    <ArtistSchema artwork={artwork} />
    <a className="skip-link" href="#painting">{t('skipPainting')}</a>
    <header className="site-header painting-header">
      <BrandLink />
      <nav className="main-navigation" aria-label={t('mainNavigation')}><a href={home}>{t('allWorks')}</a><a href={`${home}#about`}>{t('about')}</a><a href="#contact">{t('contact')}</a></nav>
      <div className="header-controls"><LanguageSwitcher artworkId={artwork.id} /><ThemeSwitcher /></div>
    </header>
    <main id="painting" className="painting-page page-width">
      <div className="breadcrumbs"><a href={home}>{t('works')}</a><span aria-hidden="true">/</span><span>{artwork.title}</span></div>
      <div className="painting-layout">
        <div className="painting-photographs" aria-label={t('photosOf', { title: artwork.title })}>
          {artwork.images.map((image, index) => <figure key={image.src} id={`photo-${index + 1}`}>
            <a className="painting-full-image" href={image.src} aria-label={t('openFullImage', { label: image.label })}><img src={image.src} alt={image.alt} width={image.width} height={image.height} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" /></a>
            <figcaption><span>{image.label}</span><a href={image.src}>{t('viewFullImage')} ↗</a></figcaption>
          </figure>)}
        </div>
        <div className="painting-information">
          <span className="eyebrow">{category(artwork.category)}</span>
          <h1>{artwork.title}</h1>
          <p className="painting-artist">{t('by')} <a href={`${home}#about`}>{site.artistName}</a><span>{site.fullName}</span></p>
          {artwork.description && <div className="painting-description">{artwork.description.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
          {artwork.tags.length > 0 && <ul className="painting-tags" aria-label={t('artworkSubjects')}>{artwork.tags.map(value => <li key={value}>{tag(value)}</li>)}</ul>}
          {artwork.images.length > 1 && <nav className="painting-photo-index" aria-label={t('photographs')}><h2>{t('viewsPainting')}</h2>{artwork.images.map((image, index) => <a key={image.src} href={`#photo-${index + 1}`}>{index + 1}. {image.label}</a>)}</nav>}
          {artwork.sources && artwork.sources.length > 0 && <div className="painting-sources">{artwork.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{t('viewOn', { source: source.label })} ↗</a>)}</div>}
          <a href={home} className="underlined-link">← {t('exploreAll')}</a>
        </div>
      </div>
    </main>
    <section id="contact" className="contact-section page-width" aria-labelledby="contact-heading"><div><span className="eyebrow">{site.contact.eyebrow}</span><h2 id="contact-heading">{site.contact.title}</h2></div><div className="contact-copy"><p>{site.contact.description}</p><ContactMethods /><SocialLinks links={site.socialLinks} /></div></section>
    <footer className="site-footer page-width"><div><span>{site.name}</span><span>© {site.copyrightYear}</span></div><p>{site.footerNote}</p><a href="#painting">{t('backToTop')} ↑</a></footer>
  </>
}
