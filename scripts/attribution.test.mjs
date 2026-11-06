import assert from 'node:assert/strict'
import test from 'node:test'
import { preserveAttributionQuery } from '../src/analytics/attribution.ts'

test('gallery hydration retains campaign and click attribution while normalizing gallery state', () => {
  const query = preserveAttributionQuery('?category=landscapes&sort=title', '?utm_source=instagram&utm_medium=social&utm_campaign=studio%20visit&utm_id=november&gclid=click-1&category=all&work=old&unknown=value')
  const params = new URLSearchParams(query)
  assert.equal(params.get('category'), 'landscapes')
  assert.equal(params.get('sort'), 'title')
  assert.equal(params.get('utm_source'), 'instagram')
  assert.equal(params.get('utm_medium'), 'social')
  assert.equal(params.get('utm_campaign'), 'studio visit')
  assert.equal(params.get('utm_id'), 'november')
  assert.equal(params.get('gclid'), 'click-1')
  assert.equal(params.has('work'), false)
  assert.equal(params.has('unknown'), false)
})

test('opening, moving and closing an artwork keep attribution without retaining old filters', () => {
  let current = '?utm_source=newsletter&utm_medium=email&utm_campaign=november&wbraid=braid&tag=Trees'
  current = preserveAttributionQuery('?work=azure&tag=Water', current)
  current = preserveAttributionQuery('?work=mountain-valley', current)
  current = preserveAttributionQuery('', current)
  const params = new URLSearchParams(current)
  assert.deepEqual([...params], [['utm_source', 'newsletter'], ['utm_medium', 'email'], ['utm_campaign', 'november'], ['wbraid', 'braid']])
})

test('plain gallery queries stay plain and campaign parameters are not duplicated', () => {
  assert.equal(preserveAttributionQuery('', '?category=all'), '')
  assert.equal(preserveAttributionQuery('?tag=Water&tag=Trees', ''), '?tag=Water&tag=Trees')
  const once = preserveAttributionQuery('?work=azure', '?utm_source=instagram&fbclid=click')
  assert.equal(preserveAttributionQuery('?work=azure', once), once)
})
