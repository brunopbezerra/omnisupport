'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CheckCircle2,
  ChevronsUpDown,
  Inbox,
  LogOut,
  Settings,
  User,
  Users,
  Headset,
} from 'lucide-react'

import { ModeToggle } from '@/components/mode-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbLink,
} from '@/components/ui/breadcrumb'
import { ChevronRight } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
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

// --- Dados estáticos do Backoffice de Helpdesk ---

const APP = {
  name: 'Produtools',
  description: 'Helpdesk SaaS',
} as const

const NAV_MAIN = [
  {
    label: 'Caixa de Entrada',
    href: '/dashboard/inbox',
    icon: Inbox,
  },
  {
    label: 'Resolvidos',
    href: '/dashboard/resolved',
    icon: CheckCircle2,
  },
  {
    label: 'Clientes',
    href: '/dashboard/customers',
    icon: Users,
  },
] as const

const NAV_FOOTER = [
  {
    label: 'Configurações',
    href: '/dashboard/settings',
    icon: Settings,
  },
] as const

const MOCK_USER = {
  name: 'Admin Produtools',
  email: 'admin@produtools.com',
  avatar: '',
} as const

// --- Sub-componente: Logo na sidebar ---
function SidebarLogo() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href="/dashboard">
            <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-primary">
              <Headset className="size-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-semibold">{APP.name}</span>
              <span className="text-xs text-muted-foreground">{APP.description}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// --- Sub-componente: Item de navegação ---
function NavItem({
  item,
  isActive,
}: {
  item: { label: string; href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }
  isActive: boolean
}) {
  const Icon = item.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={item.href}>
          <Icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// --- Sub-componente: Usuário no footer com dropdown ---
function NavUser() {
  const initials = MOCK_USER.name
    .split(' ')
    .map((n) => n[0])
    .join('')

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src={MOCK_USER.avatar} alt={MOCK_USER.name} />
                <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{MOCK_USER.name}</span>
                <span className="truncate text-xs text-muted-foreground">{MOCK_USER.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="top"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src={MOCK_USER.avatar} alt={MOCK_USER.name} />
                  <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{MOCK_USER.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{MOCK_USER.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 size-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// --- Sub-componente: Sidebar principal ---
function AppSidebar({ pathname }: { pathname: string }) {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>

      <SidebarContent>
        {/* Navegação principal */}
        <SidebarGroup>
          <SidebarGroupLabel>Atendimento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_MAIN.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navegação de rodapé (dentro da sidebar) */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_FOOTER.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

// --- Componente principal: Layout do Dashboard ---
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Gera o breadcrumb a partir da rota ativa
  const activeNavItem =
    [...NAV_MAIN, ...NAV_FOOTER].find(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    ) ?? { label: 'Dashboard', href: '/dashboard' }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar pathname={pathname} />
      <SidebarInset>
        {/* Header Global */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          {/* Logo mobile (visível quando sidebar fechada) */}
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <div className="flex aspect-square size-7 items-center justify-center rounded-sm bg-primary">
              <Headset className="size-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">{APP.name}</span>
          </Link>
          {/* Breadcrumb (desktop) */}
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList className="gap-0.5 sm:gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" asChild>
                    <Link href="/dashboard">
                      <Headset className="size-3.5" />
                      Dashboard
                    </Link>
                  </Button>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {activeNavItem.label !== 'Dashboard' && (
                <>
                  <BreadcrumbSeparator>
                    <ChevronRight className="size-3.5" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage asChild>
                      <Button variant="secondary" size="sm" className="h-8 gap-2 px-2 pointer-events-none">
                        {activeNavItem.icon && <activeNavItem.icon className="size-3.5" />}
                        {activeNavItem.label}
                      </Button>
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>

        {/* Área principal — recebe os children das páginas */}
        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6 bg-slate-50/50 dark:bg-background min-h-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
