import { loadLogoDataUrl, tabIconImageResponse } from '@/lib/tab-icon'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
  const logo = await loadLogoDataUrl()
  return tabIconImageResponse(180, logo)
}
