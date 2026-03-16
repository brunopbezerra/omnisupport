'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { useWorkspace, type UserRole } from '@/components/providers/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { redirect } from 'next/navigation'

interface TeamMember {
  id: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  email?: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  agent: 'Agente',
  admin: 'Admin',
  'super-admin': 'Super Admin',
}

const ROLE_VARIANTS: Record<UserRole, 'default' | 'secondary' | 'destructive'> = {
  agent: 'secondary',
  admin: 'default',
  'super-admin': 'destructive',
}

export default function TeamPage() {
  const { currentUser, activeOrgId, loading } = useWorkspace()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('agent')
  const [isInviting, setIsInviting] = useState(false)

  // Redirect agents away
  useEffect(() => {
    if (!loading && currentUser && currentUser.role === 'agent') {
      redirect('/dashboard')
    }
  }, [loading, currentUser])

  const fetchMembers = useCallback(async () => {
    if (!activeOrgId) return
    setLoadingMembers(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('org_id', activeOrgId)
        .order('full_name', { ascending: true })

      if (!error && data) setMembers(data as TeamMember[])
    } finally {
      setLoadingMembers(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!activeOrgId || !inviteEmail.trim()) return

    setIsInviting(true)
    try {
      // Invite via Supabase Auth Admin API (server action or edge function required for production).
      // Here we use the admin inviteUserByEmail which requires service role key on server side.
      // For now, we show a placeholder toast — wire this to a server action or edge function.
      toast.info(`Convite para ${inviteEmail} seria enviado com papel "${ROLE_LABELS[inviteRole]}". Implemente uma Server Action ou Edge Function com a service_role key para chamadas de admin.`)
      setInviteEmail('')
    } finally {
      setIsInviting(false)
    }
  }

  async function handleChangeRole(memberId: string, newRole: UserRole) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) {
      toast.error('Erro ao atualizar papel.')
      return
    }

    toast.success('Papel atualizado.')
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
  }

  async function handleRemove(memberId: string) {
    if (memberId === currentUser?.id) {
      toast.error('Você não pode remover a si mesmo.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ org_id: null })
      .eq('id', memberId)

    if (error) {
      toast.error('Erro ao remover membro.')
      return
    }

    toast.success('Membro removido do workspace.')
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  if (loading) return null

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão de Equipe</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Convide, promova e remova membros do seu workspace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Convidar membro</CardTitle>
          <CardDescription>
            Envie um convite por e-mail para adicionar alguém ao workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
              />
            </div>
            <div className="w-40 space-y-2">
              <Label>Papel</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agente</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isInviting}>
              {isInviting ? 'Enviando…' : 'Convidar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membros</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? 'membro' : 'membros'} no workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingMembers ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(member => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={member.avatar_url ?? ''} />
                          <AvatarFallback className="text-xs">
                            {member.full_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{member.full_name}</p>
                          {member.id === currentUser?.id && (
                            <p className="text-xs text-muted-foreground">Você</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANTS[member.role]}>
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {member.id !== currentUser?.id && member.role !== 'super-admin' && (
                          <>
                            <Select
                              value={member.role}
                              onValueChange={v => handleChangeRole(member.id, v as UserRole)}
                            >
                              <SelectTrigger className="h-8 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="agent">Agente</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemove(member.id)}
                            >
                              Remover
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
