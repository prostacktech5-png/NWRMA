export interface AppBranding {
  appName: string
  /** Short tagline under the app name (sidebar, login header). */
  slogan: string
  /** Login card subtitle. */
  signInDescription: string
  /**
   * Optional custom logo (data URL from upload). When null, the app uses
   * {@link DEFAULT_PUBLIC_LOGO_PATH}.
   */
  logoDataUrl: string | null
}

/** Site-wide default seal in `web/public` (served at site root). */
export const DEFAULT_PUBLIC_LOGO_PATH = '/image-removebg-preview.png'

/** Used when the default ERP logo file is missing from `public/`. */
export const FALLBACK_PUBLIC_LOGO_PATH = '/assets/uploads/2020/10/2-2.png'

export function resolveBrandingLogoSrc(branding: AppBranding): string {
  if (
    typeof branding.logoDataUrl === 'string' &&
    branding.logoDataUrl.startsWith('data:image/')
  ) {
    return branding.logoDataUrl
  }
  return DEFAULT_PUBLIC_LOGO_PATH
}

export const DEFAULT_APP_BRANDING: AppBranding = {
  appName: 'NWRMA',
  slogan: 'ERP PLATFORM',
  signInDescription: 'Sign in to access the NWRMA management system',
  logoDataUrl: null,
}

export const APP_BRANDING_STORAGE_KEY = 'nwrma-erp-branding-v1'

/** Max approximate stored JSON size guard (~500KB base64). */
export const APP_BRANDING_MAX_LOGO_CHARS = 600_000

export function parseStoredBranding(raw: string | null): AppBranding | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Partial<AppBranding>
    if (typeof data.appName !== 'string' || typeof data.slogan !== 'string') return null
    return {
      appName: data.appName.trim() || DEFAULT_APP_BRANDING.appName,
      slogan: data.slogan.trim(),
      signInDescription:
        typeof data.signInDescription === 'string' && data.signInDescription.trim()
          ? data.signInDescription.trim()
          : DEFAULT_APP_BRANDING.signInDescription,
      logoDataUrl:
        typeof data.logoDataUrl === 'string' && data.logoDataUrl.startsWith('data:image/')
          ? data.logoDataUrl
          : null,
    }
  } catch {
    return null
  }
}

export function mergeBrandingUpdate(
  current: AppBranding,
  patch: Partial<AppBranding>,
): AppBranding {
  return {
    appName: patch.appName?.trim() || current.appName,
    slogan: patch.slogan !== undefined ? patch.slogan.trim() : current.slogan,
    signInDescription:
      patch.signInDescription !== undefined
        ? patch.signInDescription.trim() || DEFAULT_APP_BRANDING.signInDescription
        : current.signInDescription,
    logoDataUrl:
      patch.logoDataUrl !== undefined ? patch.logoDataUrl : current.logoDataUrl,
  }
}
