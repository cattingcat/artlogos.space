const measurementId = 'G-MK7GF137Y6'

export type ArtworkContext = {
  artwork_id: string
  category: string
  view_mode: 'modal' | 'page'
}

type ContactMethod = 'email' | 'telegram'
type GoogleTag = (...command: unknown[]) => void
type AnalyticsWindow = {
  location: Pick<Location, 'hostname' | 'pathname' | 'href'>
  dataLayer?: unknown[]
  gtag?: GoogleTag
}
type AnalyticsEnvironment = {
  window: AnalyticsWindow
  document: {
    title: string
    referrer: string
    createElement(tag: 'script'): HTMLScriptElement
    head: { appendChild(script: HTMLScriptElement): unknown }
  }
}

// The environment boundary keeps prerendering and local tests independent of browser globals.
export function createAnalyticsController({ window, document }: AnalyticsEnvironment) {
  let initialized = false
  let locale = ''
  let currentArtwork: ArtworkContext | null = null
  let lastArtworkView: string | null = null

  function command(...args: unknown[]) {
    try {
      window.gtag?.(...args)
    } catch {
      // A blocked or overridden tag must never interrupt the portfolio.
    }
  }

  function recordArtworkView() {
    if (!initialized || !currentArtwork) return
    const key = JSON.stringify(currentArtwork)
    if (lastArtworkView === key) return
    lastArtworkView = key
    command('event', 'view_artwork', { ...currentArtwork, site_language: locale })
  }

  return {
    initializeAnalytics(nextLocale: string): void {
      locale = nextLocale
      if (initialized) return
      const { hostname, pathname } = window.location
      if (hostname !== 'artlogos.space' && hostname !== 'www.artlogos.space') return
      if (pathname === '/' || pathname === '/index.html') return
      initialized = true

      try {
        window.dataLayer ??= []
        window.gtag ??= function () {
          window.dataLayer?.push(arguments)
        }
      } catch {
        return
      }

      const defaults = {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        site_language: locale,
      }
      // The GA destination can fire on tag initialization, before it reads config.
      command('set', defaults)
      command('js', new Date())
      command('config', measurementId, defaults)
      command('event', 'page_view', {
        page_location: window.location.href,
        page_title: document.title,
        page_referrer: document.referrer,
        site_language: locale,
      })
      recordArtworkView()

      try {
        const script = document.createElement('script')
        script.async = true
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
        document.head.appendChild(script)
      } catch {
        // Collection is optional infrastructure, including when script insertion is denied.
      }
    },

    setCurrentArtwork(artwork: ArtworkContext | null): void {
      // Project known fields so an artwork model cannot accidentally add PII to events.
      currentArtwork = artwork ? {
        artwork_id: artwork.artwork_id,
        category: artwork.category,
        view_mode: artwork.view_mode,
      } : null
      if (!currentArtwork) lastArtworkView = null
      recordArtworkView()
    },

    trackContactClick(method: ContactMethod, placement: string): void {
      if (!initialized) return
      command('event', 'contact_click', { method, placement, site_language: locale, ...currentArtwork })
    },
  }
}

let browserController: ReturnType<typeof createAnalyticsController> | undefined

function getBrowserController() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return undefined
  browserController ??= createAnalyticsController({ window, document })
  return browserController
}

export function initializeAnalytics(locale: string): void {
  getBrowserController()?.initializeAnalytics(locale)
}

export function setCurrentArtwork(artwork: ArtworkContext | null): void {
  getBrowserController()?.setCurrentArtwork(artwork)
}

export function trackContactClick(method: ContactMethod, placement: string): void {
  getBrowserController()?.trackContactClick(method, placement)
}
