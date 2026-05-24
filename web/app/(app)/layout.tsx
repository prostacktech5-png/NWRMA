import { AppAuthGate } from '@/components/app-auth-gate'
import { AppShell } from '@/components/app-shell'
import { ReferenceDataProvider } from '@/components/reference-data-provider'
import { RoleHomeRedirect } from '@/components/role-home-redirect'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppAuthGate>
      <RoleHomeRedirect />
      <ReferenceDataProvider>
        <AppShell>{children}</AppShell>
      </ReferenceDataProvider>
    </AppAuthGate>
  )
}
