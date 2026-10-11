import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import { artworkIdFromPath } from './content/artwork-pages'
import { entryRedirect, languageStorageKey, localeFromPath } from './i18n/locale'
import './styles.css'

const root = document.getElementById('root')!
let savedLanguage: string | null = null
try { savedLanguage = window.localStorage.getItem(languageStorageKey) } catch { /* Browser preferences remain available. */ }
const redirect = entryRedirect(window.location.pathname, window.location.search, window.location.hash, savedLanguage, navigator.languages?.length ? navigator.languages : [navigator.language])
const app = (
  <StrictMode>
    <App locale={localeFromPath(window.location.pathname) ?? 'en'} artworkId={artworkIdFromPath(window.location.pathname)} />
  </StrictMode>
)

if (redirect) window.location.replace(redirect)
else if (root.hasAttribute('data-prerendered')) hydrateRoot(root, app)
else createRoot(root).render(app)
