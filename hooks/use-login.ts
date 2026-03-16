'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function useLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const validate = () => {
    let isValid = true
    setEmailError('')
    setPasswordError('')

    if (!email) {
      setEmailError('O e-mail é obrigatório.')
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Insira um e-mail válido.')
      isValid = false
    }

    if (!password) {
      setPasswordError('A senha é obrigatória.')
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      if (data.user) {
        toast.success('Login realizado com sucesso!')
        router.push('/dashboard')
      }
    } catch (error: any) {
      toast.error('Falha ao entrar', {
        description: error.message || 'Verifique suas credenciais e tente novamente.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return {
    email, setEmail,
    password, setPassword,
    isLoading,
    emailError, passwordError,
    handleSubmit
  }
}
