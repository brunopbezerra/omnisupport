'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ImageCropUploader } from '@/components/image-crop-uploader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'

export default function ProfilePage() {
  const { currentUser, refetchUser } = useWorkspace()

  // Initialize directly from currentUser (guaranteed non-null by layout auth guard)
  const [saved, setSaved] = useState(() => ({
    fullName: currentUser?.full_name ?? '',
    avatarUrl: currentUser?.avatar_url || null,
  }))
  const [fullName, setFullName] = useState(() => currentUser?.full_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => currentUser?.avatar_url || null)
  const [isSaving, setIsSaving] = useState(false)

  // Password fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Sync form + saved snapshot when currentUser updates (e.g. after refetchUser)
  useEffect(() => {
    if (currentUser) {
      const snap = { fullName: currentUser.full_name, avatarUrl: currentUser.avatar_url || null }
      setFullName(snap.fullName)
      setAvatarUrl(snap.avatarUrl)
      setSaved(snap)
    }
  }, [currentUser])

  // ─── Dirty detection ────────────────────────────────────────
  const isDirty = useMemo(() => {
    const cleanAvatar = avatarUrl ? avatarUrl.split('?t=')[0] : null
    return fullName !== saved.fullName || cleanAvatar !== saved.avatarUrl
  }, [fullName, avatarUrl, saved])

  const { open, confirm, cancel } = useUnsavedChanges(isDirty)

  // ─── Save profile ────────────────────────────────────────────
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) return
    setIsSaving(true)
    try {
      const persistedAvatar = avatarUrl ? avatarUrl.split('?t=')[0] : null
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), avatar_url: persistedAvatar })
        .eq('id', currentUser.id)
      if (error) throw error
      await refetchUser()
      toast.success('Perfil atualizado com sucesso.')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar perfil.')
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Change password ─────────────────────────────────────────
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('A nova senha deve ter ao menos 8 caracteres.')
      return
    }
    setIsChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Senha alterada com sucesso.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao alterar senha.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const initials = currentUser?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const avatarStoragePath = currentUser?.org_id && currentUser?.id
    ? `${currentUser.org_id}/avatars/${currentUser.id}`
    : null

  return (
    <>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Atualize suas informações pessoais e credenciais de acesso.
            </p>
          </div>
          <Button
            type="submit"
            form="profile-form"
            disabled={!isDirty || isSaving}
            className="shrink-0"
          >
            {isSaving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações pessoais</CardTitle>
            <CardDescription>Seu nome e foto de perfil exibidos no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="profile-form" onSubmit={handleSaveProfile} className="space-y-4">
              {avatarStoragePath && (
                <ImageCropUploader
                  value={avatarUrl}
                  onChange={setAvatarUrl}
                  storagePath={avatarStoragePath}
                  label="Foto de perfil"
                  shape="round"
                  fallback={initials}
                />
              )}
              <div className="space-y-2">
                <Label htmlFor="full-name">Nome completo</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={currentUser?.email ?? ''} disabled />
                <p className="text-xs text-muted-foreground">
                  Para alterar o e-mail, entre em contato com o administrador.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Alterar senha</CardTitle>
            <CardDescription>Escolha uma senha forte com ao menos 8 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? 'Alterando…' : 'Alterar senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancel}>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
