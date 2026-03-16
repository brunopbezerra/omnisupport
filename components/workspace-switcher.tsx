'use client'

import { useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpDownIcon } from '@hugeicons/core-free-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useAllOrgsHealth } from '@/hooks/use-workspace-health'
import { HealthRingMini } from '@/components/health-ring'
import { HEALTH_LEVEL_LABEL } from '@/lib/health-score'

export function WorkspaceSwitcher() {
  const { activeOrg, allOrgs, setActiveOrgId } = useWorkspace()
  const orgHealth = useAllOrgsHealth()

  // Sort: critical first so struggling customers surface at the top
  const sortedOrgs = useMemo(() => {
    if (Object.keys(orgHealth).length === 0) return allOrgs
    return [...allOrgs].sort((a, b) => {
      const scoreA = orgHealth[a.id]?.score ?? 100
      const scoreB = orgHealth[b.id]?.score ?? 100
      return scoreA - scoreB
    })
  }, [allOrgs, orgHealth])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-primary overflow-hidden shrink-0">
                {activeOrg?.logo_url ? (
                  <img src={activeOrg.logo_url} alt={activeOrg.name} className="size-full object-cover" />
                ) : (
                  <span className="text-primary-foreground text-xs font-bold">
                    {activeOrg?.name?.slice(0, 2).toUpperCase() ?? '??'}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 leading-none min-w-0">
                <span className="font-semibold truncate">{activeOrg?.name ?? 'Sem workspace'}</span>
                <span className="text-xs text-muted-foreground truncate">{activeOrg?.slug ?? ''}</span>
              </div>
              <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-auto size-4 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Workspaces
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortedOrgs.map(org => {
              const health = orgHealth[org.id]
              return (
                <DropdownMenuItem
                  key={org.id}
                  onSelect={() => setActiveOrgId(org.id)}
                  className="gap-2 pr-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm bg-primary overflow-hidden shrink-0">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.name} className="size-full object-cover" />
                    ) : (
                      <span className="text-primary-foreground text-xs font-bold">
                        {org.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate text-sm">{org.name}</span>
                    {health && (
                      <span className="text-[10px] text-muted-foreground">
                        {HEALTH_LEVEL_LABEL[health.level]}
                      </span>
                    )}
                  </div>
                  {health ? (
                    <HealthRingMini score={health.score} level={health.level} />
                  ) : org.id === activeOrg?.id ? (
                    <span className="text-xs text-muted-foreground">ativo</span>
                  ) : null}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
