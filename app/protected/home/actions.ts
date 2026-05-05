'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

export async function getPDVProgress(pdvId: string) {
  try {
    const admin = createAdminClient()

    const [{ count: total }, { data: statuses }] = await Promise.all([
      admin.from('coppie').select('*', { count: 'exact', head: true }).eq('active', true),
      admin.from('coppia_pdv_status').select('status').eq('pdv_id', pdvId),
    ])

    const done = statuses?.filter(s => s.status === 'done').length ?? 0
    return { success: true, total: total ?? 0, done }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function getClusterProgress(pdvId: string) {
  try {
    const admin = createAdminClient()

    const [{ count: total }, { data: statuses }] = await Promise.all([
      admin.from('cluster_prodotti').select('*', { count: 'exact', head: true }).eq('active', true),
      admin.from('cluster_pdv_status').select('status').eq('pdv_id', pdvId),
    ])

    const done = statuses?.filter(s => s.status === 'done').length ?? 0
    return { success: true, total: total ?? 0, done }
  } catch (error) {
    return { error: String(error) }
  }
}
