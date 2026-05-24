'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionUser } from '@/components/demo-session-provider'
import { departmentNames } from '@/lib/mock-data'

export default function SettingsProfilePage() {
  const { user } = useSessionUser()
  const deptLabel =
    user.department != null ? departmentNames[user.department] ?? user.department : '—'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">Your account details as they appear in the ERP.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signed-in user</CardTitle>
          <CardDescription>Name, email, role, and department for this session.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-lg text-primary-foreground">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Display name</dt>
              <dd className="font-medium text-foreground">{user.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium text-foreground">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium uppercase text-foreground">{user.role}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Department</dt>
              <dd className="font-medium text-foreground">{deptLabel}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                  {user.status}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
