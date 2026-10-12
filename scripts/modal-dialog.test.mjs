import assert from 'node:assert/strict'
import test from 'node:test'
import { acquireScrollLock } from '../src/components/modalScrollLock.ts'

function style(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, { value, priority: '' }]))
  return {
    getPropertyValue: key => values.get(key)?.value ?? '',
    getPropertyPriority: key => values.get(key)?.priority ?? '',
    setProperty: (key, value, priority = '') => values.set(key, { value, priority }),
    removeProperty: key => values.delete(key),
    snapshot: () => Object.fromEntries([...values].map(([key, { value, priority }]) => [key, [value, priority]])),
  }
}

function browser() {
  const document = {
    body: { style: style({ position: 'relative', 'padding-right': '9px', overflow: 'auto' }) },
    documentElement: { style: style({ 'scroll-behavior': 'smooth' }), clientWidth: 980 },
  }
  document.body.style.setProperty('overflow', 'auto', 'important')
  const restoredPositions = []
  const window = {
    scrollX: 13, scrollY: 740, innerWidth: 1000,
    getComputedStyle: () => ({ paddingRight: '9px' }),
    scrollTo(position) {
      assert.equal(document.documentElement.style.getPropertyValue('scroll-behavior'), 'auto')
      restoredPositions.push(position)
    },
  }
  return { document, window, restoredPositions }
}

test('nested modals keep scrolling locked until the final close, in either unmount order', () => {
  for (const parentClosesFirst of [false, true]) {
    const { document, window, restoredPositions } = browser()
    const originalBody = document.body.style.snapshot()
    const originalRoot = document.documentElement.style.snapshot()
    const closeParent = acquireScrollLock(document, window)
    assert.equal(document.body.style.getPropertyValue('position'), 'fixed')
    assert.equal(document.body.style.getPropertyValue('top'), '-740px')
    assert.equal(document.body.style.getPropertyValue('left'), '-13px')
    assert.equal(document.body.style.getPropertyValue('padding-right'), '29px')
    window.scrollX = 0
    window.scrollY = 0
    const closeChild = acquireScrollLock(document, window)
    assert.equal(document.body.style.getPropertyValue('top'), '-740px', 'a child must not replace the original scroll position')
    const first = parentClosesFirst ? closeParent : closeChild
    const last = parentClosesFirst ? closeChild : closeParent
    first()
    first()
    assert.equal(document.body.style.getPropertyValue('position'), 'fixed')
    assert.equal(restoredPositions.length, 0)
    last()
    last()
    assert.deepEqual(document.body.style.snapshot(), originalBody)
    assert.deepEqual(document.documentElement.style.snapshot(), originalRoot)
    assert.deepEqual(restoredPositions, [{ left: 13, top: 740, behavior: 'instant' }])
  }
})

test('a later modal captures a new scroll position after the first stack closes', () => {
  const { document, window, restoredPositions } = browser()
  acquireScrollLock(document, window)()
  window.scrollY = 1250
  const close = acquireScrollLock(document, window)
  assert.equal(document.body.style.getPropertyValue('top'), '-1250px')
  close()
  assert.equal(restoredPositions[1].top, 1250)
})
