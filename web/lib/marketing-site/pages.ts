import fs from 'fs'
import path from 'path'
import { routeToSlug } from './paths'
import { normalizePageHtml } from './normalizePageHtml'
import { isDataPageRoute } from './data-routes'
import { isProjectPageRoute } from './project-routes'

export interface MarketingPageData {
  title: string
  html: string
}

const PAGES_DIR = path.join(process.cwd(), 'content', 'marketing-pages')

export function getMarketingPage(route: string): MarketingPageData | null {
  const slug = routeToSlug(route)
  const filePath = path.join(PAGES_DIR, `${slug}.json`)
  if (!fs.existsSync(filePath)) return null
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as MarketingPageData
  return {
    title: raw.title,
    html: normalizePageHtml(raw.html),
  }
}

export function listMarketingRoutes(): string[] {
  const siteMapPath = path.join(process.cwd(), 'lib', 'marketing-site', 'site-map.json')
  if (!fs.existsSync(siteMapPath)) return []
  const entries = JSON.parse(fs.readFileSync(siteMapPath, 'utf8')) as { route: string }[]
  return entries
    .map((e) => e.route)
    .filter(
      (r) =>
        r !== '/' &&
        r !== '/about' &&
        r !== '/data' &&
        r !== '/news' &&
        r !== '/contact' &&
        !isProjectPageRoute(r) &&
        !isDataPageRoute(r),
    )
}
