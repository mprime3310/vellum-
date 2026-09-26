import { useSyncExternalStore } from 'react'

/**
 * Theme store: light | dark | system. Module-level so the header toggle and the
 * Toaster agree, and so the choice survives a reload.
 *
 * FOUC note: the `html` class is applied by an inline script rendered as the
 * first child of <body> (see routes/__root.tsx) — before React hydrates — using
 * the same key, so there is never a flash of the wrong theme.
 */
export const THEME_KEY = 'vellum-theme'

export type ThemeChoice = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

let current: ThemeChoice | null = null
const listeners = new Set<() => void>()

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  if (choice === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return choice
}

export function getTheme(): ThemeChoice {
  if (!current) {
    if (typeof window === 'undefined') return 'system'
    try {
      const stored = window.localStorage.getItem(THEME_KEY)
      current = stored === 'light' || stored === 'dark' ? stored : 'system'
    } catch {
      current = 'system'
    }
  }
  return current
}

export function getThemeServerSnapshot(): ThemeChoice {
  return 'system'
}

export function getResolvedSnapshot(): ResolvedTheme {
  return resolveTheme(getTheme())
}

function applyToDocument() {
  if (typeof document === 'undefined') return
  const resolved = resolveTheme(getTheme())
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  // keeps native form controls, scrollbars and the canvas background in step
  root.style.colorScheme = resolved
}

function emit() {
  for (const listener of Array.from(listeners)) listener()
}

export function setTheme(choice: ThemeChoice) {
  current = choice
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_KEY, choice)
    } catch {
      /* storage disabled — the session still works */
    }
  }
  applyToDocument()
  emit()
}

export function toggleTheme() {
  setTheme(resolveTheme(getTheme()) === 'dark' ? 'light' : 'dark')
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1 && typeof window !== 'undefined' && window.matchMedia) {
    // follow the OS while the choice is "system"
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (getTheme() === 'system') {
        applyToDocument()
        emit()
      }
    }
    media.addEventListener('change', onChange)
  }
  return () => {
    listeners.delete(listener)
  }
}

/** Inlined in the document head/body so the theme is set before first paint. */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_KEY)};var s=localStorage.getItem(k);var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s==='dark'||(s!=='light'&&d);var r=document.documentElement;r.classList.toggle('dark',t);r.style.colorScheme=t?'dark':'light';}catch(e){}})();`

export interface ThemeApi {
  choice: ThemeChoice
  resolved: ResolvedTheme
  setTheme: (choice: ThemeChoice) => void
  toggle: () => void
}

export function useTheme(): ThemeApi {
  const choice = useSyncExternalStore(subscribeTheme, getTheme, getThemeServerSnapshot)
  const resolved = useSyncExternalStore(
    subscribeTheme,
    getResolvedSnapshot,
    () => 'light' as ResolvedTheme,
  )
  return { choice, resolved, setTheme, toggle: toggleTheme }
}
