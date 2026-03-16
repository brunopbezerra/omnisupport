'use client'

import { useState, useRef, useCallback, DragEvent } from 'react'
import { useParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { UploadCloud, Trash2, FileText, Send, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

// --- Constantes de limite ---
const MAX_FILES = 5
const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

// --- Helper: formata bytes em KB ou MB ---
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// --- Helper: gera o ref_token único do ticket (ex: "REF-A3X9K2") ---
function generateRefToken(prefix: string = 'REF'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const random = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('')
  return `${prefix}-${random}`
}

// --- Tipo das props da página dinâmica do App Router ---
export default function PublicTicketForm() {
  const params = useParams()
  const slug = params.slug as string

  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Validação e adição de arquivos ao estado ---
  const addFiles = useCallback((incoming: File[]) => {
    setFileError(null)
    const errors: string[] = []

    const validBySize = incoming.filter((f) => {
      if (f.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`"${f.name}" excede ${MAX_FILE_SIZE_MB}MB.`)
        return false
      }
      return true
    })

    setFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}`))
      const unique = validBySize.filter((f) => !existingKeys.has(`${f.name}-${f.size}`))
      const combined = [...prev, ...unique]

      if (combined.length > MAX_FILES) {
        errors.push(`Limite de ${MAX_FILES} arquivos atingido. Os excedentes foram ignorados.`)
        if (errors.length > 0) setFileError(errors.join(' '))
        return prev.slice(0, MAX_FILES)
      }

      if (errors.length > 0) setFileError(errors.join(' '))
      return combined
    })

    if (errors.length > 0) setFileError(errors.join(' '))
  }, [])

  const removeFile = (index: number) => {
    setFileError(null)
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // --- Handlers da Dropzone ---
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length) addFiles(dropped)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  // --- Lógica de Submissão ao Supabase ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 1. Identifica a organização pelo slug
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, ticket_prefix')
        .eq('slug', slug)
        .single()

      if (orgError || !org) {
        throw new Error(`Empresa com slug "${slug}" não encontrada.`)
      }

      // 2. Cria o ticket — UUID gerado no cliente para evitar SELECT após INSERT
      const refToken = generateRefToken(org.ticket_prefix ?? 'REF')
      const ticketId = crypto.randomUUID()

      const { error: ticketError } = await supabase
        .from('tickets')
        .insert({
          id: ticketId,
          org_id: org.id,
          subject,
          customer_email: email,
          ref_token: refToken,
          status: 'open',
        })

      if (ticketError) {
        throw new Error('Falha ao criar o ticket. Tente novamente.')
      }

      // 3. Cria a mensagem inicial — UUID gerado no cliente
      const messageId = crypto.randomUUID()

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          ticket_id: ticketId,
          sender_role: 'customer',
          body: message,
        })

      if (messageError) {
        throw new Error('Ticket criado, mas falha ao salvar a mensagem.')
      }

      // 4. Upload e registro dos anexos (se houver)
      if (files.length > 0) {
        for (const file of files) {
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
          const filePath = `${org.id}/${ticketId}/${Date.now()}_${sanitizedName}`

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file, { upsert: false })

          if (uploadError) {
            toast.warning(`Falha ao enviar "${file.name}". Os outros arquivos foram processados.`)
            continue
          }

          // Registra o anexo na tabela attachments
          await supabase.from('attachments').insert({
            message_id: messageId,
            file_path: filePath,
            file_name: file.name,
            file_type: file.type || null,
            file_size: file.size,
          })
        }
      }

      // 5. Sucesso: feedback e reset do formulário
      toast.success('Solicitação enviada com sucesso!', {
        description: `Seu ticket foi aberto com o código ${refToken}. Entraremos em contato em breve.`,
        duration: 8000,
      })

      setEmail('')
      setSubject('')
      setMessage('')
      setFiles([])
      setFileError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.'
      toast.error('Não foi possível enviar a solicitação.', {
        description: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center border-b pb-6">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Suporte da Empresa
            </CardTitle>
            <CardDescription>
              Abra um ticket informando os detalhes abaixo. Retornaremos o seu contato em breve.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">

              {/* E-mail */}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Assunto */}
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="Informe o motivo do contato..."
                  required
                  disabled={isSubmitting}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Mensagem */}
              <div className="space-y-2">
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  placeholder="Descreva detalhadamente a sua solicitação..."
                  required
                  disabled={isSubmitting}
                  className="min-h-[120px] resize-y"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {/* Dropzone de Anexos */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Label>Anexos (Opcional)</Label>
                  <span className="text-xs text-muted-foreground">
                    {files.length}/{MAX_FILES} arquivo(s) · máx. {MAX_FILE_SIZE_MB}MB cada
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileInputChange}
                  aria-label="Selecionar arquivos para upload"
                  disabled={files.length >= MAX_FILES || isSubmitting}
                />

                <div
                  role="button"
                  tabIndex={files.length >= MAX_FILES || isSubmitting ? -1 : 0}
                  onClick={() =>
                    !isSubmitting && files.length < MAX_FILES && fileInputRef.current?.click()
                  }
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    !isSubmitting &&
                    files.length < MAX_FILES &&
                    fileInputRef.current?.click()
                  }
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  aria-disabled={files.length >= MAX_FILES || isSubmitting}
                  className={`
                    flex flex-col items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed
                    px-6 py-8 transition-colors duration-200
                    ${files.length >= MAX_FILES || isSubmitting
                      ? 'cursor-not-allowed opacity-50 border-border bg-muted/30'
                      : isDragging
                        ? 'cursor-copy border-primary bg-primary/10'
                        : 'cursor-pointer border-border bg-muted/50 hover:bg-accent hover:border-primary/50'
                    }
                  `}
                >
                  <UploadCloud
                    className={`h-8 w-8 transition-colors duration-200 ${
                      isDragging ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {files.length >= MAX_FILES
                        ? 'Limite de arquivos atingido'
                        : 'Clique ou arraste os arquivos aqui'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Qualquer tipo de arquivo é aceito
                    </p>
                  </div>
                </div>

                {/* Mensagem de erro de validação */}
                {fileError && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{fileError}</span>
                  </div>
                )}

                {/* Lista de arquivos — cresce com o conteúdo, rola ao atingir o limite de MAX_FILES */}
                {files.length > 0 && (
                  <div className="max-h-[220px] w-full overflow-y-auto rounded-md border border-border">
                    <ul className="space-y-1.5 p-2">
                      {files.map((file, index) => (
                        <li
                          key={`${file.name}-${file.size}-${index}`}
                          className="flex w-full items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                        >
                          {/* Bloco esquerdo: ícone + nome truncado */}
                          <div className="flex flex-1 min-w-0 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate min-w-0 font-medium text-foreground">
                              {file.name}
                            </span>
                          </div>

                          {/* Bloco direito: tamanho + lixeira */}
                          <div className="flex shrink-0 items-center gap-2 pl-3">
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </span>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFile(index)
                              }}
                              aria-label={`Remover ${file.name}`}
                              className="rounded-sm p-1 transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Solicitação
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
