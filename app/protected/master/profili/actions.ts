'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getPDVList() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    const admin = createAdminClient()
    const { data: pdvList } = await admin
      .from('pdv')
      .select('id, code, name, metratura_mq, status')
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

    const admin = createAdminClient()
    const { data: users } = await admin
      .from('user_profiles')
      .select('id, name, email, pdv:pdv_id(id, code, name, metratura_mq)')
      .eq('role', 'pdv')
      .order('name')

    return { success: true, users: users || [] }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function createPDV(code: string, name: string, metraturaMq: number) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('pdv')
      .insert({ code, name, metratura_mq: metraturaMq, status: 'active' })

    if (error) return { error: error.message }

    revalidatePath('/protected/master/profili')
    return { success: true }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
    if (error) return { error: error.message }

    return { success: true }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function deleteUser(userId: string) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return { error: error.message }

    revalidatePath('/protected/master/profili')
    return { success: true }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function createUser(
  email: string,
  password: string,
  referente: string,
  pdvId: string
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    const admin = createAdminClient()
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) return { error: authError.message }

    const { error: profileError } = await admin
      .from('user_profiles')
      .insert({ id: authUser.user.id, role: 'pdv', name: referente, email, pdv_id: pdvId })
    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id)
      return { error: profileError.message }
    }

    revalidatePath('/protected/master/profili')
    return { success: true }
  } catch (error) {
    return { error: String(error) }
  }
}
