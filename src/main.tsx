import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import { artworkIdFromPath } from './content/artwork-pages'
import './styles.css'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App artworkId={artworkIdFromPath(window.location.pathname)} />
  </StrictMode>
)

if (root.hasAttribute('data-prerendered')) hydrateRoot(root, app)
else createRoot(root).render(app)
