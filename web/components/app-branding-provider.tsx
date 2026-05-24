'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  APP_BRANDING_STORAGE_KEY,
  DEFAULT_APP_BRANDING,
  mergeBrandingUpdate,
  parseStoredBranding,
  type AppBranding,
} from '@/lib/app-branding'

type AppBrandingContextValue = {
  branding: AppBranding
  /** Persist branding (browser only). No-op shape merge. */
  setBranding: (patch: Partial<AppBranding>) => void
  resetBranding: () => void
}

const AppBrandingContext = createContext<AppBrandingContextValue | null>(null)

export function AppBrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBrandingState] = useState<AppBranding>(DEFAULT_APP_BRANDING)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const parsed = parseStoredBranding(localStorage.getItem(APP_BRANDING_STORAGE_KEY))
      if (parsed) setBrandingState(parsed)
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const titleBase = branding.appName || DEFAULT_APP_BRANDING.appName
    document.title = `${titleBase} — ${branding.slogan || DEFAULT_APP_BRANDING.slogan}`
  }, [branding.appName, branding.slogan, hydrated])

  const setBranding = useCallback((patch: Partial<AppBranding>) => {
    setBrandingState((prev) => {
      const next = mergeBrandingUpdate(prev, patch)
      try {
        localStorage.setItem(APP_BRANDING_STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* quota */
      }
      return next
    })
  }, [])

  const resetBranding = useCallback(() => {
    setBrandingState(() => {
      try {
        localStorage.setItem(APP_BRANDING_STORAGE_KEY, JSON.stringify(DEFAULT_APP_BRANDING))
      } catch {
        /* ignore */
      }
      return DEFAULT_APP_BRANDING
    })
  }, [])

  const value = useMemo(
    () => ({ branding, setBranding, resetBranding }),
    [branding, setBranding, resetBranding],
  )

  return (
    <AppBrandingContext.Provider value={value}>{children}</AppBrandingContext.Provider>
  )
}

export function useAppBranding(): AppBrandingContextValue {
  const ctx = useContext(AppBrandingContext)
  if (!ctx) {
    throw new Error('useAppBranding must be used within AppBrandingProvider')
  }
  return ctx
}
