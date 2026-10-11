import { useCallback, useEffect, useMemo, useState } from 'react'
import { artworks as collection, categories, type Artwork, type Category } from './content/artworks'
import { LocaleProvider, useI18n } from './i18n/context'
import { homePath, type Locale } from './i18n/locale'
import LanguageSwitcher from './components/LanguageSwitcher'
import ArtworkDialog from './components/ArtworkDialog'
import ArtistSchema from './components/ArtistSchema'
import SocialLinks from './components/SocialLinks'
import ContactMethods from './components/ContactMethods'
import ArtworkPage from './components/ArtworkPage'
import BrandLink from './components/BrandLink'
import { artworkPath } from './content/artwork-pages'

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

function readLocation() {
  const params = new URLSearchParams(window.location.search)
  const slug = params.get('category') || window.location.pathname.split('/category/')[1]?.replace(/\/$/, '')
  const category = categories.find(category => slugs[category] === slug) ?? 'All works'
  const availableTags = new Set(collection.filter(work => inCategory(work, category)).flatMap(work => work.tags))
  return {
    category,
    work: params.get('work'),
    tags: [...new Set(params.getAll('tag'))].filter(tag => availableTags.has(tag)),
    sort: params.get('sort') === 'title' ? 'title' as const : 'curated' as const,
  }
}

function galleryQuery(category: Category, work: string | null, tags: string[], sort: Sort) {
  const params = new URLSearchParams()
  if (category !== 'All works') params.set('category', slugs[category])
  if (work) params.set('work', work)
  for (const tag of tags) params.append('tag', tag)
  if (sort !== 'curated') params.set('sort', sort)
  return params.size ? `?${params}` : ''
}

function Chevron({ down = false }: { down?: boolean }) {
  return <svg className={down ? 'chevron down' : 'chevron'} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="m5 2 5 5-5 5" stroke="currentColor" strokeWidth="1" /></svg>
}

export default function App({ artworkId, locale = 'en' }: { artworkId?: string; locale?: Locale }) {
  return <LocaleProvider locale={locale}><LocalizedApp artworkId={artworkId} /></LocaleProvider>
}

function LocalizedApp({ artworkId }: { artworkId?: string }) {
  const { artworks } = useI18n()
  const artwork = artworks.find(work => work.id === artworkId)
  return artwork ? <ArtworkPage artwork={artwork} /> : <Gallery />
}

function Gallery() {
  const { locale, site, artworks, t, count, category: categoryLabel, tag: tagLabel } = useI18n()
  // The first client render matches the build-time HTML. Restore URL state after hydration.
  const [location, setLocation] = useState<{ category: Category; work: string | null }>({ category: 'All works', work: null })
  const [sort, setSort] = useState<Sort>('curated')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [locationRestored, setLocationRestored] = useState(false)

  useEffect(() => {
    const restore = () => {
      const next = readLocation()
      setLocation({ category: next.category, work: next.work })
      setSelectedTags(next.tags)
      setSort(next.sort)
      setLocationRestored(true)
    }
    restore()
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])

  const query = galleryQuery(location.category, location.work, selectedTags, sort)
  useEffect(() => {
    if (!locationRestored) return
    const url = new URL(window.location.href)
    url.search = query
    window.history.replaceState(window.history.state, '', url)
  }, [query, locationRestored])

  const navigate = useCallback((category: Category, work: string | null = null, replace = false) => {
    const url = new URL(window.location.href)
    url.pathname = homePath(locale)
    const nextTags = category === location.category ? selectedTags : []
    url.search = galleryQuery(category, work, nextTags, sort)
    url.hash = ''
    const historyState = work ? (replace ? window.history.state : { artworkOverlay: true }) : {}
    window.history[replace ? 'replaceState' : 'pushState'](historyState, '', url)
    setLocation({ category, work })
    setSelectedTags(nextTags)
  }, [locale, location.category, selectedTags, sort])

  useEffect(() => {
    document.title = location.category === 'All works'
      ? site.pageTitle
      : `${categoryLabel(location.category)} — ${site.artistName} (${site.fullName})`
  }, [location.category, locale])

  const categoryWorks = useMemo(() => artworks.filter(work => inCategory(work, location.category)), [location.category, artworks])
  const tags = useMemo(() => Array.from(new Set(categoryWorks.flatMap(work => work.tags))).sort((a, b) => tagLabel(a).localeCompare(tagLabel(b), locale)), [categoryWorks, locale])
  const filtered = useMemo(() => {
    const result = categoryWorks.filter(work => selectedTags.every(tag => work.tags.includes(tag)))
    if (sort === 'title') result.sort((a, b) => a.title.localeCompare(b.title, locale))
    return result
  }, [categoryWorks, selectedTags, sort, locale])

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
      <a className="skip-link" href="#work">{t('skipArtworks')}</a>
      <header className="site-header">
        <BrandLink href="#work" onClick={() => { setMenuOpen(false); chooseCategory('All works') }} />

        <nav id="main-navigation" className={menuOpen ? 'main-navigation is-open' : 'main-navigation'} aria-label={t('mainNavigation')}>
          <a href="#work" className="current" onClick={() => setMenuOpen(false)}>{t('works')}</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>{t('about')}</a>
          <a href="#studio" onClick={() => setMenuOpen(false)}>{t('studio')}</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>{t('contact')}</a>
        </nav>
        <div className="header-controls"><LanguageSwitcher query={query} /><button className="menu-button" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? t('close') : t('menu')}<span>{menuOpen ? '−' : '+'}</span></button></div>
      </header>

      <main>
        <section id="work" className="work-section page-width" aria-labelledby="collection-heading">
          <div className="breadcrumbs"><a href="?category=all" onClick={event => { event.preventDefault(); chooseCategory('All works') }}>{t('works')}</a><Chevron /><span>{categoryLabel(location.category)}</span></div>
          <div className="collection-heading"><h1 id="collection-heading" className={location.category === 'All works' ? 'collection-introduction' : undefined}>{location.category === 'All works' ? site.collectionHeading : categoryLabel(location.category)}</h1></div>
          <div className="gallery-layout">
            <aside className={`sidebar ${filtersOpen ? 'is-open' : ''}`} id="collection-filters" aria-label={t('browseFilter')}>
              <div className="category-navigation">
                <h2>{t('browseBy')}</h2>
                <nav aria-label={t('artworkCategories')}>
                  {categories.map(category => <a key={category} href={`?category=${slugs[category]}`} className={location.category === category ? 'selected' : ''} aria-current={location.category === category ? 'page' : undefined} onClick={event => { event.preventDefault(); chooseCategory(category) }}>
                    <span>{categoryLabel(category)}</span><span className="category-count">{artworks.filter(work => inCategory(work, category)).length}</span>
                  </a>)}
                </nav>
              </div>
              <div className="filter-heading"><h2>{t('filterBy')}</h2>{selectedTags.length > 0 && <button className="text-button" onClick={resetFilters}>{t('clear')}</button>}</div>
              <details className="filter-group" open>
                <summary>{t('subject')}<span className="disclosure-mark" /></summary>
                <div className="filter-options">
                  {tags.map(tag => <label key={tag}><input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} /><span>{tagLabel(tag)}</span></label>)}
                </div>
                <p className="filter-hint">{t('filterHint')}</p>
              </details>
              <p className="sidebar-note">{site.sidebarNote}</p>
            </aside>

            <div className="gallery-content">
              <div className="gallery-toolbar">
                <p aria-live="polite">{count('workCount', filtered.length)}{selectedTags.length > 0 ? ` · ${t('filtered')}` : ''}</p>
                <button className="mobile-filter-button" aria-expanded={filtersOpen} aria-controls="collection-filters" onClick={() => setFiltersOpen(!filtersOpen)}>{t('browseAndFilter')} {selectedTags.length > 0 ? `(${selectedTags.length})` : ''}<span>{filtersOpen ? '−' : '+'}</span></button>
                <label className="sort-control"><span>{t('sortBy')}</span><select value={sort} onChange={event => setSort(event.target.value as Sort)} aria-label={t('sortArtworks')}><option value="curated">{t('curatedOrder')}</option><option value="title">{t('titleOrder')}</option></select><Chevron down /></label>
              </div>
              {selectedTags.length > 0 && <div className="selected-filters" aria-label={t('selectedSubjects')}>
                {selectedTags.map(tag => <button className="filter-chip" key={tag} onClick={() => toggleTag(tag)} aria-label={t('removeFilter', { tag: tagLabel(tag) })}>{tagLabel(tag)}<span aria-hidden="true">×</span></button>)}
                <button className="text-button" onClick={resetFilters}>{t('clearAll')}</button>
              </div>}
              {filtered.length ? <div className="artwork-grid">{filtered.map((work, index) => {
                const preview = work.images[0]
                return <article className="artwork-card" key={work.id}>
                  <a href={artworkPath(work, locale)} className="artwork-link" onClick={event => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                    event.preventDefault()
                    navigate(location.category, work.id)
                  }} aria-label={`${t('viewArtwork', { title: work.title })}${work.images.length > 1 ? `, ${count('photoCount', work.images.length)}` : ''}`}>
                    <div className="artwork-image-wrap">
                      <img src={preview.thumbnail} alt={preview.alt} width={preview.width} height={preview.height} className="artwork-image" loading={index < 4 ? 'eager' : 'lazy'} decoding="async" />
                      {work.images.length > 1 && <span className="photo-count">{count('photoCount', work.images.length)}</span>}
                      <span className="view-artwork">{t('viewArtworkButton')} <span>+</span></span>
                    </div>
                    <div className="artwork-caption"><h3>{work.title}</h3><p>{categoryLabel(work.category)}</p>{work.tags.length > 0 && <p className="artwork-tags">{work.tags.map(tagLabel).join(' · ')}</p>}</div>
                  </a>
                </article>
              })}</div> : <div className="empty-state"><h2>{t('noWorks')}</h2><p>{t('removeSubjects')}</p><button className="outline-button" onClick={resetFilters}>{t('clearFilters')}</button></div>}
              <div className="collection-end"><span>{t('endCollection')}</span><a href="#work">{t('backToTop')} ↑</a></div>
            </div>
          </div>
        </section>

        <section id="about" className="about-section page-width" aria-labelledby="about-heading">
          <div className="about-image"><img src={site.about.image} alt={site.about.imageAlt} width="640" height="640" loading="lazy" /><span>{site.about.caption}</span></div>
          <div className="editorial-copy"><span className="eyebrow">{site.about.eyebrow}</span><h2 id="about-heading">{site.about.title}</h2>{site.about.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<a className="underlined-link" href="#contact">{t('getInTouch')}</a></div>
        </section>

        <section id="studio" className="studio-section" aria-labelledby="studio-heading"><div className="studio-inner page-width">
          <div className="studio-image"><img src={site.studio.image} alt={site.studio.imageAlt} width="2200" height="1627" loading="lazy" /></div>
          <div className="editorial-copy studio-copy"><span className="eyebrow">{site.studio.eyebrow}</span><h2 id="studio-heading">{site.studio.title}</h2>{site.studio.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<a className="underlined-link" href="#work">{t('exploreCollection')}</a></div>
        </div></section>

        <section id="contact" className="contact-section page-width" aria-labelledby="contact-heading">
          <div><span className="eyebrow">{site.contact.eyebrow}</span><h2 id="contact-heading">{site.contact.title}</h2></div>
          <div className="contact-copy"><p>{site.contact.description}</p><ContactMethods /><SocialLinks links={site.socialLinks} /></div>
        </section>
      </main>

      <footer className="site-footer page-width"><div><span>{site.name}</span><span>© {site.copyrightYear}</span></div><p>{site.footerNote}</p><a href="#work">{t('backToTop')} ↑</a></footer>
      {selectedArtwork && <ArtworkDialog artwork={selectedArtwork} index={Math.max(0, selectedIndex)} total={viewerWorks.length} onClose={closeArtwork} onMove={moveArtwork} />}
    </>
  )
}
