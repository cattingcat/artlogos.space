import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = new URL('../dist/index.html', import.meta.url)
const dist = new URL('../dist/', import.meta.url)
const template = await readFile(output, 'utf8')
const placeholder = '<div id="root"></div>'
if (template.split(placeholder).length !== 2) {
  throw new Error('Expected exactly one empty React root in the Vite build')
}

const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const markdownLabel = value => value.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('\n', ' ')
const catalogueLink = '<link rel="alternate" type="text/plain" title="Artist and paintings catalogue" href="https://artlogos.space/llms-full.txt" />'

function renderPage(markup, metadata) {
  if (!markup) throw new Error('React prerender returned an empty page')
  let page = template.replace(placeholder, () => `<div id="root" data-prerendered="true">${markup}</div>`)
  if (metadata) {
    page = page.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(metadata.title)}</title>`)
    page = page.replace(/<link\b[^>]*\brel="canonical"[^>]*>/, () => `<link rel="canonical" href="${escapeHtml(metadata.url)}" />`)
    const replacements = new Map(Object.entries({
      description: metadata.description,
      'og:title': metadata.title,
      'og:description': metadata.description,
      'og:url': metadata.url,
      'og:image': metadata.image,
      'og:image:width': metadata.width,
      'og:image:height': metadata.height,
      'og:image:alt': metadata.alt,
      'twitter:title': metadata.title,
      'twitter:description': metadata.description,
      'twitter:image': metadata.image,
      'twitter:image:alt': metadata.alt,
    }))
    page = page.replace(/<meta\b[^>]*>/g, tag => {
      const name = /\b(?:name|property)="([^"]+)"/.exec(tag)?.[1]
      if (!replacements.has(name)) return tag
      const value = replacements.get(name)
      replacements.delete(name)
      if (!/\bcontent="[^"]*"/.test(tag)) throw new Error(`Missing metadata content: ${name}`)
      return tag.replace(/\bcontent="[^"]*"/, () => `content="${escapeHtml(value)}"`)
    })
    if (replacements.size) throw new Error(`Missing metadata in template: ${[...replacements.keys()].join(', ')}`)
  }
  return page.replace('</head>', `${catalogueLink}\n  </head>`)
}

// Vite transforms TSX and imported CSS for SSR without opening an HTTP server.
const vite = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
})
try {
  const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')
  const { artworks } = await vite.ssrLoadModule('/src/content/artworks.ts')
  const { site } = await vite.ssrLoadModule('/src/content/site.ts')
  const { artworkUrl, artworkPageTitle, artworkPageDescription } = await vite.ssrLoadModule('/src/content/artwork-pages.ts')
  const imageUrl = image => new URL(image.src, site.url).href
  await writeFile(output, renderPage(render()))
  const ids = new Set()
  for (const artwork of artworks) {
    if (!/^[a-z0-9-]+$/.test(artwork.id) || ids.has(artwork.id)) throw new Error(`Invalid or duplicate artwork ID: ${artwork.id}`)
    ids.add(artwork.id)
    if (!artwork.images.length) throw new Error(`Artwork has no photographs: ${artwork.id}`)
    const directory = new URL(`works/${artwork.id}/`, dist)
    await mkdir(directory, { recursive: true })
    const image = artwork.images[0]
    await writeFile(new URL('index.html', directory), renderPage(render(artwork.id), {
      title: artworkPageTitle(artwork),
      description: artworkPageDescription(artwork),
      url: artworkUrl(artwork),
      image: imageUrl(image),
      width: image.width,
      height: image.height,
      alt: image.alt,
    }))
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    `  <url><loc>${escapeHtml(site.url)}</loc></url>`,
    ...artworks.map(artwork => `  <url>\n    <loc>${escapeHtml(artworkUrl(artwork))}</loc>\n${artwork.images.map(image => `    <image:image><image:loc>${escapeHtml(imageUrl(image))}</image:loc></image:image>`).join('\n')}\n  </url>`),
    '</urlset>',
    '',
  ].join('\n')
  await writeFile(new URL('sitemap.xml', dist), sitemap)

  const artistIntroduction = `# ${site.artistName} (${site.fullName})\n\n${site.about.paragraphs[0]}\n\nOfficial portfolio: ${site.url}`
  const profiles = `## Artist profiles and contact\n\n- [Email: ${site.email}](mailto:${site.email})\n- [Telegram: @${site.telegram.username}](${site.telegram.url})\n- Discord: ${site.discord}\n${site.socialLinks.map(link => `- [${markdownLabel(link.name)}](${link.url})`).join('\n')}`
  const llms = [
    artistIntroduction,
    `## Portfolio\n\n- [All paintings](${site.url})\n- [Complete text catalogue, descriptions and image links](${new URL('llms-full.txt', site.url).href})`,
    `## Paintings\n\n${artworks.map(artwork => `- [${markdownLabel(artwork.title)}](${artworkUrl(artwork)}): ${artwork.category}`).join('\n')}`,
    profiles,
    '',
  ].join('\n\n')
  const catalogue = [
    artistIntroduction,
    ...artworks.map(artwork => [
      `## ${artwork.title}`,
      `Page: ${artworkUrl(artwork)}\nArtist: ${site.artistName} (${site.fullName})\nCategory: ${artwork.category}\nSubjects: ${artwork.tags.join(', ')}`,
      ...(artwork.description ? [artwork.description] : []),
      `Photographs:\n${artwork.images.map(image => `- ${image.label}: ${imageUrl(image)}\n  Description: ${image.alt}\n  Dimensions: ${image.width} × ${image.height} pixels`).join('\n')}`,
      ...(artwork.sources?.length ? [`Publications:\n${artwork.sources.map(source => `- ${source.label}: ${source.url}`).join('\n')}`] : []),
    ].join('\n\n')),
    profiles,
    '',
  ].join('\n\n')
  await writeFile(new URL('llms.txt', dist), llms)
  await writeFile(new URL('llms-full.txt', dist), catalogue)
  console.log(`Prerendered the portfolio and ${artworks.length} artwork pages; generated sitemap and text catalogues`)
} finally {
  await vite.close()
}
