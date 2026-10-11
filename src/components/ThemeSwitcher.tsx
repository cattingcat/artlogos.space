import { useI18n } from '../i18n/context'
import { useTheme } from '../theme/useTheme'
import './ThemeSwitcher.css'

export default function ThemeSwitcher() {
  const { t } = useI18n()
  const { theme, toggleTheme } = useTheme()
  return <button type="button" className="theme-switcher" onClick={toggleTheme} aria-label={t('darkTheme')} aria-pressed={theme === 'dark'} title={t(theme === 'dark' ? 'switchToLight' : 'switchToDark')}>
    <svg className="theme-icon theme-icon-moon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.6 13.1A8.8 8.8 0 0 1 10.9 3.4a8.8 8.8 0 1 0 9.7 9.7Z" /></svg>
    <svg className="theme-icon theme-icon-sun" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  </button>
}
