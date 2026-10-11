export type Theme = 'light' | 'dark'
export const themeStorageKey = 'artlogos-theme'
export const themeColors: Record<Theme, string> = { light: '#E9E3D8', dark: '#20211F' }

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function preferredTheme(saved: unknown, systemDark: boolean): Theme {
  return isTheme(saved) ? saved : systemDark ? 'dark' : 'light'
}

type ThemeEnvironment = {
  readPreference: () => string | null
  writePreference: (theme: Theme) => void
  systemDark: () => boolean
  apply: (theme: Theme) => void
  onSystemChange: (listener: () => void) => () => void
  onStorageChange: (listener: (value: string | null) => void) => () => void
}

export function createThemeController(environment: ThemeEnvironment) {
  let saved: string | null = null
  try { saved = environment.readPreference() } catch { /* Private browsing can make storage unavailable. */ }
  let manual: Theme | null = isTheme(saved) ? saved : null
  let current = preferredTheme(manual, environment.systemDark())
  const listeners = new Set<() => void>()
  const apply = () => {
    current = preferredTheme(manual, environment.systemDark())
    environment.apply(current)
    for (const listener of listeners) listener()
  }
  environment.apply(current)
  const removeSystemListener = environment.onSystemChange(() => { if (!manual) apply() })
  const removeStorageListener = environment.onStorageChange(value => {
    manual = isTheme(value) ? value : null
    apply()
  })
  return {
    getTheme: () => current,
    toggle: () => {
      manual = current === 'dark' ? 'light' : 'dark'
      // A manual choice remains effective in this page even if saving it fails.
      try { environment.writePreference(manual) } catch { /* The theme still changes when storage is blocked. */ }
      apply()
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    destroy: () => {
      removeSystemListener()
      removeStorageListener()
      listeners.clear()
    },
  }
}
