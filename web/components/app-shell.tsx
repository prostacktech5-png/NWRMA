'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import {
  FileText,
  Users,
  Settings,
  Bell,
  Search,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Waves,
  Wallet,
  UserCog,
  Shield,
  ClipboardCheck,
  Inbox,
  BarChart3,
  MapPin,
  Factory,
  LayoutDashboard,
  TestTube,
  Calendar,
  Package,
  Gift,
  CreditCard,
  BellRing,
  Moon,
  Sun,
  Scale,
  ClipboardList,
  ScrollText,
  Megaphone,
  BookOpen,
  FolderOpen,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ErpRequestMenu } from '@/components/erp/erp-request-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from '@/components/theme-provider'
import { useAppBranding } from '@/components/app-branding-provider'
import { BrandingLogoMark } from '@/components/branding-logo'
import {
  canSeeNavAccess,
  canSeeNavItem,
  isOrgWideRole,
  notificationsForViewer,
  type NavAccess,
} from '@/lib/department-scope'
import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import { canManageHydrologicalSettings } from '@/lib/hydro-settings-policy'
import {
  canSeeDepartmentNavChild,
  staffHasAnyDepartmentSectionAccess,
} from '@/lib/department-section-access'
import { useDemoSession, useSessionUser } from '@/components/demo-session-provider'
// useDemoSession also used in Sidebar for super admin nav
import { useErpReference } from '@/components/reference-data-provider'
import { getRoleHomePath } from '@/lib/post-login-redirect'
import {
  BOREHOLES_DEPARTMENT_DISPLAY_NAME,
  HYDROLOGICAL_SERVICES_DEPARTMENT_DISPLAY_NAME,
} from '@/lib/org-departments'

interface NavChild {
  label: string
  href: string
  icon: React.ElementType
  /** When true, only Hydrological HoD / admin sees this link under Hydrological (optional per item). */
  requiresHydrologicalProgrammeSettings?: boolean
}

interface NavItem {
  label: string
  href?: string
  icon: React.ElementType
  access: NavAccess
  children?: NavChild[]
  badge?: number
  /** Highlight when pathname is under this prefix (e.g. `/settings` for `/settings/users`). */
  activePathPrefix?: string
  /**
   * When false and `children` exist, links are always shown with a static section label (no collapse).
   * Default true for grouped sections.
   */
  collapsible?: boolean
  /**
   * When collapsible is false, where the section icon/header navigates (e.g. `/dashboard`).
   * Defaults to the first child `href`.
   */
  overviewHref?: string
  /**
   * With `collapsible: false`, render children inside a contained panel under the header
   * (one grouped block) instead of an indented branch below the section title.
   */
  childrenInset?: boolean
  /** Collapsible group title for org-wide viewers (department name while flat header is "Dashboard"). */
  collapsibleLabel?: string
}

/** White-based utilities — reliable contrast on the brand-blue sidebar in all browsers. */
const sidebarNavRow =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-colors [&_svg]:shrink-0 [&_svg]:text-current'
const sidebarNavChildRow =
  'flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm font-bold transition-colors [&_svg]:shrink-0 [&_svg]:text-current'
const sidebarNavActive = 'bg-white/20 text-white shadow-sm'
const sidebarNavIdle = 'text-white/90 hover:bg-white/15 hover:text-white'
const sidebarNavChildIdle = 'text-white/85 hover:bg-white/15 hover:text-white'

const navigationItems: NavItem[] = [
  {
    label: 'Director General',
    icon: Shield,
    access: 'executive',
    children: [
      { label: 'Approvals', href: '/dg', icon: ClipboardCheck },
      { label: 'Budget Overview', href: '/dg/budget', icon: BarChart3 },
      { label: 'Document sharing', href: '/dg/documents', icon: FolderOpen },
    ],
  },
  {
    label: HYDROLOGICAL_SERVICES_DEPARTMENT_DISPLAY_NAME,
    icon: Waves,
    access: 'hydrological',
    overviewHref: '/hydrological',
    collapsible: false,
    childrenInset: true,
    children: [
      { label: 'Water level reading', href: '/hydrological/readings', icon: BarChart3 },
      { label: 'Flood forecasting', href: '/hydrological/monitoring', icon: MapPin },
      { label: 'Water testing', href: '/hydrological/water-testing', icon: TestTube },
      { label: 'Budget', href: '/hydrological/budget', icon: Wallet },
      {
        label: 'Report',
        href: '/hydrological/budget/reports',
        icon: FileText,
      },
      { label: 'Document sharing', href: '/hydrological/documents', icon: FolderOpen },
      {
        label: 'Application processing unit',
        href: '/hydrological/application-processing-unit',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    label: BOREHOLES_DEPARTMENT_DISPLAY_NAME,
    icon: LayoutDashboard,
    access: 'boreholes',
    overviewHref: '/boreholes',
    children: [
      { label: 'Registry', href: '/boreholes/registry', icon: FileText },
      {
        label: 'Review drilling licence',
        href: '/boreholes/license-applications',
        icon: ClipboardCheck,
      },
      { label: 'Companies', href: '/boreholes/companies', icon: Factory },
      { label: 'Survey123 Borehole data', href: '/boreholes/survey123', icon: Inbox },
      { label: 'Budget', href: '/boreholes/budget', icon: Wallet },
      { label: 'Reports', href: '/boreholes/reports', icon: FileText },
      { label: 'Document sharing', href: '/boreholes/documents', icon: FolderOpen },
    ],
  },
  {
    label: 'Finance',
    icon: Wallet,
    access: 'financial',
    children: [
      { label: 'Officer payments', href: '/finance/payments', icon: Wallet },
      {
        label: 'Bank Receipt Validation Desk',
        href: '/finance/bank-receipt-validation',
        icon: Receipt,
      },
      { label: 'Requisitions', href: '/finance/requisitions', icon: FileText },
      { label: 'Budgets', href: '/finance/budgets', icon: Wallet },
      { label: 'Summary', href: '/finance/summary', icon: BarChart3 },
      { label: 'Reports', href: '/finance/reports', icon: FileText },
      { label: 'Document sharing', href: '/finance/documents', icon: FolderOpen },
    ],
  },
  {
    label: 'Compliance',
    icon: Scale,
    access: 'compliance',
    overviewHref: '/compliance',
    children: [
      { label: 'Dashboard', href: '/compliance', icon: LayoutDashboard },
      {
        label: 'Compliance unit',
        href: '/compliance/compliance-register',
        icon: ClipboardList,
      },
      {
        label: 'Dam safety applications',
        href: '/compliance/dam-safety-applications',
        icon: ClipboardCheck,
      },
      {
        label: 'Effluent discharge applications',
        href: '/compliance/effluent-discharge-applications',
        icon: ClipboardCheck,
      },
      {
        label: 'Water right applications',
        href: '/compliance/water-right-applications',
        icon: ClipboardCheck,
      },
      { label: 'Legal unit', href: '/compliance/legal', icon: Scale },
      { label: 'Communications unit', href: '/compliance/communications', icon: Megaphone },
      { label: 'Regulations library', href: '/compliance/regulations', icon: BookOpen },
      { label: 'Budget', href: '/compliance/budget', icon: Wallet },
      { label: 'Reports', href: '/compliance/reports', icon: FileText },
      { label: 'Document sharing', href: '/compliance/documents', icon: FolderOpen },
    ],
  },
  {
    label: 'HR & Admin',
    icon: UserCog,
    access: 'hr',
    overviewHref: '/hr',
    children: [
      { label: 'Dashboard', href: '/hr', icon: LayoutDashboard },
      { label: 'Staff & Volunteers', href: '/hr/staff', icon: Users },
      { label: 'Assets', href: '/hr/assets', icon: Package },
      { label: 'Payroll', href: '/hr/payroll', icon: CreditCard },
      { label: 'Subscriptions', href: '/hr/subscriptions', icon: BellRing },
      { label: 'Birthdays', href: '/hr/birthdays', icon: Gift },
      { label: 'Leave', href: '/hr/leave', icon: Calendar },
      { label: 'Requisitions', href: '/hr/requisitions', icon: FileText },
      { label: 'Reports', href: '/hr/reports', icon: FileText },
      { label: 'Document sharing', href: '/hr/documents', icon: FolderOpen },
    ],
  },
]

const adminItems: NavItem[] = [
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    access: 'executive',
    activePathPrefix: '/settings',
  },
]

function departmentNavLabel(item: NavItem): string {
  return item.collapsibleLabel ?? item.label
}

function getSuperAdminDepartmentNavItems(): NavItem[] {
  return navigationItems.map((item) => ({
    ...item,
    label: departmentNavLabel(item),
    collapsibleLabel: undefined,
    collapsible: item.collapsible === false ? true : item.collapsible,
    access: 'super_admin',
  }))
}

function isNavChildActive(
  pathname: string,
  childHref: string,
  siblings: { href: string }[],
): boolean {
  const matches = pathname === childHref || pathname.startsWith(`${childHref}/`)
  if (!matches) return false
  return !siblings.some(
    (c) =>
      c.href !== childHref &&
      c.href.length > childHref.length &&
      (pathname === c.href || pathname.startsWith(`${c.href}/`)),
  )
}

const superAdminPlatformLinks: NavItem[] = [
  {
    label: 'Reports',
    href: '/super-admin/reports',
    icon: BarChart3,
    access: 'super_admin',
    activePathPrefix: '/super-admin/reports',
  },
  {
    label: 'Audit & Security',
    href: '/super-admin/audit',
    icon: Shield,
    access: 'super_admin',
    activePathPrefix: '/super-admin/audit',
  },
  {
    label: 'System Settings',
    href: '/super-admin/settings',
    icon: Settings,
    access: 'super_admin',
    activePathPrefix: '/super-admin/settings',
  },
]

function NavSection({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname()
  const { user } = useSessionUser()

  const visibleChildren = useMemo(() => {
    if (item.access === 'super_admin') {
      return item.children ?? []
    }
    return (
      item.children?.filter((child) => {
        if (
          child.requiresHydrologicalProgrammeSettings &&
          !canManageHydrologicalSettings(user)
        ) {
          return false
        }
        if (
          item.access !== 'super_admin' &&
          item.access !== 'executive' &&
          item.access !== 'all' &&
          !canSeeDepartmentNavChild(user, child.href)
        ) {
          return false
        }
        return true
      }) ?? []
    )
  }, [item.access, item.children, user])

  if (
    item.access !== 'super_admin' &&
    item.access !== 'executive' &&
    item.access !== 'all' &&
    !item.href &&
    user.role === 'staff' &&
    normalizeErpDepartmentKey(user.department) === item.access &&
    !staffHasAnyDepartmentSectionAccess(user)
  ) {
    return null
  }

  if (
    item.access !== 'super_admin' &&
    item.access !== 'executive' &&
    item.access !== 'all' &&
    !item.href &&
    visibleChildren.length === 0
  ) {
    return null
  }

  const [isOpen, setIsOpen] = useState(
    visibleChildren.some(
      (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
    ),
  )

  useEffect(() => {
    const active = visibleChildren.some(
      (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
    )
    if (active) setIsOpen(true)
  }, [pathname, visibleChildren])

  const flatSection =
    item.access !== 'super_admin' &&
    (item.collapsible === false ||
      (item.access === 'boreholes' && !isOrgWideRole(user)) ||
      (item.access === 'hr' && !isOrgWideRole(user)) ||
      (item.access === 'compliance' && !isOrgWideRole(user)))

  const childLinks = visibleChildren.map((child) => {
    const isActive = isNavChildActive(pathname, child.href, visibleChildren)
    return (
      <Link
        key={child.href}
        href={child.href}
        className={cn(
          sidebarNavRow,
          isActive ? sidebarNavActive : sidebarNavChildIdle,
        )}
      >
        <child.icon className="h-4 w-4" />
        {!collapsed && <span>{child.label}</span>}
      </Link>
    )
  })

  if (item.href) {
    const isActive =
      pathname === item.href ||
      (item.activePathPrefix != null &&
        (pathname === item.activePathPrefix ||
          pathname.startsWith(`${item.activePathPrefix}/`)))
    return (
      <Link
        href={item.href}
        className={cn(sidebarNavRow, isActive ? sidebarNavActive : sidebarNavIdle)}
      >
        <item.icon className="h-5 w-5" />
        {!collapsed && <span>{item.label}</span>}
        {item.badge && !collapsed && (
          <Badge variant="secondary" className="ml-auto h-5 border-white/30 bg-white/20 px-1.5 text-xs text-white">
            {item.badge}
          </Badge>
        )}
      </Link>
    )
  }

  if (visibleChildren.length && flatSection) {
    const sectionHomeHref =
      item.overviewHref ?? visibleChildren[0]?.href ?? '/hydrological/readings'
    const inDashboard =
      item.overviewHref != null &&
      (item.access === 'boreholes' ||
        item.access === 'hr' ||
        item.access === 'compliance' ||
        item.access === 'hydrological'
        ? pathname === item.overviewHref
        : pathname === item.overviewHref ||
          pathname.startsWith(`${item.overviewHref}/`))
    const inSection =
      inDashboard ||
      visibleChildren.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))
    if (collapsed) {
      return (
        <Link
          href={sectionHomeHref}
          title={item.label}
          className={cn(
            sidebarNavRow,
            'justify-center',
            inSection ? sidebarNavActive : sidebarNavIdle,
          )}
        >
          <item.icon className="h-5 w-5" />
        </Link>
      )
    }
    if (item.childrenInset) {
      return (
        <div
          role="group"
          aria-label={item.label}
          className="rounded-xl border border-white/20 bg-white/10 p-1.5 shadow-sm"
        >
          <Link
            href={sectionHomeHref}
            className={cn(sidebarNavRow, inDashboard ? sidebarNavActive : sidebarNavIdle)}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
          <div className="mt-1 space-y-0.5 rounded-lg border border-white/15 bg-black/10 px-1 py-1">
            {visibleChildren.map((child) => {
              const isActive = isNavChildActive(pathname, child.href, visibleChildren)
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    sidebarNavChildRow,
                    isActive ? sidebarNavActive : sidebarNavChildIdle,
                  )}
                >
                  <child.icon className="h-4 w-4" />
                  <span>{child.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )
    }
    return (
      <div className="space-y-1">
        <Link
          href={sectionHomeHref}
          className={cn(sidebarNavRow, inDashboard ? sidebarNavActive : sidebarNavIdle)}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </Link>
        <div className="ml-3 space-y-0.5 border-l border-white/25 pl-3">{childLinks}</div>
      </div>
    )
  }

  return (
    <Collapsible open={isOpen && !collapsed} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        title={item.collapsibleLabel ?? item.label}
        className={cn(sidebarNavRow, 'w-full', sidebarNavIdle)}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left leading-snug">
              {item.collapsibleLabel ?? item.label}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
      {!collapsed && (
        <CollapsibleContent className="space-y-0.5 pl-4 pt-1">
          {visibleChildren.map((child) => {
            const isActive = pathname === child.href || pathname.startsWith(`${child.href}/`)
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  sidebarNavRow,
                  isActive ? sidebarNavActive : sidebarNavChildIdle,
                )}
              >
                <child.icon className="h-4 w-4" />
                <span>{child.label}</span>
              </Link>
            )
          })}
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { branding } = useAppBranding()
  const { user } = useSessionUser()
  const { canAccessSuperAdmin } = useDemoSession()

  const navOpts = useMemo(() => ({ canAccessSuperAdmin }), [canAccessSuperAdmin])

  const isSuperAdminViewer = canSeeNavAccess(user, 'super_admin', navOpts)

  const mainNav = useMemo(() => {
    if (isSuperAdminViewer) {
      return [...getSuperAdminDepartmentNavItems(), ...superAdminPlatformLinks]
    }
    return navigationItems.filter((item) => canSeeNavItem(user, item, navOpts))
  }, [user, navOpts, isSuperAdminViewer])
  const showSettingsSidebarGroup = useMemo(() => {
    if (isSuperAdminViewer) return false
    const hasExecSettings = adminItems.some((item) => canSeeNavAccess(user, item.access, navOpts))
    if (hasExecSettings) return true
    if (isOrgWideRole(user)) return false
    if (user.role === 'hod') return true
    if (canManageHydrologicalSettings(user)) return true
    return false
  }, [user, navOpts, isSuperAdminViewer])

  const settingsSidebarLink = useMemo((): NavItem | null => {
    if (!showSettingsSidebarGroup) return null
    return {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      access: 'all',
      activePathPrefix: '/settings',
    }
  }, [showSettingsSidebarGroup])

  const roleHomeHref = useMemo(
    () => getRoleHomePath(user, { canAccessSuperAdmin }),
    [user, canAccessSuperAdmin]
  )

  return (
    <div
      data-app-sidebar
      className={cn(
        'flex h-full min-h-0 flex-col border-r border-sidebar-border bg-sidebar text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link href={roleHomeHref} className="flex min-w-0 items-center gap-2">
          <BrandingLogoMark branding={branding} className="h-8 w-8" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="block truncate text-lg font-bold text-white">
                {branding.appName}
              </span>
              {branding.slogan ? (
                <span className="block truncate text-xs font-bold text-white/80">
                  {branding.slogan}
                </span>
              ) : null}
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-white/90 hover:bg-white/15 hover:text-white"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Main nav + settings/admin links (scroll together; avoids empty gap above a pinned footer) */}
      <ScrollArea className="min-h-0 flex-1 px-3 py-4">
        <nav className="space-y-1 text-white">
          {mainNav.map((item, index) => (
            <NavSection
              key={item.href ?? `nav-${item.label}-${index}`}
              item={item}
              collapsed={collapsed}
            />
          ))}
          {settingsSidebarLink && (
            <>
              <div className="my-2 border-t border-white/25" aria-hidden />
              <NavSection
                key="footer-settings-link"
                item={settingsSidebarLink}
                collapsed={collapsed}
              />
            </>
          )}
        </nav>
      </ScrollArea>
    </div>
  )
}

function TopBar() {
  const { setTheme, resolvedTheme } = useTheme()
  const { user } = useSessionUser()
  const { setSessionUser, refreshSession } = useDemoSession()
  const queryClient = useQueryClient()
  const erpRef = useErpReference()
  const scopedNotifications = notificationsForViewer(user, erpRef.data.notifications)
  const unreadNotifications = scopedNotifications.filter((n) => !n.read).length

  const syncHeaderData = () => {
    void refreshSession()
    void queryClient.invalidateQueries({ queryKey: ['erp-reference-data'] })
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative hidden w-full max-w-sm lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ErpRequestMenu />
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu
          onOpenChange={(open) => {
            if (open) syncHeaderData()
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                  {unreadNotifications}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {scopedNotifications.slice(0, 5).map((notif) => (
              <DropdownMenuItem key={notif.id} className="flex flex-col items-start gap-1 p-3">
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="font-medium">{notif.title}</span>
                  {!notif.read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{notif.message}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu
          onOpenChange={(open) => {
            if (open) syncHeaderData()
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user.name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="hidden font-medium lg:inline-block">
                {user.name.split(' ')[0]}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile" className="flex cursor-pointer items-center">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'same-origin',
                  })
                } finally {
                  setSessionUser(null)
                  window.location.href = '/'
                }
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar — min-h-0 so nested sidebar scroll regions respect viewport */}
      <div className="hidden h-full min-h-0 shrink-0 lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="m-2"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
