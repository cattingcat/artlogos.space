import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { createThemeController, themeColors, themeStorageKey } from '../src/theme/theme.ts'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const bootstrap = html.match(/<script id="theme-init">([\s\S]*?)<\/script>/)?.[1]

function firstPaint({ saved = null, dark = false, storageBlocked = false } = {}) {
  const root = { dataset: {} }
  const meta = { setAttribute(name, value) { this[name] = value } }
  vm.runInNewContext(bootstrap, {
    localStorage: { getItem(key) { assert.equal(key, themeStorageKey); if (storageBlocked) throw Error('Storage blocked'); return saved } },
    window: { matchMedia(query) { assert.equal(query, '(prefers-color-scheme: dark)'); return { matches: dark } } },
    document: { documentElement: root, querySelector(selector) { assert.equal(selector, 'meta[name="theme-color"]'); return meta } },
  })
  return { theme: root.dataset.theme, color: meta.content }
}

function browser({ saved = null, dark = false, storageBlocked = false } = {}) {
  const systemListeners = new Set()
  const storageListeners = new Set()
  let applied
  const environment = {
    readPreference() { if (storageBlocked) throw Error('Storage blocked'); return saved },
    writePreference(value) { if (storageBlocked) throw Error('Storage blocked'); saved = value },
    systemDark: () => dark,
    apply(theme) { applied = theme },
    onSystemChange(listener) { systemListeners.add(listener); return () => systemListeners.delete(listener) },
    onStorageChange(listener) { storageListeners.add(listener); return () => storageListeners.delete(listener) },
  }
  return {
    environment,
    get applied() { return applied },
    get saved() { return saved },
    system(darkMode) { dark = darkMode; for (const listener of systemListeners) listener() },
    otherTab(value) { saved = value; for (const listener of storageListeners) listener(value) },
  }
}

test('the blocking head bootstrap chooses the correct palette before any stylesheet or application script', () => {
  assert.ok(bootstrap)
  assert.ok(html.indexOf('<script id="theme-init">') < html.indexOf('<link'))
  assert.ok(html.indexOf('<script id="theme-init">') < html.indexOf('<script type="module"'))
  for (const dark of [false, true]) {
    for (const saved of [null, 'light', 'dark', 'invalid']) {
      const expected = saved === 'light' || saved === 'dark' ? saved : dark ? 'dark' : 'light'
      assert.deepEqual(firstPaint({ saved, dark }), { theme: expected, color: themeColors[expected] })
      const runtime = browser({ saved, dark })
      const controller = createThemeController(runtime.environment)
      assert.equal(controller.getTheme(), expected, 'hydration must retain the first-paint theme')
      controller.destroy()
    }
  }
  assert.deepEqual(firstPaint({ dark: true, storageBlocked: true }), { theme: 'dark', color: themeColors.dark })
})

test('system changes apply until a manual choice, which survives the next page load', () => {
  const window = browser()
  const controller = createThemeController(window.environment)
  assert.equal(window.applied, 'light')
  assert.equal(window.saved, null)
  window.system(true)
  assert.equal(controller.getTheme(), 'dark')
  controller.toggle()
  assert.equal(window.applied, 'light')
  assert.equal(window.saved, 'light')
  window.system(false)
  window.system(true)
  assert.equal(window.applied, 'light')
  controller.destroy()
  const nextPage = createThemeController(window.environment)
  assert.equal(nextPage.getTheme(), 'light')
  nextPage.destroy()
})

test('manual choices and preference removal synchronize across tabs', () => {
  const window = browser({ dark: true })
  const controller = createThemeController(window.environment)
  const observed = []
  const unsubscribe = controller.subscribe(() => observed.push(controller.getTheme()))
  window.otherTab('light')
  assert.equal(window.applied, 'light')
  window.otherTab('dark')
  assert.equal(window.applied, 'dark')
  window.system(false)
  assert.equal(window.applied, 'dark')
  window.otherTab(null)
  assert.equal(window.applied, 'light')
  window.system(true)
  assert.equal(window.applied, 'dark')
  window.otherTab('corrupt-value')
  assert.equal(window.applied, 'dark')
  assert.deepEqual(observed, ['light', 'dark', 'light', 'dark', 'dark'])
  unsubscribe()
  controller.destroy()
  window.system(false)
  window.otherTab('light')
  assert.equal(window.applied, 'dark', 'destroy detaches both browser listeners')
})

test('blocked storage does not prevent a manual selection or let the system override it', () => {
  const window = browser({ dark: true, storageBlocked: true })
  const controller = createThemeController(window.environment)
  assert.equal(window.applied, 'dark')
  controller.toggle()
  assert.equal(window.applied, 'light')
  window.system(false)
  window.system(true)
  assert.equal(window.applied, 'light')
  controller.toggle()
  assert.equal(window.applied, 'dark')
  controller.destroy()
})

test('both real CSS palettes meet text, focus and text-selection contrast requirements', () => {
  const css = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8')
  const blocks = {
    light: css.match(/:root\s*\{([^}]+)\}/)?.[1],
    dark: css.match(/:root\[data-theme=['"]dark['"]\]\s*\{([^}]+)\}/)?.[1],
  }
  const luminance = color => {
    assert.match(color, /^#[\da-f]{6}$/i)
    const channels = color.slice(1).match(/../g).map(hex => Number.parseInt(hex, 16) / 255)
    const linear = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
  }
  const ratio = (foreground, background) => {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
    return (values[0] + 0.05) / (values[1] + 0.05)
  }
  for (const [theme, block] of Object.entries(blocks)) {
    assert.ok(block, `Missing explicit ${theme} palette`)
    const colors = Object.fromEntries([...block.matchAll(/--color-([\w-]+):\s*(#[\da-f]{6})\s*;/gi)].map(([, name, value]) => [name, value]))
    const check = (foreground, background, minimum) => {
      assert.ok(colors[foreground] && colors[background], `Missing ${theme} ${foreground}/${background} tokens`)
      const contrast = ratio(colors[foreground], colors[background])
      assert.ok(contrast >= minimum, `${theme}: ${foreground} on ${background} contrast ${contrast.toFixed(2)}:1 is below ${minimum}:1`)
    }
    for (const surface of ['background', 'surface', 'image-mat']) {
      check('text', surface, 4.5)
      check('text-muted', surface, 4.5)
      check('focus', surface, 3)
    }
    check('text', 'selection', 4.5)
  }
})
