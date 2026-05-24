/** Data section pages with dedicated table / maps layouts (excluded from catch-all JSON renderer). */
export const DATA_TABLE_ROUTES = [
  '/data/rainfall',
  '/data/ground-water',
  '/data/surface-water',
] as const

export type DataTableRoute = (typeof DATA_TABLE_ROUTES)[number]

export const DATA_MAPS_ROUTE = '/maps'

export function isDataTableRoute(route: string): route is DataTableRoute {
  return (DATA_TABLE_ROUTES as readonly string[]).includes(route)
}

export function isDataPageRoute(route: string): boolean {
  return isDataTableRoute(route) || route === DATA_MAPS_ROUTE
}
