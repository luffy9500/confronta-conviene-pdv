'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getFullReport() {
  try {
    const admin = createAdminClient()

    const { data: coppie } = await admin
      .from('coppie').select('id, numero, area, name_coop, ean_coop, price_coop, name_idm, ean_idm, price_idm')
      .eq('active', true).order('numero')

    const { data: pdvList } = await admin
      .from('pdv').select('id, code, name').eq('status', 'active').order('name')

    const { data: statuses } = await admin
      .from('coppia_pdv_status').select('pdv_id, coppia_id, status')

    if (!coppie || !pdvList) return { error: 'Dati non disponibili' }

    const statusMap: Record<string, Record<string, string>> = {}
    for (const s of statuses || []) {
      if (!statusMap[s.pdv_id]) statusMap[s.pdv_id] = {}
      statusMap[s.pdv_id][s.coppia_id] = s.status
    }

    const rows: any[] = []
    for (const pdv of pdvList) {
      for (const c of coppie) {
        const stato = (statusMap[pdv.id]?.[c.id] || 'todo') === 'done' ? 'Fatta' : 'Non fatta'
        rows.push({
          'Codice PDV': pdv.code,
          'Nome PDV': pdv.name,
          'N° Coppia': c.numero,
          'Area': c.area || '',
          'Nome COOP': c.name_coop || '',
          'EAN COOP': c.ean_coop || '',
          'Prezzo COOP': c.price_coop ?? '',
          'Nome IDM': c.name_idm || '',
          'EAN IDM': c.ean_idm || '',
          'Prezzo IDM': c.price_idm ?? '',
          'Stato': stato,
        })
      }
    }

    return { success: true, rows }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function getCoppieCount() {
  try {
    const admin = createAdminClient()
    const { count } = await admin.from('coppie').select('*', { count: 'exact' }).eq('active', true)
    return { success: true, count: count || 0 }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function uploadCoppie(data: any[]) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    const admin = createAdminClient()

    // Trova la colonna prezzo dinamicamente (contiene "PREZZO")
    const priceKey = data[0] ? Object.keys(data[0]).find(k => k.toUpperCase().includes('PREZZO')) || 'PREZZO' : 'PREZZO'

    // Accoppia le righe COOP + IDM per numero coppia
    const coppieMap: Record<number, any> = {}
    for (const row of data) {
      const num = Number(row['COPPIA'])
      if (!num) continue
      if (!coppieMap[num]) coppieMap[num] = { numero: num }
      const marchio = String(row['MARCHIO'] || '').trim().toUpperCase()
      const area = String(row['Area'] || '').trim().toUpperCase()
      if (marchio === 'COOP') {
        coppieMap[num].area = area
        coppieMap[num].articolo_id_coop = String(row['Articolo ID'] || '')
        coppieMap[num].ean_coop = String(row['EAN'] || '')
        coppieMap[num].name_coop = String(row['Articolo DESC'] || '').trim()
        coppieMap[num].price_coop = parseFloat(row[priceKey]) || 0
        coppieMap[num].forte = row['FORTE'] === 'SI'
      } else if (marchio === 'IDM') {
        coppieMap[num].articolo_id_idm = String(row['Articolo ID'] || '')
        coppieMap[num].ean_idm = String(row['EAN'] || '')
        coppieMap[num].name_idm = String(row['Articolo DESC'] || '').trim()
        coppieMap[num].price_idm = parseFloat(row[priceKey]) || 0
      }
    }

    const coppieData = Object.values(coppieMap).map(c => ({
      numero: c.numero,
      area: c.area || '',
      articolo_id_coop: c.articolo_id_coop || '',
      ean_coop: c.ean_coop || '',
      name_coop: c.name_coop || '',
      price_coop: c.price_coop || 0,
      articolo_id_idm: c.articolo_id_idm || '',
      ean_idm: c.ean_idm || '',
      name_idm: c.name_idm || '',
      price_idm: c.price_idm || 0,
      forte: c.forte || false,
      active: true,
      updated_at: new Date().toISOString(),
    }))

    const { error: upsertError } = await admin
      .from('coppie')
      .upsert(coppieData, { onConflict: 'numero' })
    if (upsertError) return { error: upsertError.message }

    // Pre-crea righe status todo per ogni PDV attivo
    const { data: pdvList } = await admin.from('pdv').select('id').eq('status', 'active')
    const { data: coppieList } = await admin.from('coppie').select('id')

    if (pdvList && coppieList && pdvList.length > 0) {
      const statusRows = pdvList.flatMap(pdv =>
        coppieList.map(coppia => ({ pdv_id: pdv.id, coppia_id: coppia.id, status: 'todo' }))
      )
      await admin.from('coppia_pdv_status').upsert(statusRows, { onConflict: 'pdv_id,coppia_id' })
    }

    revalidatePath('/protected/master/confronta-conviene')
    return { success: true, count: coppieData.length }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function getKPINetwork() {
  try {
    const admin = createAdminClient()

    const { count: totalCoppie } = await admin
      .from('coppie').select('*', { count: 'exact' }).eq('active', true)

    const { data: pdvList } = await admin
      .from('pdv').select('id, code, name').eq('status', 'active')

    if (!pdvList) return { error: 'Nessun PDV' }

    const kpiData = await Promise.all(
      pdvList.map(async (pdv) => {
        const { count: done } = await admin
          .from('coppia_pdv_status').select('*', { count: 'exact' })
          .eq('pdv_id', pdv.id).eq('status', 'done')

        const total = totalCoppie || 0
        const doneN = done || 0
        const percentage = total > 0 ? Math.round((doneN / total) * 100) : 0

        return { pdvId: pdv.id, pdvCode: pdv.code, pdvName: pdv.name, done: doneN, todo: total - doneN, total, percentage }
      })
    )

    const totalDone = kpiData.reduce((acc, k) => acc + k.done, 0)
    const totalExpected = (totalCoppie || 0) * pdvList.length
    const networkPercentage = totalExpected > 0 ? Math.round((totalDone / totalExpected) * 100) : 0

    return {
      success: true,
      network: { totalCoppie, totalDone, totalTodo: totalExpected - totalDone, networkPercentage, pdvCount: pdvList.length },
      pdvList: kpiData,
    }
  } catch (error) {
    return { error: String(error) }
  }
}
