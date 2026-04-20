'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPDVList() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    const { data: pdvList } = await supabase
      .from('pdv')
      .select('id, code, name, city, province, metratura_mq, status')
      .order('name')

    return { success: true, pdvList: pdvList || [] }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function getPDVUsers() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, name, role, pdv_id, pdv:pdv_id(id, code, name, city)')
      .eq('role', 'pdv')
      .order('name')

    return { success: true, users: users || [] }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function createPDVUser(email: string, name: string, password: string, pdvId: string) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    if (authError) return { error: authError.message }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({ id: authUser.user.id, role: 'pdv', name, pdv_id: pdvId })

    if (profileError) return { error: profileError.message }

    revalidatePath('/protected/master/profili')
    return { success: true, userId: authUser.user.id }
  } catch (error) {
    return { error: String(error) }
  }
}
