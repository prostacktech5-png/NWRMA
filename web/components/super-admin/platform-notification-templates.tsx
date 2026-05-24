'use client'

import { Badge } from '@/components/ui/badge'
import { GenericAdminPage } from '@/components/super-admin/generic-admin-page'

type TemplateRow = {
  id: string
  triggerKey: string
  channel: string
  subject: string | null
  enabled: boolean
}

export function PlatformNotificationTemplates() {
  return (
    <GenericAdminPage<TemplateRow>
      title="Notification templates"
      description="Email and SMS templates for platform workflows."
      apiPath="/api/super-admin/notifications/templates"
      columns={[
        { key: 'trigger', header: 'Trigger', render: (r) => r.triggerKey },
        { key: 'channel', header: 'Channel', render: (r) => r.channel },
        { key: 'subject', header: 'Subject', render: (r) => r.subject ?? '—' },
        {
          key: 'on',
          header: 'Enabled',
          render: (r) =>
            r.enabled ? (
              <Badge className="bg-secondary/10 text-secondary">On</Badge>
            ) : (
              <Badge variant="outline">Off</Badge>
            ),
        },
      ]}
    />
  )
}
