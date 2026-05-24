export function routeToSlug(route: string): string {
  if (route === '/' || route === '') return 'home'
  return route.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '_')
}

export function slugToSegments(slug: string): string[] {
  if (slug === 'home') return []
  return slug.split('_')
}
