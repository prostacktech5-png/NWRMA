'use client'

import * as React from 'react'

/** Matches next-themes default storage key so existing users keep their preference. */
const STORAGE_KEY = 'theme'

export type Theme = 'light' | 'dark' | 'system'

export type ThemeProviderProps = {
  children: React.ReactNode
  /** Uses `class="light"|"dark"` on `document.documentElement` (Tailwind). */
  attribute?: 'class'
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
  systemTheme?: 'light' | 'dark'
  themes: Theme[]
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme, enableSystem: boolean): 'light' | 'dark' {
  if (theme === 'system' && enableSystem) return getSystemTheme()
  return theme === 'dark' ? 'dark' : 'light'
}

/**
 * Theme switching without injecting a `<script>` tag (avoids React 19 “script in component” warnings
 * from next-themes). There may be one frame of default `light` before `localStorage` is read.
 */
export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'light',
  enableSystem = true,
}: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)
  const [theme, setThemeState] = React.useState<Theme>(() => (defaultTheme as Theme) || 'light')
  const [osTick, setOsTick] = React.useState(0)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === 'dark' || raw === 'light' || raw === 'system') {
        setThemeState(raw)
      }
    } catch {
      /* ignore */
    }
    setMounted(true)
  }, [])

  const resolvedTheme = React.useMemo(
    () => (mounted ? resolveTheme(theme, enableSystem) : 'light'),
    [mounted, theme, enableSystem, osTick],
  )

  const systemTheme = React.useMemo(
    () => (mounted && theme === 'system' && enableSystem ? getSystemTheme() : undefined),
    [mounted, theme, enableSystem, osTick],
  )

  React.useEffect(() => {
    if (!mounted || attribute !== 'class') return
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [mounted, attribute, resolvedTheme, theme])

  React.useEffect(() => {
    if (!mounted || !enableSystem || theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setOsTick((x) => x + 1)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mounted, enableSystem, theme])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: [...(enableSystem ? (['light', 'dark', 'system'] as const) : (['light', 'dark'] as const))],
    }),
    [theme, setTheme, resolvedTheme, systemTheme, enableSystem],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** Drop-in replacement for `useTheme` from `next-themes` (subset of props). */
export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
