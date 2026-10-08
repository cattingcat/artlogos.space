import { useCallback, useEffect, useMemo, useState } from 'react'
import { artworks, categories, type Artwork, type Category } from './content/artworks'
import { site } from './content/site'
import ArtworkDialog from './components/ArtworkDialog'
import ArtistSchema from './components/ArtistSchema'
import SocialLinks from './components/SocialLinks'

type Sort = 'curated' | 'title'
const slugs: Record<Category, string> = {
  'All works': 'all',
  Landscapes: 'landscapes',
  Cityscapes: 'cityscapes',
  Figures: 'figures',
  Portraits: 'portraits',
  Interiors: 'interiors',
}
const inCategory = (work: Artwork, category: Category) => category === 'All works' || work.category === category

function readLocation(): { category: Category; work: string | null } {
  const params = new URLSearchParams(window.location.search)
  const slug = params.get('category') || window.location.pathname.split('/category/')[1]?.replace(/\/$/, '')
  return {
    category: categories.find(category => slugs[category] === slug) ?? 'All works',
    work: params.get('work'),
  }
}

function Chevron({ down = false }: { down?: boolean }) {
  return <svg className={down ? 'chevron down' : 'chevron'} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="m5 2 5 5-5 5" stroke="currentColor" strokeWidth="1" /></svg>
}

export default function App() {
  // The first client render matches the build-time HTML. Restore URL state after hydration.
  const [location, setLocation] = useState<{ category: Category; work: string | null }>({ category: 'All works', work: null })
  const [sort, setSort] = useState<Sort>('curated')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setLocation(readLocation()) }, [])

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
      if (next.category !== location.category) setSelectedTags([])
      setLocation(next)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [location.category])

  useEffect(() => {
    document.title = location.category === 'All works'
      ? site.pageTitle
      : `${location.category} — ${site.artistName} (${site.fullName})`
  }, [location.category])

  const categoryWorks = useMemo(() => artworks.filter(work => inCategory(work, location.category)), [location.category])
  const tags = useMemo(() => Array.from(new Set(categoryWorks.flatMap(work => work.tags))).sort((a, b) => a.localeCompare(b)), [categoryWorks])
  const filtered = useMemo(() => {
    const result = categoryWorks.filter(work => selectedTags.every(tag => work.tags.includes(tag)))
    if (sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title))
    return result
  }, [categoryWorks, selectedTags, sort])

  const selectedArtwork = artworks.find(work => work.id === location.work)
  const viewerWorks = selectedArtwork && !filtered.some(work => work.id === selectedArtwork.id) ? artworks : filtered
  const selectedIndex = viewerWorks.findIndex(work => work.id === selectedArtwork?.id)
  const resetFilters = () => setSelectedTags([])
  const toggleTag = (tag: string) => setSelectedTags(current => current.includes(tag) ? current.filter(value => value !== tag) : [...current, tag])
  const chooseCategory = (category: Category) => {
    navigate(category)
    if (category !== location.category) resetFilters()
    setFiltersOpen(false)
  }
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
      <ArtistSchema />
      <a className="skip-link" href="#work">Skip to artworks</a>
      <header className="site-header">
        <a href="#work" className="wordmark" aria-label={`${site.name} home`} onClick={() => { setMenuOpen(false); chooseCategory('All works') }}>
          <span>{site.name}</span><span className="wordmark-caption">{site.subtitle}</span>
        </a>
        <button className="menu-button" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close' : 'Menu'}<span>{menuOpen ? '−' : '+'}</span></button>
        <nav id="main-navigation" className={menuOpen ? 'main-navigation is-open' : 'main-navigation'} aria-label="Main navigation">
          <a href="#work" className="current" onClick={() => setMenuOpen(false)}>Works</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#studio" onClick={() => setMenuOpen(false)}>Studio</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <span className="header-note">{site.headerNote}</span>
      </header>

      <main>
        <section id="work" className="work-section page-width" aria-labelledby="collection-heading">
          <div className="breadcrumbs"><a href="?category=all" onClick={event => { event.preventDefault(); chooseCategory('All works') }}>Works</a><Chevron /><span>{location.category}</span></div>
          <div className="collection-heading"><h1 id="collection-heading">{location.category === 'All works' ? site.artistName : location.category}</h1><p>{site.collectionDescription}</p></div>
          <div className="gallery-layout">
            <aside className={`sidebar ${filtersOpen ? 'is-open' : ''}`} id="collection-filters" aria-label="Browse and filter artworks">
              <div className="category-navigation">
                <h2>Browse by</h2>
                <nav aria-label="Artwork categories">
                  {categories.map(category => <a key={category} href={`?category=${slugs[category]}`} className={location.category === category ? 'selected' : ''} aria-current={location.category === category ? 'page' : undefined} onClick={event => { event.preventDefault(); chooseCategory(category) }}>
                    <span>{category}</span><span className="category-count">{artworks.filter(work => inCategory(work, category)).length}</span>
                  </a>)}
                </nav>
              </div>
              <div className="filter-heading"><h2>Filter by</h2>{selectedTags.length > 0 && <button className="text-button" onClick={resetFilters}>Clear</button>}</div>
              <details className="filter-group" open>
                <summary>Subject<span className="disclosure-mark" /></summary>
                <div className="filter-options">
                  {tags.map(tag => <label key={tag}><input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} /><span>{tag}</span></label>)}
                </div>
                <p className="filter-hint">Matches all selected subjects.</p>
              </details>
              <p className="sidebar-note">{site.sidebarNote}</p>
            </aside>

            <div className="gallery-content">
              <div className="gallery-toolbar">
                <p aria-live="polite">{filtered.length} {filtered.length === 1 ? 'work' : 'works'}{selectedTags.length > 0 ? ' · filtered' : ''}</p>
                <button className="mobile-filter-button" aria-expanded={filtersOpen} aria-controls="collection-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Browse & filter {selectedTags.length > 0 ? `(${selectedTags.length})` : ''}<span>{filtersOpen ? '−' : '+'}</span></button>
                <label className="sort-control"><span>Sort by:</span><select value={sort} onChange={event => setSort(event.target.value as Sort)} aria-label="Sort artworks"><option value="curated">Curated order</option><option value="title">Title: A–Z</option></select><Chevron down /></label>
              </div>
              {selectedTags.length > 0 && <div className="selected-filters" aria-label="Selected subjects">
                {selectedTags.map(tag => <button className="filter-chip" key={tag} onClick={() => toggleTag(tag)} aria-label={`Remove ${tag} filter`}>{tag}<span aria-hidden="true">×</span></button>)}
                <button className="text-button" onClick={resetFilters}>Clear all</button>
              </div>}
              {filtered.length ? <div className="artwork-grid">{filtered.map((work, index) => {
                const preview = work.images[0]
                return <article className="artwork-card" key={work.id}>
                  <a href={`?category=${slugs[location.category]}&work=${work.id}`} className="artwork-link" onClick={event => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                    event.preventDefault()
                    navigate(location.category, work.id)
                  }} aria-label={`View ${work.title}${work.images.length > 1 ? `, ${work.images.length} photos` : ''}`}>
                    <div className="artwork-image-wrap">
                      <img src={preview.thumbnail} alt={preview.alt} width={preview.width} height={preview.height} className="artwork-image" loading={index < 4 ? 'eager' : 'lazy'} decoding="async" />
                      {work.images.length > 1 && <span className="photo-count">{work.images.length} photos</span>}
                      <span className="view-artwork">View artwork <span>+</span></span>
                    </div>
                    <div className="artwork-caption"><h3>{work.title}</h3><p>{work.category}</p>{work.tags.length > 0 && <p className="artwork-tags">{work.tags.join(' · ')}</p>}</div>
                  </a>
                </article>
              })}</div> : <div className="empty-state"><h2>No works in this selection.</h2><p>Remove a subject or clear the filters to see the collection.</p><button className="outline-button" onClick={resetFilters}>Clear filters</button></div>}
              <div className="collection-end"><span>End of collection</span><a href="#work">Back to top ↑</a></div>
            </div>
          </div>
        </section>

        <section id="about" className="about-section page-width" aria-labelledby="about-heading">
          <div className="about-image"><img src={site.about.image} alt={site.about.imageAlt} width="640" height="640" loading="lazy" /><span>{site.about.caption}</span></div>
          <div className="editorial-copy"><span className="eyebrow">{site.about.eyebrow}</span><h2 id="about-heading">{site.about.title}</h2>{site.about.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<a className="underlined-link" href="#contact">Get in touch</a></div>
        </section>

        <section id="studio" className="studio-section" aria-labelledby="studio-heading"><div className="studio-inner page-width">
          <div className="studio-image"><img src={site.studio.image} alt={site.studio.imageAlt} width="2200" height="1627" loading="lazy" /></div>
          <div className="editorial-copy studio-copy"><span className="eyebrow">{site.studio.eyebrow}</span><h2 id="studio-heading">{site.studio.title}</h2>{site.studio.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<a className="underlined-link" href="#work">Explore the collection</a></div>
        </div></section>

        <section id="contact" className="contact-section page-width" aria-labelledby="contact-heading">
          <div><span className="eyebrow">{site.contact.eyebrow}</span><h2 id="contact-heading">{site.contact.title}</h2></div>
          <div className="contact-copy"><p>{site.contact.description}</p>{site.email && <a className="contact-email" href={`mailto:${site.email}`}>{site.email}</a>}<SocialLinks links={site.socialLinks} /></div>
        </section>
      </main>

      <footer className="site-footer page-width"><div><span>{site.name}</span><span>© {site.copyrightYear}</span></div><p>{site.footerNote}</p><a href="#work">Back to top ↑</a></footer>
      {selectedArtwork && <ArtworkDialog artwork={selectedArtwork} index={Math.max(0, selectedIndex)} total={viewerWorks.length} onClose={closeArtwork} onMove={moveArtwork} />}
    </>
  )
}
