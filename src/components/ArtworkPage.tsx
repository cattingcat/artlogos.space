import type { Artwork } from '../content/artworks'
import { site } from '../content/site'
import ArtistSchema from './ArtistSchema'
import SocialLinks from './SocialLinks'
import BrandLink from './BrandLink'
import './ArtworkPage.css'

export default function ArtworkPage({ artwork }: { artwork: Artwork }) {
  return <>
    <ArtistSchema artwork={artwork} />
    <a className="skip-link" href="#painting">Skip to painting</a>
    <header className="site-header painting-header">
      <BrandLink />
      <nav className="main-navigation" aria-label="Main navigation"><a href="/">All works</a><a href="/#about">About</a><a href="#contact">Contact</a></nav>
      <span className="header-note">{site.headerNote}</span>
    </header>
    <main id="painting" className="painting-page page-width">
      <div className="breadcrumbs"><a href="/">Works</a><span aria-hidden="true">/</span><span>{artwork.title}</span></div>
      <div className="painting-layout">
        <div className="painting-photographs" aria-label={`Photos of ${artwork.title}`}>
          {artwork.images.map((image, index) => <figure key={image.src} id={`photo-${index + 1}`}>
            <a className="painting-full-image" href={image.src} aria-label={`Open full image: ${image.label}`}><img src={image.src} alt={image.alt} width={image.width} height={image.height} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" /></a>
            <figcaption><span>{image.label}</span><a href={image.src}>View full image ↗</a></figcaption>
          </figure>)}
        </div>
        <div className="painting-information">
          <span className="eyebrow">{artwork.category}</span>
          <h1>{artwork.title}</h1>
          <p className="painting-artist">By <a href="/#about">{site.artistName}</a><span>{site.fullName}</span></p>
          {artwork.description && <div className="painting-description">{artwork.description.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
          {artwork.tags.length > 0 && <ul className="painting-tags" aria-label="Artwork subjects">{artwork.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>}
          {artwork.images.length > 1 && <nav className="painting-photo-index" aria-label="Photographs"><h2>Views of the painting</h2>{artwork.images.map((image, index) => <a key={image.src} href={`#photo-${index + 1}`}>{index + 1}. {image.label}</a>)}</nav>}
          {artwork.sources && artwork.sources.length > 0 && <div className="painting-sources">{artwork.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">View on {source.label} ↗</a>)}</div>}
          <a href="/" className="underlined-link">← Explore all paintings</a>
        </div>
      </div>
    </main>
    <section id="contact" className="contact-section page-width" aria-labelledby="contact-heading"><div><span className="eyebrow">{site.contact.eyebrow}</span><h2 id="contact-heading">{site.contact.title}</h2></div><div className="contact-copy"><p>{site.contact.description}</p>{site.email && <a className="contact-email" href={`mailto:${site.email}`}>{site.email}</a>}<SocialLinks links={site.socialLinks} /></div></section>
    <footer className="site-footer page-width"><div><span>{site.name}</span><span>© {site.copyrightYear}</span></div><p>{site.footerNote}</p><a href="#painting">Back to top ↑</a></footer>
  </>
}
