import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
const origin = 'https://artlogos.space/'
const locales = ['en', 'ru', 'fr', 'de', 'it', 'es', 'ja']
const ogLocales = { en: 'en_US', ru: 'ru_RU', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', es: 'es_ES', ja: 'ja_JP' }
const fullName = locale => locale === 'ru' ? 'Алина Плющева' : 'Alina Pliushcheva'
const namesFor = locale => ['Alina Logos', fullName(locale)]
const russianNames = ['Алина Плющева', 'Алины Плющевой']
const assertNameLocalization = (text, locale, label) => {
  if (locale !== 'ru') for (const name of russianNames) assert.ok(!text.includes(name), `Russian artist name leaked into another language: ${label}`)
}
const template = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const themeBootstrap = template.match(/<script id="theme-init">([\s\S]*?)<\/script>/)?.[1].trim()
assert.ok(themeBootstrap, 'Source HTML must contain the prepaint theme bootstrap')
const portfolio = JSON.parse(await readFile(new URL('../src/content/portfolio.json', import.meta.url), 'utf8'))
const dictionaries = Object.fromEntries(await Promise.all(locales.map(async locale => [locale, JSON.parse(await readFile(new URL(`../src/i18n/locales/${locale}.json`, import.meta.url), 'utf8'))])))
const absolute = path => new URL(path, origin).href
const pagePath = (locale, work) => `/${locale}/${work ? `works/${work.id}/` : ''}`
const pageUrl = (locale, work) => absolute(pagePath(locale, work))
const compact = value => value.replace(/\s+/g, ' ').trim()
const artworkDescription = work => [work.size, work.material, work.description].filter(Boolean).join('\n\n') || undefined
const sizeParts = (value, label) => {
  const match = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(?: (cm|см))?$/.exec(value)
  assert.ok(match, `Artwork size must use canonical ASCII x: ${label}`)
  return [match[1], match[2], match[3]?.replace('см', 'cm')]
}
const decode = value => value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, code) => {
  if (code.startsWith('#')) return String.fromCodePoint(Number.parseInt(code.slice(code[1].toLowerCase() === 'x' ? 2 : 1), code[1].toLowerCase() === 'x' ? 16 : 10))
  return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }[code.toLowerCase()] ?? entity
})
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(([, name, double, single]) => [name.toLowerCase(), decode(double ?? single)]))
const tags = (name, source) => [...source.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(([tag]) => attributes(tag))
const textContent = source => compact(decode(source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ')))
const bodyOf = source => source.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? ''
const titleOf = source => decode(source.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')
const placeholders = value => [...value.matchAll(/\{[^{}]+\}/g)].map(([placeholder]) => placeholder).sort()
const interpolate = (value, replacements) => value.replace(/\{(\w+)\}/g, (_, name) => replacements[name] ?? `{${name}}`)
const fileCache = new Map()
const assetChecks = new Map()
const readBuilt = path => {
  if (!fileCache.has(path)) fileCache.set(path, readFile(new URL(`.${path}`, dist), 'utf8'))
  return fileCache.get(path)
}
const checkAsset = async path => {
  const pathname = new URL(path, origin).pathname
  if (!assetChecks.has(pathname)) assetChecks.set(pathname, (async () => {
    const file = await stat(new URL(`.${pathname}`, dist)).catch(() => null)
    assert.ok(file?.isFile() && file.size > 0, `Missing or empty built asset: ${pathname}`)
  })())
  await assetChecks.get(pathname)
}

function validateDictionary(reference, translated, path) {
  assert.equal(Array.isArray(translated), Array.isArray(reference), `Wrong array type: ${path}`)
  assert.equal(typeof translated, typeof reference, `Wrong translation type: ${path}`)
  if (Array.isArray(reference)) {
    assert.equal(translated.length, reference.length, `Wrong translation array length: ${path}`)
    reference.forEach((item, index) => validateDictionary(item, translated[index], `${path}[${index}]`))
  } else if (reference && typeof reference === 'object') {
    assert.ok(translated, `Missing translation object: ${path}`)
    assert.deepEqual(Object.keys(translated).sort(), Object.keys(reference).sort(), `Translation keys differ: ${path}`)
    for (const key of Object.keys(reference)) validateDictionary(reference[key], translated[key], `${path}.${key}`)
  } else {
    assert.equal(typeof translated, 'string', `Unexpected translation leaf: ${path}`)
    assert.ok(translated.trim(), `Empty translation: ${path}`)
    assert.deepEqual(placeholders(translated), placeholders(reference), `Changed translation placeholders: ${path}`)
  }
}

assert.ok(portfolio.length > 0, 'Portfolio must not be empty')
assert.equal(new Set(portfolio.map(work => work.id)).size, portfolio.length, 'Artwork IDs must be unique')
for (const locale of locales) {
  const dictionary = dictionaries[locale]
  const names = namesFor(locale)
  assert.equal(dictionary.site.fullName, fullName(locale), `Wrong localized artist full name: ${locale}`)
  validateDictionary(dictionaries.en, dictionary, locale)
  assert.deepEqual(Object.keys(dictionary.artworks).sort(), portfolio.map(work => work.id).sort(), `Dictionary omits or invents a painting: ${locale}`)
  for (const name of names) {
    for (const value of [dictionary.site.pageTitle, dictionary.site.description, dictionary.ui.paintingIntro]) {
      assert.ok(value.includes(name), `Metadata must preserve ${name}: ${locale}`)
      assertNameLocalization(value, locale, `dictionary ${locale}`)
    }
  }
  for (const work of portfolio) {
    const translated = dictionary.artworks[work.id]
    for (const field of ['size', 'material', 'description']) {
      assert.equal(Object.hasOwn(translated, field), Object.hasOwn(work, field), `Missing or invented artwork ${field}: ${locale}/${work.id}`)
      if (Object.hasOwn(work, field)) {
        assert.equal(typeof work[field], 'string', `Invalid artwork ${field}: ${work.id}`)
        assert.ok(work[field].trim(), `Empty artwork ${field}: ${work.id}`)
      }
    }
    if (work.size) assert.deepEqual(sizeParts(translated.size, `${locale}/${work.id}`), sizeParts(work.size, work.id), `Translated artwork size changes dimensions or units: ${locale}/${work.id}`)
    assert.equal(translated.images.length, work.images.length, `Wrong photo count: ${locale}/${work.id}`)
    assert.ok(dictionary.categories[work.category], `Missing category: ${locale}/${work.category}`)
    for (const tag of work.tags) assert.ok(dictionary.tags[tag], `Missing subject: ${locale}/${tag}`)
    for (const image of translated.images) {
      assert.ok(image.alt.includes(translated.title) && image.alt.length > translated.title.length, `Photo alt must identify and describe the translated painting: ${locale}/${work.id}`)
    }
  }
}

const expectedAlternates = work => [...locales.map(locale => [locale, pageUrl(locale, work)]), ['x-default', work ? pageUrl('en', work) : origin]]
function checkAlternates(links, work, label) {
  const alternates = links.filter(link => link.hreflang)
  assert.ok(alternates.every(link => link.rel === 'alternate'), `Invalid language link relation: ${label}`)
  assert.deepEqual(alternates.map(link => [link.hreflang, link.href]).sort(), expectedAlternates(work).sort(), `Missing, duplicate or incorrect reciprocal hreflang: ${label}`)
}
function structuredData(html) {
  return [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].flatMap(([, source]) => {
    const data = JSON.parse(source)
    return Array.isArray(data) ? data : data['@graph'] ?? [data]
  })
}
function schemaOf(schemas, type, label) {
  const matching = schemas.filter(entity => [entity['@type']].flat().includes(type))
  assert.equal(matching.length, 1, `Expected exactly one ${type} schema: ${label}`)
  return matching[0]
}
async function checkLocalLink(href, base, html) {
  assert.ok(href?.trim(), `Empty static link: ${base}`)
  const url = new URL(href, base)
  assert.ok(['https:', 'mailto:'].includes(url.protocol), `Non-public or invalid link: ${href} on ${base}`)
  if (url.origin !== new URL(origin).origin) return
  const path = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname
  await checkAsset(path)
  if (url.hash && path.endsWith('.html')) {
    const target = url.pathname === new URL(base).pathname ? html : await readBuilt(path)
    const id = decodeURIComponent(url.hash.slice(1))
    assert.ok(tags('[a-z][a-z0-9:-]*', target).some(tag => tag.id === id), `Broken fragment link: ${href} on ${base}`)
  }
}

function checkTheme(html, dictionary, label) {
  const scripts = [...html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/gi)]
  const initializers = scripts.filter(match => attributes(match[1]).id === 'theme-init')
  assert.equal(initializers.length, 1, `Missing or duplicate theme bootstrap: ${label}`)
  const initializer = initializers[0]
  const scriptAttributes = attributes(initializer[1])
  assert.equal(initializer[2].trim(), themeBootstrap, `Build changed the theme bootstrap: ${label}`)
  assert.ok(!scriptAttributes.src && (!scriptAttributes.type || scriptAttributes.type === 'text/javascript'), `Theme bootstrap must be an inline classic script: ${label}`)
  assert.doesNotMatch(initializer[1], /\s(?:async|defer)(?:\s|=|>)/i, `Theme bootstrap must block parsing: ${label}`)
  assert.ok(initializer.index > html.indexOf('<head>') && initializer.index < html.indexOf('</head>'), `Theme bootstrap must run in the head: ${label}`)
  const stylesheets = [...html.matchAll(/<link\b[^>]*>/gi)].filter(match => attributes(match[0]).rel === 'stylesheet')
  const modules = scripts.filter(match => attributes(match[1]).type === 'module')
  assert.ok(stylesheets.length && modules.length, `Page must load its stylesheet and application module: ${label}`)
  for (const resource of [...stylesheets, ...modules]) assert.ok(initializer.index < resource.index, `Theme bootstrap runs after a stylesheet or application module: ${label}`)
  const themeMetadata = tags('meta', html).filter(meta => meta.name === 'theme-color')
  assert.deepEqual(themeMetadata.map(meta => meta.content), ['#E9E3D8'], `Missing or incorrect initial theme-color metadata: ${label}`)
  assert.ok(html.indexOf('<meta name="theme-color"') < initializer.index, `Theme-color metadata must exist before initialization: ${label}`)
  const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i)?.[1] ?? ''
  const buttons = tags('button', header).filter(button => button.class?.split(/\s+/).includes('theme-switcher'))
  assert.equal(buttons.length, 1, `Missing or duplicate theme switch in the page header: ${label}`)
  assert.equal(buttons[0].type, 'button', `Theme switch must be a native button: ${label}`)
  assert.equal(buttons[0]['aria-label'], dictionary.ui.darkTheme, `Theme switch has an untranslated accessible label: ${label}`)
  assert.equal(buttons[0]['aria-pressed'], 'false', `Theme switch must have a stable server-rendered toggle state: ${label}`)
  assert.equal(buttons[0].title, dictionary.ui.switchToDark, `Theme switch has an untranslated action label: ${label}`)
}

const expectedPages = new Map()
for (const locale of locales) {
  const dictionary = dictionaries[locale]
  const names = namesFor(locale)
  for (const work of [undefined, ...portfolio]) {
    const label = `${locale}/${work?.id ?? 'home'}`
    const path = `${pagePath(locale, work)}index.html`
    const url = pageUrl(locale, work)
    const html = await readBuilt(path)
    checkTheme(html, dictionary, label)
    const body = bodyOf(html)
    const visibleText = textContent(body)
    const translated = work && dictionary.artworks[work.id]
    const title = work ? `${translated.title} — ${names[0]} (${names[1]})` : dictionary.site.pageTitle
    const introduction = work && interpolate(dictionary.ui.paintingIntro, { title: translated.title })
    const artworkText = work && artworkDescription(translated)
    const description = work ? `${introduction} ${artworkText ? compact(artworkText) : dictionary.ui.paintingFallback}` : dictionary.site.description
    const firstImage = work?.images[0] ?? portfolio[0].images[0]
    const firstImageText = translated?.images[0] ?? dictionary.artworks[portfolio[0].id].images[0]
    const links = tags('link', html)
    const anchors = tags('a', body)
    const images = tags('img', body)
    const metadata = tags('meta', html)
    const meta = name => {
      const entries = metadata.filter(tag => tag.name === name || tag.property === name)
      assert.equal(entries.length, 1, `Missing or duplicate metadata ${name}: ${label}`)
      return entries[0].content
    }
    expectedPages.set(url, { locale, work })
    assert.deepEqual(tags('html', html).map(tag => tag.lang), [locale], `Wrong document language: ${label}`)
    assert.match(html, /<div\b[^>]*id="root"[^>]*data-prerendered="true"[^>]*>\s*</, `React content is absent without JavaScript: ${label}`)
    assert.equal(titleOf(html), title, `Untranslated or incorrect title: ${label}`)
    assert.equal(meta('description'), description, `Untranslated or incorrect description: ${label}`)
    assert.equal(meta('author'), `${names[0]} (${names[1]})`, `Untranslated or incorrect author: ${label}`)
    for (const [field, value] of [['title', title], ['description', description], ['author', meta('author')], ['visible text', visibleText]]) assertNameLocalization(value, locale, `${label} ${field}`)
    for (const name of names) {
      assert.ok(title.includes(name) && description.includes(name), `Metadata omits artist identity ${name}: ${label}`)
      assert.ok(visibleText.includes(name), `Visible content omits artist identity ${name}: ${label}`)
    }
    assert.deepEqual(links.filter(link => link.rel === 'canonical').map(link => link.href), [url], `Expected exactly one self-canonical URL: ${label}`)
    checkAlternates(links, work, label)
    assert.equal(meta('og:url'), url, `Wrong Open Graph URL: ${label}`)
    for (const name of ['og:title', 'twitter:title']) assert.equal(meta(name), title, `Wrong social title ${name}: ${label}`)
    for (const name of ['og:description', 'twitter:description']) assert.equal(meta(name), description, `Wrong social description ${name}: ${label}`)
    for (const name of ['og:image', 'twitter:image']) assert.equal(meta(name), absolute(firstImage.src), `Wrong social image ${name}: ${label}`)
    for (const name of ['og:image:alt', 'twitter:image:alt']) assert.equal(meta(name), firstImageText.alt, `Untranslated social image alt ${name}: ${label}`)
    assert.equal(Number(meta('og:image:width')), firstImage.width, `Wrong social image width: ${label}`)
    assert.equal(Number(meta('og:image:height')), firstImage.height, `Wrong social image height: ${label}`)
    assert.equal(meta('og:locale'), ogLocales[locale], `Wrong social locale: ${label}`)
    assert.deepEqual(metadata.filter(tag => tag.property === 'og:locale:alternate').map(tag => tag.content).sort(), locales.filter(value => value !== locale).map(value => ogLocales[value]).sort(), `Missing social alternate locales: ${label}`)
    assert.doesNotMatch(meta('robots'), /(?:noindex|nofollow|noimageindex|none)/i, `Robots metadata blocks discovery: ${label}`)
    assert.ok(links.some(link => link.rel === 'alternate' && link.type === 'text/plain' && link.href === absolute(`/${locale}/llms-full.txt`) && link.title === dictionary.ui.completeCatalogue), `Localized text catalogue link is missing: ${label}`)
    assert.deepEqual([...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(([, heading]) => textContent(heading)), [work ? translated.title : dictionary.site.collectionHeading], `Wrong or duplicate main heading: ${label}`)
    for (const language of locales) assert.ok(anchors.some(anchor => anchor.hreflang === language && anchor.lang === language && anchor.href === pagePath(language, work)), `Language switch is not a crawlable link: ${label}/${language}`)
    for (const value of [dictionary.site.contactEyebrow, dictionary.site.contactTitle, dictionary.site.contactDescription, dictionary.site.footerNote]) assert.ok(visibleText.includes(compact(value)), `Missing translated contact/footer copy: ${label}`)

    const schemas = structuredData(html)
    const person = schemaOf(schemas, 'Person', label)
    assert.equal(person.name, 'Alina Logos', `Artist brand must remain unchanged: ${label}`)
    const identity = [person.name, ...[person.alternateName ?? []].flat()]
    for (const name of names) assert.ok(identity.includes(name), `Person identity omits ${name}: ${label}`)
    if (locale === 'ru') assert.ok(identity.includes('Alina Pliushcheva'), `Russian Person schema must retain the Latin artist alias: ${label}`)
    assertNameLocalization(JSON.stringify(schemas), locale, `${label} schema`)
    assert.equal(person['@id'], `${origin}#artist`, `Artist identity must be shared across locales: ${label}`)
    assert.equal(person.description, dictionary.site.aboutParagraphs[0], `Untranslated artist schema description: ${label}`)
    assert.equal(person.jobTitle, dictionary.ui.artistJob, `Untranslated artist schema job title: ${label}`)
    assert.ok(Array.isArray(person.sameAs) && person.sameAs.length > 0, `Missing artist profiles: ${label}`)
    for (const profile of person.sameAs) {
      assert.equal(new URL(profile).protocol, 'https:', `Artist profiles must be HTTPS: ${label}`)
      assert.ok(anchors.some(anchor => anchor.href === profile), `Artist profile is absent from visible links: ${label}/${profile}`)
    }
    assert.ok(person.email && anchors.some(anchor => anchor.href === `mailto:${person.email}`), `Missing real email link: ${label}`)
    const website = schemaOf(schemas, 'WebSite', label)
    assert.deepEqual([...website.inLanguage].sort(), [...locales].sort(), `Website schema omits a language: ${label}`)
    const page = schemaOf(schemas, work ? 'WebPage' : 'ProfilePage', label)
    assert.equal(page.url, url, `Schema URL must match canonical: ${label}`)
    assert.equal(page.inLanguage, locale, `Schema page language differs: ${label}`)
    assert.equal(page.name, title, `Untranslated schema page name: ${label}`)
    assert.equal(page.description, description, `Untranslated schema page description: ${label}`)

    if (work) {
      assert.ok(visibleText.includes(translated.title), `Painting title is not readable without JavaScript: ${label}`)
      if (translated.description) assert.ok(visibleText.includes(compact(translated.description)), `Painting description is not readable without JavaScript: ${label}`)
      const facts = [...body.matchAll(/<dl\b([^>]*)>([\s\S]*?)<\/dl>/gi)].filter(([, attrs]) => attributes(attrs).class?.split(/\s+/).includes('artwork-facts'))
      const expectedFacts = [['size', 'artworkSize'], ['material', 'artworkMaterial']].filter(([field]) => translated[field]).flatMap(([field, key]) => [['dt', dictionary.ui[key]], ['dd', compact(translated[field])]])
      assert.equal(facts.length, expectedFacts.length ? 1 : 0, `Missing or invented artwork facts: ${label}`)
      if (facts.length) {
        const entries = [...facts[0][2].matchAll(/<(dt|dd)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(([, tag, value]) => [tag.toLowerCase(), textContent(value)])
        assert.deepEqual(entries, expectedFacts, `Artwork facts are missing, untranslated or invented: ${label}`)
      }
      assert.ok(visibleText.includes(dictionary.categories[work.category]), `Missing translated category: ${label}`)
      for (const tag of work.tags) assert.ok(visibleText.includes(dictionary.tags[tag]), `Missing translated subject ${tag}: ${label}`)
      const painting = schemaOf(schemas, 'VisualArtwork', label)
      assert.equal(painting.name, translated.title, `Untranslated VisualArtwork name: ${label}`)
      assert.equal(painting.description, artworkText, `Untranslated or invented VisualArtwork description: ${label}`)
      assert.equal(Object.hasOwn(painting, 'description'), Boolean(artworkText), `Empty or invented VisualArtwork description: ${label}`)
      assert.equal(painting.artMedium, translated.material, `Untranslated or invented VisualArtwork material: ${label}`)
      assert.equal(Object.hasOwn(painting, 'artMedium'), Boolean(translated.material), `Empty or invented VisualArtwork material: ${label}`)
      assert.equal(painting.inLanguage, locale, `Wrong VisualArtwork language: ${label}`)
      assert.equal(painting.url, url, `Wrong VisualArtwork URL: ${label}`)
      assert.equal(painting.creator?.['@id'], `${origin}#artist`, `Wrong artwork creator: ${label}`)
      assert.equal(painting.artform, dictionary.ui.paintingArtform, `Untranslated art form: ${label}`)
      assert.deepEqual(painting.keywords, work.tags.map(tag => dictionary.tags[tag]), `Untranslated schema subjects: ${label}`)
      assert.equal(painting.image.length, work.images.length, `Schema omits photographs: ${label}`)
      for (const [index, image] of work.images.entries()) {
        const copy = translated.images[index]
        assert.ok(images.some(tag => tag.src === image.src && tag.alt === copy.alt && Number(tag.width) === image.width && Number(tag.height) === image.height), `Full photo or translated alt missing: ${label}/${image.src}`)
        assert.ok(anchors.some(tag => tag.href === image.src), `Full image needs a direct link: ${label}/${image.src}`)
        assert.ok(visibleText.includes(copy.label), `Untranslated image caption: ${label}/${index}`)
        assert.deepEqual(painting.image[index], { '@type': 'ImageObject', contentUrl: absolute(image.src), thumbnailUrl: absolute(image.thumbnail), caption: copy.alt, width: image.width, height: image.height }, `Wrong or untranslated image schema: ${label}/${index}`)
      }
      for (const source of work.sources ?? []) assert.ok(anchors.some(tag => tag.href === source.url), `Missing publication attribution: ${label}`)
    } else {
      const cards = [...body.matchAll(/<article\b[^>]*class="artwork-card"[^>]*>([\s\S]*?)<\/article>/g)].map(([, card]) => card)
      assert.equal(cards.length, portfolio.length, `Static gallery omits a painting: ${label}`)
      for (const painting of portfolio) {
        const copy = dictionary.artworks[painting.id]
        const card = cards.find(card => tags('a', card).some(anchor => anchor.href === pagePath(locale, painting)))
        assert.ok(card, `Missing real localized painting link: ${label}/${painting.id}`)
        const cardText = textContent(card)
        for (const value of [copy.title, dictionary.categories[painting.category], ...painting.tags.map(tag => dictionary.tags[tag])]) assert.ok(cardText.includes(value), `Missing translated card content: ${label}/${painting.id}/${value}`)
        assert.ok(tags('img', card).some(image => image.src === painting.images[0].thumbnail && image.alt === copy.images[0].alt), `Missing thumbnail or translated alt: ${label}/${painting.id}`)
      }
      for (const value of [dictionary.site.sidebarNote, dictionary.site.aboutEyebrow, dictionary.site.aboutTitle, dictionary.site.aboutCaption, ...dictionary.site.aboutParagraphs, dictionary.site.studioEyebrow, dictionary.site.studioTitle, ...dictionary.site.studioParagraphs]) assert.ok(visibleText.includes(compact(value)), `Missing translated editorial content: ${label}`)
      for (const alt of [dictionary.site.aboutImageAlt, dictionary.site.studioImageAlt]) assert.ok(images.some(image => image.alt === alt), `Missing translated editorial image alt: ${label}`)
    }
    for (const image of images) {
      assert.ok('alt' in image, `Missing image alt attribute: ${label}/${image.src}`)
      assert.ok(image.alt.trim() || image.class?.split(' ').includes('wordmark-logo'), `Content image has empty alt: ${label}/${image.src}`)
      await checkAsset(image.src)
    }
    for (const tag of [...tags('script', html), ...links]) {
      const asset = tag.src ?? (['stylesheet', 'icon', 'modulepreload'].includes(tag.rel) ? tag.href : undefined)
      if (asset) await checkAsset(asset)
    }
    for (const anchor of anchors) await checkLocalLink(anchor.href, url, html)
    await checkAsset(firstImage.src)
  }
}

// Previously shared links remain readable, with canonical and hreflang pointing to the localized pages.
for (const work of [undefined, ...portfolio]) {
  const path = work ? `/works/${work.id}/index.html` : '/index.html'
  const html = await readBuilt(path)
  checkTheme(html, dictionaries.en, path)
  assert.equal(html, await readBuilt(`${pagePath('en', work)}index.html`), `Legacy URL differs from its English canonical: ${path}`)
}
const htmlFiles = (await readdir(dist, { recursive: true })).filter(path => path.endsWith('.html'))
assert.equal(htmlFiles.length, (locales.length + 1) * (portfolio.length + 1), 'Unexpected or missing static HTML pages')
for (const work of portfolio) for (const image of work.images) for (const path of [image.src, image.thumbnail]) await checkAsset(path)

const robots = await readBuilt('/robots.txt')
assert.match(robots, /Sitemap:\s*https:\/\/artlogos\.space\/sitemap\.xml/i, 'robots.txt must point to the sitemap')
assert.doesNotMatch(robots, /^\s*Disallow:\s*\/\s*$/m, 'robots.txt must allow indexing')
const sitemap = await readBuilt('/sitemap.xml')
assert.match(sitemap, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/, 'Sitemap needs the image namespace')
assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/, 'Sitemap needs the hreflang namespace')
const sitemapPages = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, page]) => page)
const sitemapUrls = sitemapPages.map(page => decode(page.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? ''))
assert.deepEqual([...sitemapUrls].sort(), [...expectedPages.keys()].sort(), 'Sitemap must contain exactly all canonical localized URLs, without legacy aliases')
for (const [index, page] of sitemapPages.entries()) {
  const { work } = expectedPages.get(sitemapUrls[index])
  checkAlternates(tags('xhtml:link', page), work, `sitemap ${sitemapUrls[index]}`)
  const images = [...page.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(([, value]) => decode(value))
  assert.deepEqual(images.sort(), (work?.images ?? []).map(image => absolute(image.src)).sort(), `Image sitemap omits or invents a photograph: ${sitemapUrls[index]}`)
}
for (const locale of locales) {
  const dictionary = dictionaries[locale]
  const names = namesFor(locale)
  const index = await readBuilt(`/${locale}/llms.txt`)
  const catalogue = await readBuilt(`/${locale}/llms-full.txt`)
  for (const name of names) assert.ok(index.includes(name) && catalogue.includes(name), `Text catalogue omits artist identity: ${locale}/${name}`)
  for (const text of [index, catalogue]) {
    assertNameLocalization(text, locale, `${locale} text catalogue`)
    assert.ok(text.includes(dictionary.site.aboutParagraphs[0]), `Untranslated catalogue introduction: ${locale}`)
    assert.ok(text.includes(pageUrl(locale)), `Catalogue omits localized homepage: ${locale}`)
    for (const language of locales) assert.ok(text.includes(absolute(`/${language}/llms-full.txt`)), `Catalogue omits language ${language}: ${locale}`)
  }
  assert.ok(index.includes(absolute(`/${locale}/llms-full.txt`)), `Text index omits full catalogue: ${locale}`)
  for (const work of portfolio) {
    const copy = dictionary.artworks[work.id]
    assert.ok(index.includes(copy.title) && index.includes(pageUrl(locale, work)), `Text index omits translated painting: ${locale}/${work.id}`)
    assert.ok(catalogue.includes(`## ${copy.title}\n`) && catalogue.includes(pageUrl(locale, work)), `Catalogue omits translated painting: ${locale}/${work.id}`)
    assert.ok(catalogue.includes(`${dictionary.ui.category}: ${dictionary.categories[work.category]}`), `Catalogue category is not translated: ${locale}/${work.id}`)
    assert.ok(catalogue.includes(`${dictionary.ui.subjects}: ${work.tags.map(tag => dictionary.tags[tag]).join(', ')}`), `Catalogue subjects are not translated: ${locale}/${work.id}`)
    const section = catalogue.split(`## ${copy.title}\n`)[1]?.split('\n## ')[0] ?? ''
    for (const [field, key] of [['size', 'artworkSize'], ['material', 'artworkMaterial']]) {
      const prefix = `${dictionary.ui[key]}: `
      if (copy[field]) assert.ok(section.includes(`${prefix}${copy[field]}`), `Catalogue omits translated ${field}: ${locale}/${work.id}`)
      else assert.ok(!section.split('\n').some(line => line.startsWith(prefix)), `Catalogue invents ${field}: ${locale}/${work.id}`)
    }
    if (copy.description) assert.ok(catalogue.includes(copy.description), `Catalogue omits translated description: ${locale}/${work.id}`)
    for (const [imageIndex, image] of work.images.entries()) {
      const translated = copy.images[imageIndex]
      assert.ok(catalogue.includes(`${translated.label}: ${absolute(image.src)}`) && catalogue.includes(translated.alt), `Catalogue omits image or translated caption: ${locale}/${work.id}/${imageIndex}`)
    }
  }
}
for (const name of ['llms.txt', 'llms-full.txt']) assert.equal(await readBuilt(`/${name}`), await readBuilt(`/en/${name}`), `Root ${name} must preserve the English catalogue alias`)

console.log(`SEO checks passed: ${locales.length} complete dictionaries, ${expectedPages.size} localized pages and ${portfolio.length + 1} legacy pages; prepaint theme bootstrap and accessible theme switches; translated static content, metadata and schemas; reciprocal hreflang, self-canonical URLs, real links/assets, multilingual sitemap and catalogues`)
