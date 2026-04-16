'use server'

import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SignInSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Password minimo 6 caratteri')
})

export async function signInWithEmail(email: string, password: string) {
  try {
    const validated = SignInSchema.parse({ email, password })
    const supabase = await createServerClient()

    const { error, data } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password
    })

    if (error) {
      return { error: 'Email o password non validi' }
    }

    return { success: true, userId: data.user?.id }
  } catch {
    return { error: "Errore durante l'accesso" }
  }
}
