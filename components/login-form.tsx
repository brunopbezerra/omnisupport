'use client'

import { Headset, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useLogin } from '@/hooks/use-login'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { 
    email, setEmail, 
    password, setPassword, 
    isLoading, 
    emailError, passwordError, 
    handleSubmit 
  } = useLogin()

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Headset className="size-6" />
              </div>
            </div>
            <h1 className="text-xl font-bold mt-2">Bem-vindo à OmniSupport</h1>
            <p className="text-sm text-muted-foreground">
              Acesse sua conta para gerenciar os atendimentos.
            </p>
          </div>

          <Field>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <div className="space-y-1">
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className={emailError ? 'border-destructive focus-visible:ring-destructive/30' : ''}
              />
              {emailError && <p className="text-xs font-medium text-destructive">{emailError}</p>}
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <div className="space-y-1">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className={passwordError ? 'border-destructive focus-visible:ring-destructive/30' : ''}
              />
              {passwordError && <p className="text-xs font-medium text-destructive">{passwordError}</p>}
            </div>
          </Field>

          <Field className="mt-2">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
