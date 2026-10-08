import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = new URL('../dist/index.html', import.meta.url)
const template = await readFile(output, 'utf8')
const placeholder = '<div id="root"></div>'
if (template.split(placeholder).length !== 2) {
  throw new Error('Expected exactly one empty React root in the Vite build')
}

// Vite transforms TSX and imported CSS for SSR without opening an HTTP server.
const vite = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
})
try {
  const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')
  const markup = render()
  if (!markup) throw new Error('React prerender returned an empty page')
  await writeFile(output, template.replace(placeholder, () => `<div id="root" data-prerendered="true">${markup}</div>`))
  console.log('Prerendered the portfolio into dist/index.html')
} finally {
  await vite.close()
}
