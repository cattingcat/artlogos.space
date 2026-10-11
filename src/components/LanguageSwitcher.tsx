import { useI18n } from '../i18n/context'
import { homePath, languageNames, languageStorageKey, locales } from '../i18n/locale'
import { artworkPath } from '../content/artwork-pages'
import './LanguageSwitcher.css'

export default function LanguageSwitcher({ artworkId, query = '' }: { artworkId?: string; query?: string }) {
  const { locale, t } = useI18n()
  return <details className="language-switcher">
    <summary aria-label={t('language')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a19 19 0 0 1 0 18 19 19 0 0 1 0-18Z" /></svg><span lang={locale}>{languageNames[locale]}</span><span aria-hidden="true">⌄</span></summary>
    <nav aria-label={t('language')}>
      {locales.map(language => <a key={language} lang={language} hrefLang={language} href={`${artworkId ? artworkPath({ id: artworkId }, language) : homePath(language)}${query}`} aria-current={locale === language ? 'true' : undefined} onClick={event => {
        event.currentTarget.hash = window.location.hash
        try { window.localStorage.setItem(languageStorageKey, language) } catch { /* The explicit URL still works when storage is unavailable. */ }
      }}>{languageNames[language]}{locale === language && <span aria-hidden="true">✓</span>}</a>)}
    </nav>
  </details>
}
