'use client'

import { GenericAdminPage } from '@/components/super-admin/generic-admin-page'

type DocRow = {
  id: string
  fileName: string
  category: string
  entityType: string
  entityId: string
  version: number
}

export default function SuperAdminDocumentsPage() {
  return (
    <GenericAdminPage<DocRow>
      title="Document vault"
      description="Platform document metadata and versions."
      apiPath="/api/super-admin/documents"
      columns={[
        { key: 'file', header: 'File', render: (r) => r.fileName },
        { key: 'cat', header: 'Category', render: (r) => r.category },
        {
          key: 'entity',
          header: 'Entity',
          render: (r) => `${r.entityType} / ${r.entityId}`,
        },
        { key: 'ver', header: 'Ver', render: (r) => r.version },
      ]}
    />
  )
}
