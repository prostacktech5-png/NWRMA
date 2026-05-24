import { isValidErpDepartment } from '@/lib/org-departments'
import type { PlatformViewer } from '@/lib/rbac/permissions'
import type { Department } from '@/lib/types'
import type { OrgDepartmentDocument } from '@/lib/org-documents-store'

export type OrgDocumentsCapability = 'view' | 'search' | 'download' | 'send' | 'delete'

export function canOrgDocuments(viewer: PlatformViewer, cap: OrgDocumentsCapability): boolean {
  if (viewer.platformRoles.includes('super_admin')) return true

  if (cap === 'view' || cap === 'search' || cap === 'download') {
    return true
  }

  if (cap === 'send') {
    const dept = viewer.department
    return dept != null && isValidErpDepartment(dept)
  }

  if (cap === 'delete') {
    if (viewer.role === 'admin') return true
    return viewer.role === 'hod'
  }

  return false
}

export function canDeleteOrgDocument(
  viewer: PlatformViewer,
  doc: OrgDepartmentDocument
): boolean {
  if (viewer.platformRoles.includes('super_admin')) return true
  if (viewer.role === 'admin') return true
  if (viewer.role !== 'hod') return false
  const dept = viewer.department as Department
  if (!dept) return false
  return doc.fromDepartment === dept || doc.toDepartment === dept
}
