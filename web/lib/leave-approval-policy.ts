import type { User } from '@/lib/types'

/** Leave must pass HR Head of Department before Director General sees it at `dg_review`. */
export function canHrHeadDecideLeave(viewer: User): boolean {
  return viewer.role === 'hod' && viewer.department === 'hr'
}

export function canDirectorGeneralDecideLeave(viewer: User): boolean {
  return viewer.role === 'dg'
}
