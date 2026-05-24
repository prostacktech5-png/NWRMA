'use client'

import { Badge } from '@/components/ui/badge'
import { GenericAdminPage } from '@/components/super-admin/generic-admin-page'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type TaskRow = {
  id: string
  title: string
  status: string
  assigneeUserId: string | null
  dueAt: string | null
}

type SyncRow = {
  id: string
  userId: string | null
  status: string
  errorMessage: string | null
  syncedAt: string
}

export default function SuperAdminFieldOpsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Field operations</h2>
        <p className="text-sm text-muted-foreground">Tasks and mobile sync telemetry.</p>
      </div>
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="sync">Sync logs</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-4">
          <GenericAdminPage<TaskRow>
            title="Field tasks"
            description=""
            apiPath="/api/super-admin/field-ops/tasks"
            columns={[
              { key: 'title', header: 'Title', render: (r) => r.title },
              {
                key: 'status',
                header: 'Status',
                render: (r) => <Badge variant="outline">{r.status}</Badge>,
              },
              { key: 'due', header: 'Due', render: (r) => r.dueAt ?? '—' },
            ]}
          />
        </TabsContent>
        <TabsContent value="sync" className="mt-4">
          <GenericAdminPage<SyncRow>
            title="Sync logs"
            description=""
            apiPath="/api/super-admin/field-ops/sync-logs"
            columns={[
              { key: 'status', header: 'Status', render: (r) => r.status },
              { key: 'user', header: 'User', render: (r) => r.userId ?? '—' },
              { key: 'error', header: 'Error', render: (r) => r.errorMessage ?? '—' },
              { key: 'at', header: 'Synced', render: (r) => r.syncedAt },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
