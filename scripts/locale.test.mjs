import assert from 'node:assert/strict'
import test from 'node:test'
import { entryRedirect, homePath, isLocale, localeFromPath, locales, preferredLocale } from '../src/i18n/locale.ts'

test('each supported browser language, including regional variants, selects its locale', () => {
  for (const locale of locales) {
    assert.equal(preferredLocale(null, [locale]), locale)
    assert.equal(preferredLocale(null, [`${locale.toUpperCase()}-XX`]), locale)
  }
  assert.equal(preferredLocale(null, ['pt-BR', 'ja-JP', 'fr']), 'ja')
  assert.equal(preferredLocale(null, ['de_CH']), 'de')
  assert.equal(preferredLocale(null, ['en-GB', 'ru-RU']), 'en')
})
test('manual preference wins; invalid or unavailable preferences fall back safely', () => {
  assert.equal(preferredLocale('fr', ['ru-RU']), 'fr')
  assert.equal(preferredLocale('invalid', ['it-IT']), 'it')
  assert.equal(preferredLocale(null, []), 'en')
  assert.equal(preferredLocale(null, ['zh-CN', 'pt']), 'en')
  assert.equal(isLocale('__proto__'), false)
})
test('only the neutral entrypoint negotiates; explicit versions and legacy deep links stay stable', () => {
  assert.equal(entryRedirect('/', '?category=portraits&work=city-portrait', '#contact', null, ['ru']), '/ru/?category=portraits&work=city-portrait#contact')
  assert.equal(entryRedirect('/index.html', '', '', 'ja', ['de']), '/ja/')
  for (const locale of locales) {
    assert.equal(entryRedirect(homePath(locale), '', '', 'ru', ['fr']), null)
    assert.equal(entryRedirect(`${homePath(locale)}works/azure/`, '', '', 'ru', ['fr']), null)
    assert.equal(localeFromPath(`${homePath(locale)}works/azure/`), locale)
  }
  assert.equal(entryRedirect('/works/azure/', '', '', 'ru', ['fr']), null)
  assert.equal(localeFromPath('/works/azure/'), undefined)
  assert.equal(localeFromPath('/france/'), undefined)
})
