import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = new URL('../dist/', import.meta.url)
const template = await readFile(new URL('index.html', dist), 'utf8')
const placeholder = '<div id="root"></div>'
if (template.split(placeholder).length !== 2) throw new Error('Expected exactly one empty React root')
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const markdownLabel = value => value.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('\n', ' ')
const vite = await createServer({ root, appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false, watch: null } })
try {
  const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')
  const { locales, homePath, ogLocales, languageNames } = await vite.ssrLoadModule('/src/i18n/locale.ts')
  const { dictionaries, getArtworks, getSite, translate } = await vite.ssrLoadModule('/src/i18n/catalog.ts')
  const { artworkUrl, artworkPageTitle, artworkPageDescription } = await vite.ssrLoadModule('/src/content/artwork-pages.ts')
  const origin = getSite('en').url
  const absolute = path => new URL(path, origin).href
  const pageUrl = (locale, work) => work ? artworkUrl(work, locale) : absolute(homePath(locale))
  const alternatives = work => [...locales.map(locale => ({ language: locale, url: pageUrl(locale, work) })), { language: 'x-default', url: work ? pageUrl('en', work) : origin }]
  function renderPage(locale, work) {
    const site = getSite(locale)
    const image = work?.images[0] ?? getArtworks(locale)[0].images[0]
    const title = work ? artworkPageTitle(work) : site.pageTitle
    const description = work ? artworkPageDescription(work, locale) : site.description
    const url = pageUrl(locale, work)
    const meta = new Map(Object.entries({ description, 'og:title': title, 'og:description': description, 'og:url': url,
      'og:image': absolute(image.src), 'og:image:width': image.width, 'og:image:height': image.height, 'og:image:alt': image.alt,
      'twitter:title': title, 'twitter:description': description, 'twitter:image': absolute(image.src), 'twitter:image:alt': image.alt,
    }))
    const markup = render(locale, work?.id)
    if (!markup) throw new Error('Empty React prerender')
    let page = template.replace('<html lang="en">', `<html lang="${locale}">`)
      .replace(placeholder, () => `<div id="root" data-prerendered="true">${markup}</div>`)
      .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(title)}</title>`)
      .replace(/<link\b[^>]*\brel="canonical"[^>]*>/, () => `<link rel="canonical" href="${escapeHtml(url)}" />`)
      .replace(/<meta\b[^>]*>/g, tag => {
        const name = /\b(?:name|property)="([^"]+)"/.exec(tag)?.[1]
        if (!meta.has(name)) return tag
        const value = meta.get(name)
        meta.delete(name)
        if (!/\bcontent="[^"]*"/.test(tag)) throw new Error(`Missing metadata content: ${name}`)
        return tag.replace(/\bcontent="[^"]*"/, () => `content="${escapeHtml(value)}"`)
      })
    if (meta.size) throw new Error(`Missing metadata: ${[...meta.keys()].join(', ')}`)
    const links = alternatives(work).map(({ language, url }) => `<link rel="alternate" hreflang="${language}" href="${escapeHtml(url)}" />`)
    links.push(`<meta property="og:locale" content="${ogLocales[locale]}" />`, ...locales.filter(value => value !== locale).map(value => `<meta property="og:locale:alternate" content="${ogLocales[value]}" />`))
    links.push(`<link rel="alternate" type="text/plain" title="${escapeHtml(translate(locale, 'completeCatalogue'))}" href="${absolute(`${homePath(locale)}llms-full.txt`)}" />`)
    return page.replace('</head>', `${links.join('\n    ')}\n  </head>`)
  }
  const sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
  const write = async (path, content) => {
    const url = new URL(path, dist)
    await mkdir(new URL('.', url), { recursive: true })
    await writeFile(url, content)
  }
  for (const locale of locales) {
    const site = getSite(locale)
    const works = getArtworks(locale)
    const messages = dictionaries[locale]
    const t = (key, values) => translate(locale, key, values)
    for (const work of [undefined, ...works]) {
      const path = work ? `${locale}/works/${work.id}/index.html` : `${locale}/index.html`
      const page = renderPage(locale, work)
      await write(path, page)
      // Keep existing English URLs usable; their canonical points to /en/.
      if (locale === 'en') await write(work ? `works/${work.id}/index.html` : 'index.html', page)
      sitemap.push(`  <url><loc>${escapeHtml(pageUrl(locale, work))}</loc>`,
        ...alternatives(work).map(({ language, url }) => `    <xhtml:link rel="alternate" hreflang="${language}" href="${escapeHtml(url)}" />`),
        ...(work?.images ?? []).map(image => `    <image:image><image:loc>${escapeHtml(absolute(image.src))}</image:loc></image:image>`), '  </url>')
    }
    const intro = `# ${site.artistName} (${site.fullName})\n\n${site.about.paragraphs[0]}\n\n${t('officialPortfolio')}: ${pageUrl(locale)}`
    const languageLinks = `## ${t('languageVersions')}\n\n${locales.map(value => `- [${languageNames[value]}](${absolute(`${homePath(value)}llms-full.txt`)})`).join('\n')}`
    const profiles = `## ${t('artistProfiles')}\n\n- [${t('email')}: ${site.email}](mailto:${site.email})\n- [Telegram: @${site.telegram.username}](${site.telegram.url})\n- Discord: ${site.discord}\n${site.socialLinks.map(link => `- [${markdownLabel(link.name)}](${link.url})`).join('\n')}`
    const index = [intro, `## ${t('portfolio')}\n\n- [${t('allWorks')}](${pageUrl(locale)})\n- [${t('completeCatalogue')}](${absolute(`${homePath(locale)}llms-full.txt`)})`, `## ${t('paintings')}\n\n${works.map(work => `- [${markdownLabel(work.title)}](${artworkUrl(work, locale)}): ${messages.categories[work.category]}`).join('\n')}`, languageLinks, profiles, ''].join('\n\n')
    const catalogue = [intro, ...works.map(work => [
      `## ${work.title}`,
      `${t('page')}: ${artworkUrl(work, locale)}\n${t('artist')}: ${site.artistName} (${site.fullName})\n${t('category')}: ${messages.categories[work.category]}\n${t('subjects')}: ${work.tags.map(tag => messages.tags[tag]).join(', ')}`,
      ...(work.description ? [work.description] : []),
      `${t('photographs')}:\n${work.images.map(image => `- ${image.label}: ${absolute(image.src)}\n  ${t('description')}: ${image.alt}\n  ${t('dimensions')}: ${image.width} × ${image.height} ${t('pixels')}`).join('\n')}`,
      ...(work.sources?.length ? [`${t('publications')}:\n${work.sources.map(source => `- ${source.label}: ${source.url}`).join('\n')}`] : []),
    ].join('\n\n')), languageLinks, profiles, ''].join('\n\n')
    await write(`${locale}/llms.txt`, index)
    await write(`${locale}/llms-full.txt`, catalogue)
    if (locale === 'en') { await write('llms.txt', index); await write('llms-full.txt', catalogue) }
  }
  sitemap.push('</urlset>', '')
  await write('sitemap.xml', sitemap.join('\n'))
  console.log(`Prerendered ${locales.length * (getArtworks('en').length + 1)} localized pages and preserved 37 legacy URLs; generated multilingual sitemap and catalogues`)
} finally { await vite.close() }
