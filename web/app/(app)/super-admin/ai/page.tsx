'use client'

import { Badge } from '@/components/ui/badge'
import { GenericAdminPage } from '@/components/super-admin/generic-admin-page'

type FindingRow = {
  id: string
  entityType: string
  entityId: string
  rule: string
  severity: string
  score: number | null
  createdAt: string
}

export default function SuperAdminAiPage() {
  return (
    <GenericAdminPage<FindingRow>
      title="AI validation findings"
      description="Automated data quality and compliance checks."
      apiPath="/api/super-admin/ai/findings"
      columns={[
        { key: 'rule', header: 'Rule', render: (r) => r.rule },
        {
          key: 'entity',
          header: 'Entity',
          render: (r) => `${r.entityType} / ${r.entityId.slice(0, 8)}`,
        },
        {
          key: 'severity',
          header: 'Severity',
          render: (r) => (
            <Badge variant={r.severity === 'critical' ? 'destructive' : 'outline'}>
              {r.severity}
            </Badge>
          ),
        },
        { key: 'score', header: 'Score', render: (r) => r.score ?? '—' },
        { key: 'at', header: 'Detected', render: (r) => r.createdAt },
      ]}
    />
  )
}
