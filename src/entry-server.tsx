import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'

export function render(artworkId?: string) {
  return renderToString(<StrictMode><App artworkId={artworkId} /></StrictMode>)
}
