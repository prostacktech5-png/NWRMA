export interface SitePage {
  path: string
  route: string
  template: string
  title: string
  contentFile: string
}

import siteMapJson from './site-map.json'

export const siteMap = siteMapJson as SitePage[]
