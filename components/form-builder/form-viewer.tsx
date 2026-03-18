'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  SentIcon,
  Loading03Icon,
  CheckmarkCircle01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFormLogic, clearHiddenValues } from '@/hooks/use-form-logic'
import { getContrastColor, getPrimaryHover } from '@/lib/utils'
import type { FormField, FormLogic, FormSettings, FieldMask } from '@/types/forms'

// ─── Mask utilities ────────────────────────────────────────────────────────────

function applyMask(value: string, mask: FieldMask | null | undefined): string {
  if (!mask || mask === 'none') return value
  if (mask === 'phone_br') {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits.replace(/(\d{0,2})/, '($1')
    if (digits.length <= 6) return digits.replace(/(\d{2})(\d{0,4})/, '($1) $2')
    if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
  }
  if (mask === 'date') {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return digits.replace(/(\d{2})(\d{0,2})/, '$1/$2')
    return digits.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3')
  }
  if (mask === 'email') {
    return value.toLowerCase().trim()
  }
  return value
}

function validateMask(value: string, mask: FieldMask | null | undefined): string | null {
  if (!mask || mask === 'none' || !value.trim()) return null
  if (mask === 'phone_br') {
    const digits = value.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 11) return 'Telefone inválido. Use: (11) 99999-9999'
  }
  if (mask === 'date') {
    const parts = value.split('/')
    if (parts.length !== 3 || parts[2].length !== 4) return 'Data inválida. Use: DD/MM/AAAA'
    const [d, m, y] = parts.map(Number)
    const date = new Date(y, m - 1, d)
    if (isNaN(date.getTime()) || date.getDate() !== d || date.getMonth() !== m - 1)
      return 'Data inválida'
  }
  if (mask === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) return 'E-mail inválido'
  }
  if (mask === 'url') {
    try { new URL(value) } catch { return 'URL inválida. Ex: https://exemplo.com' }
  }
  return null
}

// Anonymous client used only for real (non-preview) submissions
const submissionClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

function generateRefToken(prefix = 'REF'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const random = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('')
  return `${prefix}-${random}`
}

// ─── ThankYouPage ─────────────────────────────────────────────────────────────

interface ThankYouPageProps {
  settings: FormSettings
  refToken: string
  isPreview: boolean
}

function ThankYouPage({ settings, refToken, isPreview }: ThankYouPageProps) {
  const [countdown, setCountdown] = useState<number | null>(
    !isPreview && settings.redirect_delay && settings.redirect_delay > 0
      ? settings.redirect_delay
      : null
  )
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (countdown === null || !settings.redirect_url || isPreview) return

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(intervalRef.current!)
          window.location.href = settings.redirect_url!
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current!)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const title = settings.thank_you_title ?? 'Enviado com sucesso!'
  const message =
    settings.thank_you_text ?? 'Sua solicitação foi recebida e será tratada em breve.'
  const ctaLabel = settings.cta_label ?? (settings.redirect_url ? 'Voltar ao início' : null)

  return (
    <div className="flex items-center justify-center p-4 py-16">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader className="space-y-4 pb-4">
          {settings.thank_you_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.thank_you_image_url}
              alt="Confirmação"
              className="mx-auto h-32 w-auto object-contain"
            />
          ) : (
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-10 text-primary" />
              </div>
            </div>
          )}
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">{message}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {isPreview ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
              Preview — nenhum ticket foi criado.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Código de acompanhamento:{' '}
              <code className="font-mono font-medium text-foreground">{refToken}</code>
            </p>
          )}

          {!isPreview && ctaLabel && settings.redirect_url && (
            <Button asChild className="w-full">
              <a href={settings.redirect_url}>
                {ctaLabel}
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 ml-2" />
              </a>
            </Button>
          )}

          {!isPreview && countdown !== null && settings.redirect_url && (
            <p className="text-xs text-muted-foreground">
              Redirecionando em{' '}
              <span className="font-medium text-foreground tabular-nums">{countdown}s</span>…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FormViewerData {
  id: string
  org_id: string
  title: string
  settings: FormSettings
  form_fields: FormField[]
  form_logic: FormLogic[]
}

interface FormViewerProps {
  form: FormViewerData
  orgPrimaryColor?: string | null
  ticketPrefix?: string
  isPreview?: boolean
}

// ─── FormViewer ───────────────────────────────────────────────────────────────

export function FormViewer({
  form,
  orgPrimaryColor,
  ticketPrefix = 'REF',
  isPreview = false,
}: FormViewerProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    // Pre-populate hidden fields default_value
    const defaults: Record<string, string> = {}
    return defaults
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refToken, setRefToken] = useState<string | null>(null)

  const visibilityMap = useFormLogic(form.form_fields, form.form_logic, values)

  // ─── CSS variable injection ─────────────────────────────────────────────────
  useEffect(() => {
    const color = form.settings.primary_color ?? orgPrimaryColor
    if (!color) return

    const root = document.documentElement.style
    const fg = getContrastColor(color)
    const hover = getPrimaryHover(color)
    root.setProperty('--primary', color)
    root.setProperty('--primary-foreground', fg)
    root.setProperty('--primary-hover', hover)
    root.setProperty('--ring', color)

    return () => {
      root.removeProperty('--primary')
      root.removeProperty('--primary-foreground')
      root.removeProperty('--primary-hover')
      root.removeProperty('--ring')
    }
  }, [form.settings.primary_color, orgPrimaryColor])

  // ─── Handlers ──────────────────────────────────────────────────────────────
  function setValue(fieldId: string, raw: string, mask?: FieldMask | null) {
    const masked = applyMask(raw, mask)
    setValues(prev => ({ ...prev, [fieldId]: masked }))
    setErrors(prev => ({ ...prev, [fieldId]: '' }))
  }

  function handleBlurValidate(fieldId: string, value: string, mask?: FieldMask | null) {
    const err = validateMask(value, mask)
    if (err) setErrors(prev => ({ ...prev, [fieldId]: err }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fields = form.form_fields
    const newErrors: Record<string, string> = {}

    for (const field of fields) {
      if (!visibilityMap[field.id]) continue
      if (field.hidden) continue // hidden fields are never validated on submit
      if (field.required && !values[field.id]?.trim()) {
        newErrors[field.id] = 'Este campo é obrigatório'
        continue
      }
      // Mask validation on submit
      const maskErr = validateMask(values[field.id] ?? '', field.mask)
      if (maskErr) newErrors[field.id] = maskErr
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    if (isPreview) {
      await new Promise(r => setTimeout(r, 600))
      toast.success('Sucesso! Em produção, um ticket seria criado com essas respostas.')
      setRefToken('PREVIEW')
      setIsSubmitting(false)
      return
    }

    try {
      const token = generateRefToken(ticketPrefix)
      const ticketId = crypto.randomUUID()
      const messageId = crypto.randomUUID()

      // Build final values: user-entered for visible, default_value for hidden
      const valuesWithHidden = { ...values }
      for (const f of fields) {
        if (f.hidden && f.default_value) {
          valuesWithHidden[f.id] = f.default_value
        }
      }
      const cleanValues = clearHiddenValues(valuesWithHidden, visibilityMap, fields)

      const subjectField = fields.find(f => f.mapping?.target === 'subject')
      const emailField = fields.find(f => f.mapping?.target === 'customer_email')
      const subject = subjectField ? (cleanValues[subjectField.id] ?? '') : form.title
      const customerEmail = emailField ? (cleanValues[emailField.id] ?? '') : ''

      const { error: ticketError } = await submissionClient.from('tickets').insert({
        id: ticketId,
        org_id: form.org_id,
        subject,
        customer_email: customerEmail,
        ref_token: token,
        status: 'open',
        form_id: form.id,
        metadata: { form_id: form.id, fields: cleanValues },
      })

      if (ticketError) throw new Error('Erro ao criar ticket')

      const body = fields
        .filter(f => visibilityMap[f.id])
        .map(f => `**${f.label}:** ${cleanValues[f.id] ?? ''}`)
        .join('\n')

      await submissionClient.from('messages').insert({
        id: messageId,
        ticket_id: ticketId,
        sender_role: 'customer',
        body,
      })

      setRefToken(token)
    } catch {
      setErrors({ _form: 'Erro ao enviar. Tente novamente.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const settings = form.settings
  const fields = form.form_fields

  // ─── Thank You Page ─────────────────────────────────────────────────────────
  if (refToken) {
    return <ThankYouPage settings={settings} refToken={refToken} isPreview={isPreview} />
  }

  // ─── Form ───────────────────────────────────────────────────────────────────
  return (
    <>
      {settings.header_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={settings.header_image_url}
          alt=""
          aria-hidden
          className="w-full max-h-48 object-cover"
        />
      )}

      <div className="flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg">
          <Card className="shadow-lg">
            <CardHeader className="space-y-3 text-center border-b pb-6">
              {settings.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="mx-auto h-10 w-auto object-contain"
                />
              )}
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {form.title}
              </CardTitle>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-6">
                {errors._form && (
                  <p className="text-sm text-destructive">{errors._form}</p>
                )}

                {fields.map(field => {
                  const visible = visibilityMap[field.id] ?? true
                  // Hidden fields: never render, but their default_value is handled at submit time
                  if (field.hidden) return null
                  const error = errors[field.id]
                  const fieldId = `field-${field.id}`

                  return (
                    <div
                      key={field.id}
                      className={`transition-all duration-200 overflow-hidden ${
                        visible
                          ? 'opacity-100 max-h-96'
                          : 'opacity-0 max-h-0 pointer-events-none'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor={fieldId}>
                          {field.label || '(sem título)'}
                          {field.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>

                        {field.type === 'textarea' && (
                          <Textarea
                            id={fieldId}
                            value={values[field.id] ?? ''}
                            onChange={e => setValue(field.id, e.target.value)}
                            className="resize-y min-h-[100px]"
                            disabled={isSubmitting}
                          />
                        )}

                        {(field.type === 'text' || field.type === 'number') && (
                          <Input
                            id={fieldId}
                            type={field.type === 'number' ? 'number' : 'text'}
                            inputMode={field.mask === 'phone_br' || field.mask === 'date' ? 'numeric' : undefined}
                            value={values[field.id] ?? ''}
                            onChange={e => setValue(field.id, e.target.value, field.mask)}
                            onBlur={() => handleBlurValidate(field.id, values[field.id] ?? '', field.mask)}
                            placeholder={
                              field.mask === 'phone_br' ? '(11) 99999-9999'
                              : field.mask === 'date' ? 'DD/MM/AAAA'
                              : field.mask === 'url' ? 'https://'
                              : undefined
                            }
                            disabled={isSubmitting}
                          />
                        )}

                        {field.type === 'select' && (
                          <select
                            id={fieldId}
                            value={values[field.id] ?? ''}
                            onChange={e => setValue(field.id, e.target.value)}
                            disabled={isSubmitting}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Selecione...</option>
                            {field.options.map(opt => (
                              <option key={opt.id} value={opt.label}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {(field.type === 'radio' || field.type === 'checkbox') && (
                          <div className="space-y-2">
                            {field.options.map(opt => (
                              <label
                                key={opt.id}
                                className="flex items-center gap-2 text-sm cursor-pointer"
                              >
                                <input
                                  type={field.type === 'radio' ? 'radio' : 'checkbox'}
                                  name={fieldId}
                                  value={opt.label}
                                  checked={
                                    field.type === 'radio'
                                      ? values[field.id] === opt.label
                                      : (values[field.id] ?? '')
                                          .split(',')
                                          .filter(Boolean)
                                          .includes(opt.label)
                                  }
                                  onChange={() => {
                                    if (field.type === 'radio') {
                                      setValue(field.id, opt.label)
                                    } else {
                                      const current = (values[field.id] ?? '')
                                        .split(',')
                                        .filter(Boolean)
                                      const next = current.includes(opt.label)
                                        ? current.filter(v => v !== opt.label)
                                        : [...current, opt.label]
                                      setValue(field.id, next.join(','))
                                    }
                                  }}
                                  disabled={isSubmitting}
                                  className="accent-primary"
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        )}

                        {error && <p className="text-xs text-destructive">{error}</p>}
                      </div>
                    </div>
                  )
                })}
              </CardContent>

              <div className="px-6 pb-6">
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="size-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={SentIcon} className="size-4 mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {settings.footer_html && (
            <div
              className="mt-6 text-center text-xs text-muted-foreground [&_a]:underline [&_a]:hover:text-foreground"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: settings.footer_html }}
            />
          )}
        </div>
      </div>
    </>
  )
}
