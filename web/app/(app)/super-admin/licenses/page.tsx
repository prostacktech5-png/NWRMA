'use client'

import { Badge } from '@/components/ui/badge'
import { GenericAdminPage } from '@/components/super-admin/generic-admin-page'

type LicenseRow = {
  id: string
  reference: string
  status: string
  companyName: string
  district: string
  paymentStatus: string
}

export default function SuperAdminLicensesPage() {
  return (
    <GenericAdminPage<LicenseRow>
      title="License applications"
      description="All drilling license applications synced from ERP and database."
      apiPath="/api/super-admin/licenses"
      mapResponse={(data) =>
        data && typeof data === 'object' && 'items' in data
          ? (data.items as LicenseRow[])
          : []
      }
      columns={[
        { key: 'ref', header: 'Reference', render: (r) => r.reference },
        { key: 'company', header: 'Company', render: (r) => r.companyName },
        { key: 'district', header: 'District', render: (r) => r.district },
        {
          key: 'status',
          header: 'Status',
          render: (r) => <Badge variant="outline">{r.status}</Badge>,
        },
        { key: 'pay', header: 'Payment', render: (r) => r.paymentStatus },
      ]}
    />
  )
}
