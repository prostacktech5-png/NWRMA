import { loadLogoDataUrl, tabIconImageResponse } from '@/lib/tab-icon'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon() {
  const logo = await loadLogoDataUrl()
  return tabIconImageResponse(32, logo)
}
