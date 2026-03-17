'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Delete02Icon, File01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useForms } from '@/hooks/use-forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function FormsPage() {
  const router = useRouter()
  const { currentUser, activeOrg } = useWorkspace()
  const { forms, loading, createForm, deleteForm } = useForms()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser && currentUser.role === 'agent') {
      router.replace('/dashboard')
    }
  }, [currentUser, router])

  useEffect(() => {
    if (!slugEdited) setNewSlug(slugify(newTitle))
  }, [newTitle, slugEdited])

  async function handleCreate() {
    if (!newTitle.trim() || !newSlug.trim()) return
    setIsCreating(true)
    try {
      const form = await createForm(newTitle.trim(), newSlug.trim())
      toast.success('Formulário criado')
      setDialogOpen(false)
      setNewTitle('')
      setNewSlug('')
      setSlugEdited(false)
      router.push(`/dashboard/automations/forms/${form.id}`)
    } catch (err) {
      toast.error('Erro ao criar formulário', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteForm(id)
      toast.success('Formulário removido')
    } catch {
      toast.error('Erro ao remover formulário')
    } finally {
      setDeleteId(null)
    }
  }

  function copyUrl(formSlug: string) {
    const base = window.location.origin
    const url = activeOrg?.slug
      ? `${base}/f/${activeOrg.slug}/${formSlug}`
      : `${base}/f/${formSlug}`
    navigator.clipboard.writeText(url)
    toast.success('URL copiada')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Formulários</h1>
          <p className="text-sm text-muted-foreground">
            Crie formulários públicos que geram tickets automaticamente.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <HugeiconsIcon icon={Add01Icon} className="size-4 mr-2" />
          Novo Formulário
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border rounded-lg">
          <HugeiconsIcon icon={File01Icon} className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum formulário criado ainda.</p>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            Criar primeiro formulário
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map(form => (
                <TableRow key={form.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/automations/forms/${form.id}`}
                      className="font-medium hover:underline"
                    >
                      {form.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{form.slug}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={form.status === 'live' ? 'success-muted' : 'outline'}>
                      {form.status === 'live' ? 'Publicado' : 'Rascunho'}
                    </Badge>
                  </TableCell>
                  <TableCell>{form.ticket_count}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(form.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={form.status !== 'live'}
                        onClick={() => copyUrl(form.slug)}
                        className="text-xs"
                      >
                        Copiar URL
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => router.push(`/dashboard/automations/forms/${form.id}`)}
                        aria-label="Editar"
                      >
                        <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(form.id)}
                        aria-label="Excluir"
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* New form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Formulário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Ex: Formulário de Suporte"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (URL pública)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">
                  /f/{activeOrg?.slug ?? '…'}/
                </span>
                <Input
                  value={newSlug}
                  onChange={e => {
                    setSlugEdited(true)
                    setNewSlug(slugify(e.target.value))
                  }}
                  placeholder="formulario-suporte"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || !newSlug.trim() || isCreating}
            >
              {isCreating ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O formulário e todos os seus campos serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
