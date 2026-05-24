'use client'

import { Badge } from '@/components/ui/badge'
import { GenericAdminPage } from '@/components/super-admin/generic-admin-page'

type BoreholeRow = {
  id: string
  boreholeId: string
  district: string
  region: string
  functionalState: string | null
  licenseStatus: string | null
  deletedAt: string | null
}

export default function SuperAdminBoreholesPage() {
  return (
    <GenericAdminPage<BoreholeRow>
      title="Borehole registry"
      description="National borehole records — filter, archive, and restore."
      apiPath="/api/super-admin/boreholes"
      mapResponse={(data) =>
        data && typeof data === 'object' && 'items' in data
          ? (data.items as BoreholeRow[])
          : []
      }
      columns={[
        { key: 'id', header: 'Borehole ID', render: (r) => r.boreholeId },
        { key: 'district', header: 'District', render: (r) => r.district },
        { key: 'region', header: 'Region', render: (r) => r.region },
        {
          key: 'state',
          header: 'State',
          render: (r) => r.functionalState ?? '—',
        },
        {
          key: 'license',
          header: 'License',
          render: (r) => r.licenseStatus ?? '—',
        },
        {
          key: 'status',
          header: 'Status',
          render: (r) =>
            r.deletedAt ? (
              <Badge variant="destructive">Archived</Badge>
            ) : (
              <Badge variant="secondary">Active</Badge>
            ),
        },
      ]}
    />
  )
}
