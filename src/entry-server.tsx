import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import type { Locale } from './i18n/locale'

export function render(locale: Locale = 'en', artworkId?: string) {
  return renderToString(<StrictMode><App locale={locale} artworkId={artworkId} /></StrictMode>)
}
