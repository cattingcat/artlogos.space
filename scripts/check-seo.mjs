import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
const html = await readFile(new URL('index.html', dist), 'utf8')
const portfolio = JSON.parse(await readFile(new URL('../src/content/portfolio.json', import.meta.url), 'utf8'))
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>')
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(([, name, double, single]) => [name, decode(double ?? single)]))
const tags = (name, source = html) => [...source.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(([tag]) => attributes(tag))
const textContent = source => decode(source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
const metadata = tags('meta')
const meta = name => metadata.find(tag => tag.name === name || tag.property === name)?.content
const names = ['Alina Logos', 'Alina Pliushcheva']

assert.match(html, /<div\b[^>]*id="root"[^>]*data-prerendered="true"[^>]*>\s*</, 'Built HTML must contain the rendered React app')
const title = decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')
for (const name of names) {
  assert.ok(title.includes(name), `Page title must identify ${name}`)
  assert.ok(meta('description')?.includes(name), `Description must identify ${name}`)
}
const canonicals = tags('link').filter(tag => tag.rel === 'canonical')
assert.deepEqual(canonicals.map(tag => tag.href), ['https://artlogos.space/'], 'Exactly one canonical homepage URL is required')
assert.equal(meta('og:url'), 'https://artlogos.space/')
assert.ok(meta('og:title') && meta('og:description'), 'Social previews need a title and description')

const structured = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].flatMap(([, source]) => {
  const data = JSON.parse(source)
  return Array.isArray(data) ? data : data['@graph'] ?? [data]
})
const person = structured.find(entity => [entity['@type']].flat().includes('Person'))
assert.ok(person, 'Structured data must describe the artist as a Person')
const identity = [person.name, ...[person.alternateName ?? []].flat()]
for (const name of names) assert.ok(identity.includes(name), `Person identity must include ${name}`)
assert.ok(Array.isArray(person.sameAs) && person.sameAs.length > 0, 'Person must link to public artist profiles')
for (const profile of person.sameAs) assert.equal(new URL(profile).protocol, 'https:', 'Artist profile URLs must be absolute HTTPS URLs')

const body = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? ''
const visibleText = decode(body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' '))
for (const name of names) assert.ok(visibleText.includes(name), `${name} must appear in the page content before JavaScript runs`)
const cards = [...body.matchAll(/<article\b[^>]*class="artwork-card"[^>]*>([\s\S]*?)<\/article>/g)].map(([, card]) => card)
assert.equal(cards.length, portfolio.length, 'Every painting must be present in the static gallery')
assert.ok(portfolio.length > 0, 'Portfolio must not be empty')
for (const artwork of portfolio) {
  const card = cards.find(card => [...card.matchAll(/<a\b[^>]*>/g)].some(([tag]) => {
    const href = attributes(tag).href
    return href === `/works/${artwork.id}/`
  }))
  assert.ok(card, `Missing static painting link: ${artwork.id}`)
  assert.ok(decode(card).includes(artwork.title), `Missing static painting title: ${artwork.id}`)
  assert.ok([...card.matchAll(/<img\b[^>]*>/g)].some(([tag]) => attributes(tag).src === artwork.images[0].thumbnail && attributes(tag).alt), `Missing preview or alt text: ${artwork.id}`)
  for (const image of artwork.images) {
    for (const path of [image.src, image.thumbnail]) assert.ok((await stat(new URL(`.${path}`, dist))).size > 0, `Missing artwork image: ${path}`)
  }

  // A text-only crawler must read each painting without running the client bundle.
  const path = `works/${artwork.id}/index.html`
  assert.ok(await stat(new URL(path, dist)).catch(() => null), `Missing standalone artwork page: ${artwork.id}`)
  const page = await readFile(new URL(path, dist), 'utf8')
  const url = `https://artlogos.space/works/${artwork.id}/`
  assert.deepEqual(tags('link', page).filter(tag => tag.rel === 'canonical').map(tag => tag.href), [url], `Wrong artwork canonical: ${artwork.id}`)
  const pageTitle = decode(page.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')
  for (const name of [artwork.title, ...names]) assert.ok(pageTitle.includes(name), `Missing identity in artwork title: ${artwork.id}`)
  assert.equal(tags('meta', page).find(tag => tag.property === 'og:url')?.content, url)
  assert.equal(tags('meta', page).find(tag => tag.property === 'og:image')?.content, `https://artlogos.space${artwork.images[0].src}`)
  const pageText = textContent(page.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? '')
  assert.ok(pageText.includes(artwork.title), `Artwork title must be readable without JavaScript: ${artwork.id}`)
  if (artwork.description) assert.ok(pageText.includes(artwork.description.replace(/\s+/g, ' ').trim()), `Description missing without JavaScript: ${artwork.id}`)
  const images = tags('img', page)
  const links = tags('a', page)
  for (const image of artwork.images) {
    assert.ok(images.some(tag => tag.src === image.src && tag.alt && Number(tag.width) === image.width && Number(tag.height) === image.height), `Full image missing without JavaScript: ${image.src}`)
    assert.ok(links.some(tag => tag.href === image.src), `Full image must have a direct link: ${image.src}`)
  }
  for (const source of artwork.sources ?? []) assert.ok(links.some(tag => tag.href === source.url), `Missing publication attribution: ${artwork.id}`)
  const schemas = [...page.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].flatMap(([, value]) => {
    const parsed = JSON.parse(value)
    return parsed['@graph'] ?? [parsed]
  })
  const painting = schemas.find(node => node['@type'] === 'VisualArtwork')
  assert.ok(painting && painting.name === artwork.title, `Missing VisualArtwork schema: ${artwork.id}`)
  assert.equal(painting.creator?.['@id'], 'https://artlogos.space/#artist')
  for (const image of artwork.images) assert.ok(JSON.stringify(painting.image).includes(`https://artlogos.space${image.src}`), `Artwork schema omits image: ${image.src}`)
}

const robots = await readFile(new URL('robots.txt', dist), 'utf8')
assert.match(robots, /Sitemap:\s*https:\/\/artlogos\.space\/sitemap\.xml/i, 'robots.txt must point to the sitemap')
assert.doesNotMatch(robots, /^\s*Disallow:\s*\/\s*$/m, 'robots.txt must allow indexing')
const sitemap = await readFile(new URL('sitemap.xml', dist), 'utf8')
assert.match(sitemap, /<loc>https:\/\/artlogos\.space\/<\/loc>/, 'Sitemap must contain the canonical homepage')
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, value]) => decode(value)).sort(), ['https://artlogos.space/', ...portfolio.map(artwork => `https://artlogos.space/works/${artwork.id}/`)].sort(), 'Sitemap must discover every standalone artwork page')
const llms = await readFile(new URL('llms.txt', dist), 'utf8')
const catalogue = await readFile(new URL('llms-full.txt', dist), 'utf8')
for (const name of names) assert.ok(llms.includes(name) && catalogue.includes(name), `Text catalogue must identify ${name}`)
assert.ok(llms.includes('https://artlogos.space/llms-full.txt'), 'Text index must link to the full catalogue')
for (const artwork of portfolio) {
  assert.ok(llms.includes(`https://artlogos.space/works/${artwork.id}/`), `Text index omits painting: ${artwork.id}`)
  if (artwork.description) assert.ok(catalogue.includes(artwork.description), `Text catalogue omits description: ${artwork.id}`)
  for (const image of artwork.images) {
    assert.ok(catalogue.includes(`https://artlogos.space${image.src}`), `Text catalogue omits image: ${image.src}`)
    assert.ok(sitemap.includes(`https://artlogos.space${image.src}`), `Image sitemap omits image: ${image.src}`)
  }
}
const socialImage = new URL(meta('og:image'))
assert.equal(socialImage.origin, 'https://artlogos.space', 'Social image must use the public site origin')
assert.ok((await stat(new URL(`.${socialImage.pathname}`, dist))).size > 0, 'Social image must exist in the build')

console.log(`SEO checks passed: rendered identity, ${cards.length} standalone painting pages, descriptions and full images without JavaScript, canonical URLs, schemas, sitemap and text catalogues`)
