import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias para o cliente do Supabase.'
  )
}

/**
 * Supabase Client para uso em Client Components.
 * 
 * Este cliente deve ser utilizado apenas no lado do cliente (browser).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
