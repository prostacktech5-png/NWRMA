'use client'

import { useState } from 'react'
import { Key, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GenericAdminPage } from '@/components/super-admin/generic-admin-page'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { resolvedApiUrl } from '@/lib/apiBase'

type ApiKeyRow = {
  id: string
  name: string
  keyPrefix: string
  rateLimitPerMin: number
  createdAt: string
}

export default function SuperAdminIntegrationsPage() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const createKey = async () => {
    const res = await fetch(resolvedApiUrl('/api/super-admin/integrations/api-keys'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (res.ok) {
      setCreatedKey(data.apiKey ?? null)
      setRefreshKey((k) => k + 1)
    }
  }

  return (
    <div className="space-y-6" key={refreshKey}>
      <GenericAdminPage<ApiKeyRow>
        title="API keys"
        description="Integration keys for external systems."
        apiPath="/api/super-admin/integrations/api-keys"
        toolbar={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Create API key
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              {createdKey ? (
                <p className="rounded border border-warning/30 bg-warning/5 p-2 font-mono text-xs break-all">
                  Copy now: {createdKey}
                </p>
              ) : null}
              <DialogFooter>
                <Button onClick={() => void createKey()}>
                  <Loader2 className="mr-2 h-4 w-4 hidden" />
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
        columns={[
          { key: 'name', header: 'Name', render: (r) => r.name },
          { key: 'prefix', header: 'Prefix', render: (r) => r.keyPrefix },
          { key: 'limit', header: 'Rate/min', render: (r) => r.rateLimitPerMin },
          { key: 'created', header: 'Created', render: (r) => r.createdAt },
        ]}
      />
    </div>
  )
}
