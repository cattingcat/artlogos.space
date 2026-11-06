import assert from 'node:assert/strict'
import test from 'node:test'
import { createAnalyticsController, initializeAnalytics, setCurrentArtwork, trackContactClick } from '../src/analytics/analytics.ts'

function browser({ hostname = 'artlogos.space', pathname = '/en/', blockedScript = false, brokenTag = false } = {}) {
  const scripts = []
  const window = {
    location: { hostname, pathname, href: `https://${hostname}${pathname}?utm_source=studio` },
  }
  if (brokenTag) window.gtag = () => { throw Error('Tag blocked') }
  Object.defineProperty(window, 'localStorage', { get() { throw Error('Storage disabled') } })
  const document = {
    title: 'Artlogos — Portfolio',
    referrer: 'https://example.org/',
    createElement(tag) { assert.equal(tag, 'script'); return {} },
    head: { appendChild(script) { if (blockedScript) throw Error('Script blocked'); scripts.push(script) } },
  }
  const controller = createAnalyticsController({ window, document })
  return {
    window, document, controller, scripts,
    commands: () => (window.dataLayer ?? []).map(command => Array.from(command)),
    events: name => (window.dataLayer ?? []).map(command => Array.from(command)).filter(command => command[0] === 'event' && command[1] === name),
  }
}

test('automatic startup queues one explicit document view and disables advertising features', () => {
  const page = browser()
  page.controller.initializeAnalytics('en')
  assert.equal(page.scripts.length, 1)
  assert.equal(page.scripts[0].async, true)
  assert.equal(page.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-MK7GF137Y6')
  const commands = page.commands()
  assert.equal(commands[0][0], 'js')
  assert.ok(commands[0][1] instanceof Date)
  assert.deepEqual(commands[1], ['config', 'G-MK7GF137Y6', {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  }])
  assert.deepEqual(page.events('page_view'), [['event', 'page_view', {
    page_location: 'https://artlogos.space/en/?utm_source=studio',
    page_title: 'Artlogos — Portfolio',
    page_referrer: 'https://example.org/',
    site_language: 'en',
  }]])
  assert.equal(commands.some(command => command[0] === 'consent'), false)
})

test('repeated initialization and gallery query updates do not create scripts or pageviews', () => {
  const page = browser()
  page.controller.initializeAnalytics('en')
  page.window.location.href = 'https://artlogos.space/en/?category=paintings&utm_source=studio'
  page.controller.initializeAnalytics('en')
  page.controller.initializeAnalytics('fr')
  assert.equal(page.scripts.length, 1)
  assert.equal(page.events('page_view').length, 1)
  page.controller.trackContactClick('email', 'footer')
  assert.equal(page.events('contact_click')[0][2].site_language, 'fr')
})

test('local, preview and neutral redirect documents never start collection', () => {
  for (const options of [
    { hostname: 'localhost' }, { hostname: '127.0.0.1' },
    { hostname: 'preview.artlogos.space' }, { hostname: 'artlogos.space.evil.test' },
    { pathname: '/' }, { pathname: '/index.html' },
  ]) {
    const page = browser(options)
    page.controller.initializeAnalytics('en')
    page.controller.setCurrentArtwork({ artwork_id: 'azure', category: 'paintings', view_mode: 'modal' })
    page.controller.trackContactClick('email', 'footer')
    assert.equal(page.scripts.length, 0, JSON.stringify(options))
    assert.deepEqual(page.commands(), [], JSON.stringify(options))
  }
  const www = browser({ hostname: 'www.artlogos.space', pathname: '/ru/' })
  www.controller.initializeAnalytics('ru')
  assert.equal(www.events('page_view').length, 1)
})

test('artwork effects deduplicate repeats while next artwork and reopening record fresh views', () => {
  const page = browser()
  page.controller.initializeAnalytics('en')
  const first = { artwork_id: 'azure', category: 'paintings', view_mode: 'modal' }
  page.controller.setCurrentArtwork(first)
  page.controller.setCurrentArtwork({ ...first })
  page.controller.setCurrentArtwork({ artwork_id: 'pomegranate', category: 'still-life', view_mode: 'modal' })
  page.controller.setCurrentArtwork(null)
  page.controller.setCurrentArtwork(first)
  page.controller.setCurrentArtwork({ ...first, view_mode: 'page' })
  assert.deepEqual(page.events('view_artwork').map(command => command[2]), [
    { ...first, site_language: 'en' },
    { artwork_id: 'pomegranate', category: 'still-life', view_mode: 'modal', site_language: 'en' },
    { ...first, site_language: 'en' },
    { ...first, view_mode: 'page', site_language: 'en' },
  ])
  assert.equal(page.events('page_view').length, 1)
})

test('initial artwork context survives initialization order without duplicate views', () => {
  const page = browser({ pathname: '/ja/works/azure/' })
  const artwork = { artwork_id: 'azure', category: 'paintings', view_mode: 'page' }
  page.controller.setCurrentArtwork(artwork)
  page.controller.trackContactClick('email', 'artwork')
  assert.deepEqual(page.commands(), [])
  page.controller.initializeAnalytics('ja')
  page.controller.setCurrentArtwork({ ...artwork })
  assert.deepEqual(page.events('view_artwork'), [['event', 'view_artwork', { ...artwork, site_language: 'ja' }]])
})

test('contact events use current artwork context and locale and clear them on close', () => {
  const page = browser()
  page.controller.initializeAnalytics('en')
  page.controller.trackContactClick('email', 'header')
  page.controller.setCurrentArtwork({ artwork_id: 'azure', category: 'paintings', view_mode: 'modal' })
  page.controller.trackContactClick('telegram', 'artwork')
  page.controller.setCurrentArtwork(null)
  page.controller.trackContactClick('email', 'footer')
  assert.deepEqual(page.events('contact_click').map(command => command[2]), [
    { method: 'email', placement: 'header', site_language: 'en' },
    { method: 'telegram', placement: 'artwork', site_language: 'en', artwork_id: 'azure', category: 'paintings', view_mode: 'modal' },
    { method: 'email', placement: 'footer', site_language: 'en' },
  ])
})

test('blocked script insertion, storage and tag execution never interrupt portfolio calls', () => {
  for (const options of [{ blockedScript: true }, { brokenTag: true }]) {
    const page = browser(options)
    assert.doesNotThrow(() => {
      page.controller.initializeAnalytics('en')
      page.controller.initializeAnalytics('en')
      page.controller.setCurrentArtwork({ artwork_id: 'azure', category: 'paintings', view_mode: 'modal' })
      page.controller.trackContactClick('email', 'footer')
      page.controller.setCurrentArtwork(null)
    })
    if (options.blockedScript) {
      assert.equal(page.events('page_view').length, 1)
      assert.equal(page.events('contact_click').length, 1)
    }
  }
})

test('public entry points are safe during server rendering', () => {
  assert.doesNotThrow(() => {
    initializeAnalytics('en')
    setCurrentArtwork({ artwork_id: 'azure', category: 'paintings', view_mode: 'page' })
    trackContactClick('email', 'footer')
    setCurrentArtwork(null)
  })
})

test('browser entry points share one lazy controller and only send known artwork fields', () => {
  const page = browser()
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: page.window })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: page.document })
  try {
    setCurrentArtwork({ artwork_id: 'azure', category: 'paintings', view_mode: 'page', email: 'private@example.org' })
    initializeAnalytics('en')
    initializeAnalytics('en')
    trackContactClick('email', 'artwork')
    assert.equal(page.scripts.length, 1)
    assert.equal(page.events('page_view').length, 1)
    assert.deepEqual(page.events('view_artwork'), [['event', 'view_artwork', {
      artwork_id: 'azure', category: 'paintings', view_mode: 'page', site_language: 'en',
    }]])
    assert.deepEqual(page.events('contact_click'), [['event', 'contact_click', {
      method: 'email', placement: 'artwork', site_language: 'en', artwork_id: 'azure', category: 'paintings', view_mode: 'page',
    }]])
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else delete globalThis.window
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
    else delete globalThis.document
  }
})
