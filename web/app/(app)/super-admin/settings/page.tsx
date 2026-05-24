import { Bell, Settings, Shield, Users } from 'lucide-react'
import { SettingsHubCard } from '@/components/super-admin/settings-hub-card'

const sections = [
  {
    href: '/super-admin/settings/users',
    title: 'User',
    description:
      'Manage users, their profile, status and other user related settings.',
    icon: Users,
    tint: 'blue' as const,
  },
  {
    href: '/super-admin/settings/rbac',
    title: 'RBAC',
    description: 'Manage roles, permissions and role-based access control settings.',
    icon: Shield,
    tint: 'violet' as const,
  },
  {
    href: '/super-admin/settings/general',
    title: 'General',
    description: 'Configure general system settings and preferences.',
    icon: Settings,
    tint: 'green' as const,
  },
  {
    href: '/super-admin/settings/notifications',
    title: 'Notifications',
    description: 'Manage notification preferences and alert settings.',
    icon: Bell,
    tint: 'orange' as const,
  },
]

export default function SuperAdminSettingsHubPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sections.map((section) => (
        <SettingsHubCard key={section.href} {...section} />
      ))}
    </div>
  )
}
