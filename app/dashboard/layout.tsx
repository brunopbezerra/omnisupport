'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  Building03Icon,
  CustomerService01Icon,
  File01Icon,
  InboxIcon,
  Logout01Icon,
  MessageMultiple01Icon,
  Settings01Icon,
  UserIcon,
  UserSettings01Icon,
} from '@hugeicons/core-free-icons'

import { ModeToggle } from '@/components/mode-toggle'
import { WorkspaceSwitcher } from '@/components/workspace-switcher'
import { WorkspaceProvider, useWorkspace } from '@/components/providers/workspace-provider'
import { SidebarHealthMeter } from '@/components/health-ring'
import { useWorkspaceHealth } from '@/hooks/use-workspace-health'
import { supabase } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbLink,
} from '@/components/ui/breadcrumb'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'

// ─── Static nav data ──────────────────────────────────────────
const APP = { name: 'Produtools', description: 'Helpdesk SaaS' } as const

const NAV_MAIN = [
  { label: 'Atendimentos', href: '/dashboard', icon: InboxIcon },
] as const

const NAV_AUTOMATIONS = [
  {
    label: 'Formulários',
    href: '/dashboard/automations/forms',
    icon: File01Icon,
    adminOnly: true,
  },
  {
    label: 'Respostas Automáticas',
    href: null,
    icon: MessageMultiple01Icon,
    adminOnly: true,
  },
] satisfies { label: string; href: string | null; icon: unknown; adminOnly: boolean }[]

const NAV_SETTINGS = [
  {
    label: 'Configurações do Workspace',
    href: '/dashboard/settings/workspace',
    icon: Building03Icon,
    adminOnly: true,
  },
  {
    label: 'Gestão de Equipe',
    href: '/dashboard/settings/team',
    icon: UserSettings01Icon,
    adminOnly: true,
  },
  {
    label: 'Meu Perfil',
    href: '/dashboard/settings/profile',
    icon: UserIcon,
    adminOnly: false,
  },
] as const

// ─── NavItem ──────────────────────────────────────────────────
function NavItem({
  item,
  isActive,
}: {
  item: { label: string; href: string; icon: any }
  isActive: boolean
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={item.href}>
          <HugeiconsIcon icon={item.icon} className="size-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// ─── NavUser (identity + logout only — no profile link) ───────
function NavUser() {
  const router = useRouter()
  const { currentUser } = useWorkspace()

  const name = currentUser?.full_name ?? '...'
  const email = currentUser?.email ?? ''
  const avatar = currentUser?.avatar_url ?? ''
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="size-8 rounded-lg shrink-0">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
            <span className="truncate font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{email}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
            title="Sair"
          >
            <HugeiconsIcon icon={Logout01Icon} className="size-4" />
          </Button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// ─── WorkspaceHealthMeter ─────────────────────────────────────
function WorkspaceHealthMeter() {
  const health = useWorkspaceHealth()
  if (!health) return null
  return <SidebarHealthMeter health={health} />
}

// ─── AppSidebar ───────────────────────────────────────────────
function AppSidebar({ pathname }: { pathname: string }) {
  const { currentUser, activeOrg } = useWorkspace()
  const isSuperAdmin = currentUser?.role === 'super-admin'
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin

  const visibleSettings = NAV_SETTINGS.filter(item => !item.adminOnly || isAdmin)
  const visibleAutomations = NAV_AUTOMATIONS.filter(item => !item.adminOnly || isAdmin)

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        {isSuperAdmin ? (
          <WorkspaceSwitcher />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-primary overflow-hidden shrink-0">
                    {activeOrg?.logo_url ? (
                      <img src={activeOrg.logo_url} alt={activeOrg.name} className="size-full object-cover" />
                    ) : (
                      <HugeiconsIcon icon={CustomerService01Icon} className="size-4 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">{activeOrg?.name ?? APP.name}</span>
                    <span className="text-xs text-muted-foreground">{APP.description}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* ── Atendimento ────────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <HugeiconsIcon icon={CustomerService01Icon} className="size-3.5 mr-1.5" />
            Atendimento
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_MAIN.map(item => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={
                    item.href === '/dashboard'
                      ? pathname === '/dashboard' ||
                        (pathname.startsWith('/dashboard/') &&
                          !pathname.startsWith('/dashboard/settings') &&
                          !pathname.startsWith('/dashboard/automations'))
                      : pathname === item.href || pathname.startsWith(item.href + '/')
                  }
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Automações ─────────────────────────────────── */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <HugeiconsIcon icon={File01Icon} className="size-3.5 mr-1.5" />
              Automações
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAutomations.map(item =>
                  item.href ? (
                    <NavItem
                      key={item.href}
                      item={item as { label: string; href: string; icon: any }}
                      isActive={
                        pathname === item.href || pathname.startsWith(item.href + '/')
                      }
                    />
                  ) : (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton disabled className="opacity-50 cursor-not-allowed">
                        <HugeiconsIcon icon={item.icon as any} className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ── Configurações ──────────────────────────────── */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <HugeiconsIcon icon={Settings01Icon} className="size-3.5 mr-1.5" />
            Configurações
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleSettings.map(item => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <WorkspaceHealthMeter />
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

// ─── Breadcrumb resolution ────────────────────────────────────

interface RouteNode {
  segment: string      // exact segment name, or '*' for any dynamic segment
  label: string
  icon?: any
  href?: string        // explicit link for this crumb (static routes)
  linkable?: boolean   // auto-link using pathSoFar (dynamic segments like [id])
  children?: RouteNode[]
}

/**
 * Declarative route tree.
 * Root is always /dashboard — only sub-paths are listed here.
 * To add a new section, append a node. Dynamic segments use `segment: '*'`.
 */
const ROUTE_TREE: RouteNode[] = [
  {
    segment: 'automations',
    label: 'Automações',
    icon: File01Icon,
    children: [
      {
        segment: 'forms',
        label: 'Formulários',
        href: '/dashboard/automations/forms',
        icon: File01Icon,
        children: [
          {
            segment: '*',
            label: 'Editor',
            linkable: true,
            children: [
              { segment: 'preview', label: 'Preview' },
            ],
          },
        ],
      },
    ],
  },
  {
    segment: 'settings',
    label: 'Configurações',
    icon: Settings01Icon,
    children: [
      { segment: 'workspace', label: 'Workspace', icon: Building03Icon },
      { segment: 'team', label: 'Equipe', icon: UserSettings01Icon },
      { segment: 'profile', label: 'Perfil', icon: UserIcon },
    ],
  },
]

interface BreadcrumbCrumb {
  label: string
  icon?: any
  href?: string
}

function resolveCrumbs(pathname: string): BreadcrumbCrumb[] {
  const relative = pathname.replace(/^\/dashboard\/?/, '')
  if (!relative) return []

  const segments = relative.split('/').filter(Boolean)
  const crumbs: BreadcrumbCrumb[] = []
  let currentNodes = ROUTE_TREE
  let pathSoFar = '/dashboard'

  for (const segment of segments) {
    const match = currentNodes.find(n => n.segment === segment || n.segment === '*')
    if (!match) break

    pathSoFar += `/${segment}`
    crumbs.push({
      label: match.label,
      icon: match.icon,
      href: match.href ?? (match.linkable ? pathSoFar : undefined),
    })
    currentNodes = match.children ?? []
  }

  return crumbs
}

// ─── Inner layout (needs WorkspaceContext) ────────────────────
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, loading } = useWorkspace()

  React.useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login')
    }
  }, [loading, currentUser, router])

  if (loading || !currentUser) {
    return null
  }

  const crumbs = resolveCrumbs(pathname)

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar pathname={pathname} />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <div className="flex aspect-square size-7 items-center justify-center rounded-sm bg-primary">
              <HugeiconsIcon icon={CustomerService01Icon} className="size-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">{APP.name}</span>
          </Link>
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList className="gap-0.5 sm:gap-1">
              {/* Root — always a link */}
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" asChild>
                    <Link href="/dashboard">
                      <HugeiconsIcon icon={CustomerService01Icon} className="size-3.5" />
                      Dashboard
                    </Link>
                  </Button>
                </BreadcrumbLink>
              </BreadcrumbItem>

              {crumbs.map((crumb, idx) => {
                const isLast = idx === crumbs.length - 1
                return (
                  <React.Fragment key={idx}>
                    <BreadcrumbSeparator>
                      <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      {isLast ? (
                        // Active (current page) — non-interactive
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 gap-2 px-2 pointer-events-none"
                          aria-current="page"
                        >
                          {crumb.icon && (
                            <HugeiconsIcon icon={crumb.icon} className="size-3.5" />
                          )}
                          {crumb.label}
                        </Button>
                      ) : crumb.href ? (
                        // Intermediate with a page — clickable link
                        <BreadcrumbLink asChild>
                          <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" asChild>
                            <Link href={crumb.href}>
                              {crumb.icon && (
                                <HugeiconsIcon icon={crumb.icon} className="size-3.5" />
                              )}
                              {crumb.label}
                            </Link>
                          </Button>
                        </BreadcrumbLink>
                      ) : (
                        // Intermediate with no page — plain separator text
                        <span className="text-sm text-muted-foreground px-1">
                          {crumb.label}
                        </span>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6 bg-background min-h-0 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

// ─── Public layout export (wraps with WorkspaceProvider) ──────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </WorkspaceProvider>
  )
}
