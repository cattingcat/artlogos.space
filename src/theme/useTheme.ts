import { useSyncExternalStore } from 'react'
import { createThemeController, isTheme, themeColors, themeStorageKey, type Theme } from './theme'

let controller: ReturnType<typeof createThemeController> | undefined

function browserController() {
  if (!controller) {
    const system = window.matchMedia('(prefers-color-scheme: dark)')
    controller = createThemeController({
      readPreference: () => window.localStorage.getItem(themeStorageKey),
      writePreference: theme => window.localStorage.setItem(themeStorageKey, theme),
      systemDark: () => system.matches,
      apply: theme => {
        document.documentElement.dataset.theme = theme
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme])
      },
      onSystemChange: listener => {
        system.addEventListener('change', listener)
        return () => system.removeEventListener('change', listener)
      },
      onStorageChange: listener => {
        const onStorage = (event: StorageEvent) => {
          if (event.key !== themeStorageKey && event.key !== null) return
          try { if (event.storageArea !== window.localStorage) return } catch { return }
          listener(event.key === null ? null : event.newValue)
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
      },
    })
  }
  return controller
}

const subscribe = (listener: () => void) => browserController().subscribe(listener)
const getSnapshot = (): Theme => {
  const theme = document.documentElement.dataset.theme
  return isTheme(theme) ? theme : 'light'
}
const getServerSnapshot = (): Theme => 'light'

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { theme, toggleTheme: () => browserController().toggle() }
}
