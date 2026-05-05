'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFascia } from '@/lib/fascia'
import { revalidatePath } from 'next/cache'

export async function uploadClusterProdotti(rows: any[][], categoria: string) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Non autenticato' }

    // rows is raw sheet data (header: 1) - rows[0..2] are headers, rows[3+] are products
    // Col: 0=cod_art, 1=nome, 2=inv_ass, 3=inv_mini, 4=inv_midi, 5=inv_maxi,
    //       6=est_ass, 7=est_mini, 8=est_midi, 9=est_maxi
    const dataRows = rows.slice(3).filter(r => r[1]) // skip header rows, require nome

    const prodotti = dataRows.map((r, i) => ({
      cod_articolo: r[0] ? String(r[0]) : null,
      nome: String(r[1] || '').trim(),
      categoria: categoria.trim(),
      inv_assortimento: String(r[2] || 'NO').trim(),
      inv_mini: r[3] === 'X' || r[3] === 'x',
      inv_midi: r[4] === 'X' || r[4] === 'x',
      inv_maxi: r[5] === 'X' || r[5] === 'x',
      est_assortimento: String(r[6] || 'NO').trim(),
      est_mini: r[7] === 'X' || r[7] === 'x',
      est_midi: r[8] === 'X' || r[8] === 'x',
      est_maxi: r[9] === 'X' || r[9] === 'x',
      ordine: i + 1,
      active: true,
      updated_at: new Date().toISOString(),
    })).filter(p => p.nome)

    const admin = createAdminClient()

    // Deactivate existing products for this category
    await admin.from('cluster_prodotti').update({ active: false }).eq('categoria', categoria.trim())

    // Upsert new products by cod_articolo + categoria (or insert if no cod_articolo)
    const withCode = prodotti.filter(p => p.cod_articolo)
    const withoutCode = prodotti.filter(p => !p.cod_articolo)

    if (withCode.length > 0) {
      const { error } = await admin.from('cluster_prodotti').upsert(withCode, { onConflict: 'cod_articolo,categoria' })
      if (error) return { error: error.message }
    }

    if (withoutCode.length > 0) {
      const { error } = await admin.from('cluster_prodotti').insert(withoutCode)
      if (error) return { error: error.message }
    }

    // Pre-create todo status rows for all active PDVs
    const { data: pdvList } = await admin.from('pdv').select('id').eq('status', 'active')
    const { data: prodottiList } = await admin.from('cluster_prodotti').select('id').eq('active', true).eq('categoria', categoria.trim())

    if (pdvList && prodottiList && pdvList.length > 0 && prodottiList.length > 0) {
      const statusRows = pdvList.flatMap(pdv =>
        prodottiList.map(p => ({ pdv_id: pdv.id, prodotto_id: p.id, status: 'todo' }))
      )
      await admin.from('cluster_pdv_status').upsert(statusRows, { onConflict: 'pdv_id,prodotto_id' })
    }

    revalidatePath('/protected/master/cluster')
    return { success: true, count: prodotti.length }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function getClusterKPI() {
  try {
    const admin = createAdminClient()

    const [{ count: totalProdotti }, { data: pdvList }] = await Promise.all([
      admin.from('cluster_prodotti').select('*', { count: 'exact', head: true }).eq('active', true),
      admin.from('pdv').select('id, code, name, metratura_mq').eq('status', 'active').order('name'),
    ])

    if (!pdvList) return { error: 'Nessun PDV' }

    const { data: allStatuses } = await admin
      .from('cluster_pdv_status').select('pdv_id, status')

    const statusByPdv: Record<string, { done: number; todo: number }> = {}
    for (const s of allStatuses || []) {
      if (!statusByPdv[s.pdv_id]) statusByPdv[s.pdv_id] = { done: 0, todo: 0 }
      if (s.status === 'done') statusByPdv[s.pdv_id].done++
      else statusByPdv[s.pdv_id].todo++
    }

    const pdvData = pdvList.map(pdv => {
      const fascia = pdv.metratura_mq ? getFascia(pdv.metratura_mq) : null
      const stats = statusByPdv[pdv.id] || { done: 0, todo: 0 }
      const total = totalProdotti || 0
      const pct = total > 0 ? Math.round((stats.done / total) * 100) : 0
      return { pdvId: pdv.id, pdvCode: pdv.code, pdvName: pdv.name, fascia, done: stats.done, todo: stats.todo, total, percentage: pct }
    })

    return { success: true, totalProdotti: totalProdotti || 0, pdvList: pdvData }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function getCategorie() {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('cluster_prodotti').select('categoria').eq('active', true)
    const set = new Set((data || []).map(r => r.categoria).filter(Boolean))
    return { success: true, categorie: Array.from(set).sort() }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function getProdottiByCategoria(categoria: string) {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('cluster_prodotti')
      .select('*')
      .eq('active', true)
      .eq('categoria', categoria)
      .order('ordine')
    if (error) return { error: error.message }
    return { success: true, prodotti: data || [] }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function getKPIByCategoria(categoria: string) {
  try {
    const admin = createAdminClient()

    const [{ data: prodotti }, { data: pdvList }] = await Promise.all([
      admin.from('cluster_prodotti').select('id, inv_mini, inv_midi, inv_maxi, est_mini, est_midi, est_maxi')
        .eq('active', true).eq('categoria', categoria),
      admin.from('pdv').select('id, code, name, metratura_mq').eq('status', 'active').order('name'),
    ])

    if (!prodotti || !pdvList) return { error: 'Dati non disponibili' }

    const prodottoIds = prodotti.map(p => p.id)

    const { data: statuses } = prodottoIds.length > 0
      ? await admin.from('cluster_pdv_status').select('pdv_id, prodotto_id, status').in('prodotto_id', prodottoIds)
      : { data: [] }

    // Conteggi prodotti per fascia/stagione
    const conteggiFascia = {
      inv: { MINI: 0, MIDI: 0, MAXI: 0 },
      est: { MINI: 0, MIDI: 0, MAXI: 0 },
    }
    for (const p of prodotti) {
      if (p.inv_mini) conteggiFascia.inv.MINI++
      if (p.inv_midi) conteggiFascia.inv.MIDI++
      if (p.inv_maxi) conteggiFascia.inv.MAXI++
      if (p.est_mini) conteggiFascia.est.MINI++
      if (p.est_midi) conteggiFascia.est.MIDI++
      if (p.est_maxi) conteggiFascia.est.MAXI++
    }

    // Progresso per PDV filtrato sui prodotti di questa categoria
    const statusByPdv: Record<string, Record<string, string>> = {}
    for (const s of statuses || []) {
      if (!statusByPdv[s.pdv_id]) statusByPdv[s.pdv_id] = {}
      statusByPdv[s.pdv_id][s.prodotto_id] = s.status
    }

    const pdvData = pdvList.map(pdv => {
      const fascia = pdv.metratura_mq ? getFascia(pdv.metratura_mq) : null
      const fasciaKey = fascia?.toLowerCase() as 'mini' | 'midi' | 'maxi' | undefined

      // Prodotti rilevanti per questo PDV (quelli nella sua fascia, per entrambe le stagioni)
      const prodottiPdv = fasciaKey
        ? prodotti.filter(p => p[`inv_${fasciaKey}`] || p[`est_${fasciaKey}`])
        : []

      const total = prodottiPdv.length
      const done = prodottiPdv.filter(p => (statusByPdv[pdv.id]?.[p.id] || 'todo') === 'done').length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0

      return { pdvId: pdv.id, pdvCode: pdv.code, pdvName: pdv.name, fascia, done, todo: total - done, total, percentage: pct }
    })

    return { success: true, totalProdotti: prodotti.length, conteggiFascia, pdvList: pdvData }
  } catch (error) {
    return { error: String(error) }
  }
}
