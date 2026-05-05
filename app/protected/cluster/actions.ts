'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFascia } from '@/lib/fascia'

export async function getUserClusterInfo() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles')
      .select('pdv_id, name, pdv:pdv_id(id, code, name, metratura_mq)')
      .eq('id', user.id)
      .single()

    if (!profile?.pdv_id) return { error: 'Nessun PDV associato a questo account' }

    const pdv = Array.isArray(profile.pdv) ? profile.pdv[0] : profile.pdv
    const mq = pdv?.metratura_mq ?? 0
    const fascia = mq > 0 ? getFascia(mq) : null

    return {
      success: true,
      pdvId: profile.pdv_id,
      pdvName: pdv?.name || '',
      pdvCode: pdv?.code || '',
      fascia,
      userName: profile.name,
    }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function getClusterProdottiConStatus(
  pdvId: string,
  fascia: 'MINI' | 'MIDI' | 'MAXI',
  stagione: 'INV' | 'EST'
) {
  try {
    const admin = createAdminClient()

    const { data: prodotti } = await admin
      .from('cluster_prodotti')
      .select('*')
      .eq('active', true)
      .order('ordine')

    if (!prodotti) return { success: true, prodotti: [], statusMap: {} }

    const fasciaKey = fascia.toLowerCase() as 'mini' | 'midi' | 'maxi'
    const filtered = prodotti.filter(p =>
      stagione === 'INV' ? p[`inv_${fasciaKey}`] === true : p[`est_${fasciaKey}`] === true
    )

    const { data: statuses } = await admin
      .from('cluster_pdv_status')
      .select('prodotto_id, status')
      .eq('pdv_id', pdvId)

    const statusMap: Record<string, string> = {}
    statuses?.forEach(s => { statusMap[s.prodotto_id] = s.status })

    return { success: true, prodotti: filtered, statusMap }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function updateClusterProdottoStatus(
  pdvId: string,
  prodottoId: string,
  status: 'todo' | 'done'
) {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('cluster_pdv_status').upsert(
      { pdv_id: pdvId, prodotto_id: prodottoId, status, updated_at: new Date().toISOString() },
      { onConflict: 'pdv_id,prodotto_id' }
    )
    if (error) return { error: error.message }
    return { success: true }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function getClusterProgress(pdvId: string) {
  try {
    const admin = createAdminClient()
    const { count: total } = await admin
      .from('cluster_prodotti')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
    const { data: statuses } = await admin
      .from('cluster_pdv_status')
      .select('status')
      .eq('pdv_id', pdvId)
    const done = statuses?.filter(s => s.status === 'done').length ?? 0
    return { success: true, total: total ?? 0, done }
  } catch (error) {
    return { error: String(error) }
  }
}
