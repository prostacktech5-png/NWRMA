/** Marketing project pages with dedicated layouts (excluded from catch-all JSON renderer). */
export const PROJECT_PAGE_ROUTES = [
  '/projects',
  '/gosl-completed-projects',
  '/gosl-ongoing-projects',
  '/gosl-pipeline-projects',
  '/donor-completed-projects',
  '/donor-ongoing-projects',
  '/donor-pipeline-projects',
  '/projectprocurement',
] as const

export type ProjectPageRoute = (typeof PROJECT_PAGE_ROUTES)[number]

export function isProjectPageRoute(route: string): boolean {
  return (PROJECT_PAGE_ROUTES as readonly string[]).includes(route)
}
