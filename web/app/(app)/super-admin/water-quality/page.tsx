'use client'

import { Badge } from '@/components/ui/badge'
import { GenericAdminPage } from '@/components/super-admin/generic-admin-page'

type WqRow = {
  id: string
  boreholeId: string | null
  labReference: string | null
  status: string
  testedAt: string | null
}

export default function SuperAdminWaterQualityPage() {
  return (
    <GenericAdminPage<WqRow>
      title="Water quality"
      description="Lab tests and threshold compliance."
      apiPath="/api/super-admin/water-quality/tests"
      columns={[
        { key: 'lab', header: 'Lab ref', render: (r) => r.labReference ?? '—' },
        { key: 'borehole', header: 'Borehole', render: (r) => r.boreholeId ?? '—' },
        {
          key: 'status',
          header: 'Status',
          render: (r) => <Badge variant="outline">{r.status}</Badge>,
        },
        { key: 'tested', header: 'Tested', render: (r) => r.testedAt ?? '—' },
      ]}
    />
  )
}
