import { useCallback, useEffect, useMemo, useState } from 'react'
import { artworks, type Artwork } from './content/artworks'
import { additionalArtworks } from './content/additionalArtworks'
import { site } from './content/site'
import ArtworkDialog from './components/ArtworkDialog'

const allArtworks = [...artworks, ...additionalArtworks]
const priceCeiling = Math.ceil(Math.max(100, ...allArtworks.map(work => work.price ?? 0)) / 10) * 10
const categories = ['All works', 'Figures', 'Landscapes', 'Still life', 'Oil pastels'] as const
type Category = (typeof categories)[number]
type Sort = 'curated' | 'price-asc' | 'price-desc' | 'title'
const slugs: Record<Category, string> = { 'All works': 'all', Figures: 'figures', Landscapes: 'landscapes', 'Still life': 'still-life', 'Oil pastels': 'oil-pastels' }
const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 })
const inCategory = (work: Artwork, category: Category) => category === 'All works' || (category === 'Oil pastels' ? work.medium === 'Oil pastel' : work.category === category)

function readLocation() {
  const params = new URLSearchParams(window.location.search)
  const slug = params.get('category') || window.location.pathname.split('/category/')[1]
  return { category: categories.find(category => slugs[category] === slug) ?? 'Figures' as Category, work: params.get('work') }
}

function Chevron({ down = false }: { down?: boolean }) {
  return <svg className={down ? 'chevron down' : 'chevron'} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="m5 2 5 5-5 5" stroke="currentColor" strokeWidth="1" /></svg>
}

export default function App() {
  const [location, setLocation] = useState(readLocation)
  const [sort, setSort] = useState<Sort>('curated')
  const [medium, setMedium] = useState<string[]>([])
  const [availableOnly, setAvailableOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [maxPrice, setMaxPrice] = useState<number | null>(null)

  const navigate = useCallback((category: Category, work: string | null = null, replace = false) => {
    const url = new URL(window.location.href)
    url.pathname = '/'
    url.search = new URLSearchParams({ category: slugs[category], ...(work ? { work } : {}) }).toString()
    url.hash = ''
    const historyState = work ? (replace ? window.history.state : { artworkOverlay: true }) : {}
    window.history[replace ? 'replaceState' : 'pushState'](historyState, '', url)
    setLocation({ category, work })
  }, [])

  useEffect(() => {
    const onPopState = () => {
      const next = readLocation()
      if (next.category !== location.category) { setMedium([]); setAvailableOnly(false); setMaxPrice(null) }
      setLocation(next)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [location.category])

  useEffect(() => { document.title = `${location.category} — ${site.name}` }, [location.category])

  const categoryWorks = allArtworks.filter(work => inCategory(work, location.category))
  const mediums = Array.from(new Set(categoryWorks.map(work => work.medium)))
  const filtered = useMemo(() => {
    const result = allArtworks.filter(work => inCategory(work, location.category)
      && (!medium.length || medium.includes(work.medium))
      && (!availableOnly || work.status === 'available')
      && (maxPrice === null || (work.price !== null && work.price <= maxPrice)))
    if (sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'price-asc') result.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    if (sort === 'price-desc') result.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity))
    return result
  }, [location.category, medium, availableOnly, maxPrice, sort])

  const selectedArtwork = allArtworks.find(work => work.id === location.work)
  const viewerWorks = selectedArtwork && !filtered.some(work => work.id === selectedArtwork.id) ? allArtworks : filtered
  const selectedIndex = viewerWorks.findIndex(work => work.id === selectedArtwork?.id)
  const activeFilters = medium.length + Number(availableOnly) + Number(maxPrice !== null)
  const resetFilters = () => { setMedium([]); setAvailableOnly(false); setMaxPrice(null) }
  const chooseCategory = (category: Category) => { navigate(category); resetFilters(); setFiltersOpen(false) }
  const closeArtwork = useCallback(() => {
    if (window.history.state?.artworkOverlay) window.history.back()
    else navigate(location.category, null, true)
  }, [location.category, navigate])
  const moveArtwork = (direction: number) => {
    const next = viewerWorks[(selectedIndex + direction + viewerWorks.length) % viewerWorks.length]
    if (next) navigate(location.category, next.id, true)
  }

  return (
    <>
      <a className="skip-link" href="#work">Skip to artworks</a>
      <header className="site-header">
        <a href="#work" className="wordmark" aria-label={`${site.name} home`} onClick={() => { setMenuOpen(false); chooseCategory('Figures') }}>
          <span>{site.name}</span><span className="wordmark-caption">{site.subtitle}</span>
        </a>
        <button className="menu-button" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close' : 'Menu'}<span>{menuOpen ? '−' : '+'}</span></button>
        <nav id="main-navigation" className={menuOpen ? 'main-navigation is-open' : 'main-navigation'} aria-label="Main navigation">
          <a href="#work" className="current" onClick={() => setMenuOpen(false)}>Works</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#publications" onClick={() => setMenuOpen(false)}>Publications</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <span className="header-note">An independent practice</span>
      </header>

      <main>
        <section id="work" className="work-section page-width" aria-labelledby="collection-heading">
          <div className="breadcrumbs"><a href="?category=all" onClick={event => { event.preventDefault(); chooseCategory('All works') }}>Works</a><Chevron /><span>{location.category}</span></div>
          <div className="collection-heading"><h1 id="collection-heading">{location.category}</h1><p>An ongoing collection of moments, observed.</p></div>
          <div className="gallery-layout">
            <aside className={`sidebar ${filtersOpen ? 'is-open' : ''}`} id="collection-filters" aria-label="Browse and filter artworks">
              <div className="category-navigation"><h2>Browse by</h2><nav aria-label="Artwork categories">{categories.map(category => <a key={category} href={`?category=${slugs[category]}`} className={location.category === category ? 'selected' : ''} aria-current={location.category === category ? 'page' : undefined} onClick={event => { event.preventDefault(); chooseCategory(category) }}><span>{category}</span><span className="category-count">{allArtworks.filter(work => inCategory(work, category)).length}</span></a>)}</nav></div>
              <div className="filter-heading"><h2>Filter by</h2>{activeFilters > 0 && <button className="text-button" onClick={resetFilters}>Clear</button>}</div>
              <details className="filter-group" open><summary>Medium<span className="disclosure-mark" /></summary><div className="filter-options">{mediums.map(option => <label key={option}><input type="checkbox" checked={medium.includes(option)} onChange={() => setMedium(current => current.includes(option) ? current.filter(value => value !== option) : [...current, option])} /><span>{option}</span></label>)}</div></details>
              <details className="filter-group"><summary>Availability<span className="disclosure-mark" /></summary><div className="filter-options"><label><input type="checkbox" checked={availableOnly} onChange={event => setAvailableOnly(event.target.checked)} /><span>Available works only</span></label></div></details>
              {categoryWorks.some(work => work.price !== null) && <details className="filter-group"><summary>Price<span className="disclosure-mark" /></summary><div className="price-filter"><label htmlFor="max-price">{maxPrice === null ? 'Any price' : `Up to ${money.format(maxPrice)}`}</label><input id="max-price" type="range" min="0" max={priceCeiling} step="10" value={maxPrice ?? priceCeiling} onChange={event => setMaxPrice(Number(event.target.value))} /><div><span>£0</span><span>{money.format(priceCeiling)}</span></div></div></details>}
              <p className="sidebar-note">Original paintings.<br />Individual perspectives.</p>
            </aside>

            <div className="gallery-content">
              <div className="gallery-toolbar">
                <p aria-live="polite">{filtered.length} {filtered.length === 1 ? 'work' : 'works'}{activeFilters > 0 ? ' · filtered' : ''}</p>
                <button className="mobile-filter-button" aria-expanded={filtersOpen} aria-controls="collection-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Browse & filter {activeFilters > 0 ? `(${activeFilters})` : ''}<span>{filtersOpen ? '−' : '+'}</span></button>
                <label className="sort-control"><span>Sort by:</span><select value={sort} onChange={event => setSort(event.target.value as Sort)} aria-label="Sort artworks"><option value="curated">Curated order</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="title">Title: A–Z</option></select><Chevron down /></label>
              </div>
              {filtered.length ? <div className="artwork-grid">{filtered.map((work, index) => <article className="artwork-card" key={work.id}>
                <a href={`?category=${slugs[location.category]}&work=${work.id}`} className="artwork-link" onClick={event => { event.preventDefault(); navigate(location.category, work.id) }} aria-label={`View ${work.title}`}>
                  <div className="artwork-image-wrap">
                    <img src={work.image} alt={work.title} className="artwork-image" loading={index < 4 ? 'eager' : 'lazy'} decoding="async" />
                    {work.alternateImage && <img className="artwork-alternate" src={work.alternateImage} alt="" loading="lazy" aria-hidden="true" />}
                    {work.status === 'sold' && <span className="sold-label">Sold</span>}
                    <span className="view-artwork">View artwork <span>+</span></span>
                  </div>
                  <div className="artwork-caption"><h3>{work.title}</h3><p>{work.status === 'sold' ? 'Private collection' : work.price !== null ? money.format(work.price) : work.medium}</p></div>
                </a>
              </article>)}</div> : <div className="empty-state"><h2>No works in this selection.</h2><p>Try a different medium or clear the filters to see the collection.</p><button className="outline-button" onClick={resetFilters}>Clear filters</button></div>}
              <div className="collection-end"><span>End of collection</span><a href="#work">Back to top ↑</a></div>
            </div>
          </div>
        </section>

        <section id="about" className="about-section page-width" aria-labelledby="about-heading">
          <div className="about-image"><img src="/reference/cosmos-daisies.jpg" alt="A painting of daisies in a patterned jug by Patricia Lynch" loading="lazy" /><span>Colour. Texture. A way of seeing.</span></div>
          <div className="editorial-copy"><span className="eyebrow">{site.about.eyebrow}</span><h2 id="about-heading">{site.about.title}</h2>{site.about.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<a className="underlined-link" href="#contact">Get in touch</a></div>
        </section>

        <section id="publications" className="publications-section" aria-labelledby="publication-heading"><div className="publication-inner page-width">
          <div className="publication-image"><img src={site.publication.image} alt={`${site.publication.title} — book cover`} loading="lazy" /></div>
          <div className="editorial-copy publication-copy"><span className="eyebrow">Publications</span><h2 id="publication-heading">{site.publication.title}</h2><p className="publication-author">By {site.publication.author}</p><p>{site.publication.description}</p><dl className="publication-facts"><div><dt>Format</dt><dd>{site.publication.format}</dd></div><div><dt>Edition</dt><dd>{site.publication.edition}</dd></div></dl><a className="outline-button" href={site.publication.href} target="_blank" rel="noreferrer">Discover the book</a></div>
        </div></section>

        <section id="contact" className="contact-section page-width" aria-labelledby="contact-heading"><div><span className="eyebrow">A conversation starts here</span><h2 id="contact-heading">Get in touch.</h2></div><div className="contact-copy"><p>For enquiries about the work, commissions<br className="desktop-break" /> or a visit to the studio.</p>{site.email ? <a className="contact-email" href={`mailto:${site.email}`}>{site.email}</a> : <p className="muted">Contact details coming soon.</p>}{site.instagram && <a className="underlined-link" href={site.instagram} target="_blank" rel="noreferrer">Instagram</a>}</div></section>
      </main>

      <footer className="site-footer page-width"><div><span>{site.name}</span><span>© {new Date().getFullYear()}</span></div><p>Preview collection. Artworks © <a href="https://www.sashamihajlovic.com/category/figures" target="_blank" rel="noreferrer">Sasha Mihajlovic</a> & <a href="https://patricialynchart.co.uk/" target="_blank" rel="noreferrer">Patricia Lynch</a>.</p><a href="#work">Back to top ↑</a></footer>
      {selectedArtwork && <ArtworkDialog artwork={selectedArtwork} index={Math.max(0, selectedIndex)} total={viewerWorks.length} onClose={closeArtwork} onMove={moveArtwork} />}
    </>
  )
}
