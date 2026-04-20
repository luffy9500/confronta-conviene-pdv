'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getUserPDVId() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('pdv_id, name, pdv:pdv_id(id, code, name)').eq('id', user.id).single()

    if (!profile?.pdv_id) return { error: 'Nessun PDV associato a questo account' }

    const pdv = Array.isArray(profile.pdv) ? profile.pdv[0] : profile.pdv
    return { success: true, pdvId: profile.pdv_id, pdvName: pdv?.name || '', pdvCode: pdv?.code || '', userName: profile.name }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function getCoppieConStatus(pdvId: string) {
  try {
    const admin = createAdminClient()

    const { data: coppie } = await admin
      .from('coppie').select('*').eq('active', true).order('numero')

    const { data: statuses } = await admin
      .from('coppia_pdv_status').select('coppia_id, status').eq('pdv_id', pdvId)

    const statusMap: Record<string, string> = {}
    statuses?.forEach(s => { statusMap[s.coppia_id] = s.status })

    return { success: true, coppie: coppie || [], statusMap }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function updateCoppiaStatus(pdvId: string, coppiaId: string, status: 'todo' | 'done') {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('coppia_pdv_status').upsert(
      { pdv_id: pdvId, coppia_id: coppiaId, status, updated_at: new Date().toISOString() },
      { onConflict: 'pdv_id,coppia_id' }
    )
    if (error) return { error: error.message }
    return { success: true }
  } catch (error) {
    return { error: String(error) }
  }
}
