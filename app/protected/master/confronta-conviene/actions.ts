'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// UPLOAD COPPIE (UPSERT da Excel)
// ============================================
export async function uploadCoppie(data: any[]) {
  try {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    // UPSERT coppie
    const coppieData = data.map((row: any, idx: number) => ({
      numero: row.numero || idx + 1,
      area: row.area || '',
      ean_coop: row.ean_coop || '',
      name_coop: row.name_coop || '',
      img_coop: row.img_coop || '',
      price_coop: parseFloat(row.price_coop) || 0,
      ean_idm: row.ean_idm || '',
      name_idm: row.name_idm || '',
      img_idm: row.img_idm || '',
      price_idm: parseFloat(row.price_idm) || 0,
      discount_pct: parseFloat(row.discount_pct) || 0,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('coppie')
      .upsert(coppieData, { onConflict: 'numero' })

    if (error) throw error

    // Crea status vuoti per tutti i PDV se non esistono
    const { data: pdvList } = await supabase
      .from('pdv')
      .select('id')
      .eq('status', 'active')

    const { data: coppieList } = await supabase
      .from('coppie')
      .select('id')

    if (pdvList && coppieList) {
      const statusInserts = []
      for (const pdv of pdvList) {
        for (const coppia of coppieList) {
          statusInserts.push({
            pdv_id: pdv.id,
            coppia_id: coppia.id,
            status: 'todo'
          })
        }
      }

      await supabase
        .from('coppia_pdv_status')
        .upsert(statusInserts, { onConflict: 'pdv_id,coppia_id' })
    }

    revalidatePath('/protected/master/confronta-conviene')
    return { success: true, count: coppieData.length }
  } catch (error) {
    console.error('Upload coppie error:', error)
    return { error: String(error) }
  }
}

// ============================================
// CREA ISPETTORE
// ============================================
export async function createIspettore(email: string, name: string, password: string) {
  try {
    const supabase = await createServerClient()
    
    // Valida master
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { data: ispettore } = await supabase
      .from('ispettori')
      .select('role')
      .eq('id', user.id)
      .single()

    if (ispettore?.role !== 'master') {
      throw new Error('Solo master può creare ispettori')
    }

    // Crea user in auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) throw authError

    // Crea record ispettore
    const { error: ispError } = await supabase
      .from('ispettori')
      .insert({
        id: authUser.user.id,
        role: 'ispettore',
        name,
        active: true
      })

    if (ispError) throw ispError

    revalidatePath('/protected/master/confronta-conviene')
    return { success: true, userId: authUser.user.id }
  } catch (error) {
    console.error('Create ispettore error:', error)
    return { error: String(error) }
  }
}

// ============================================
// ASSEGNA PDV A ISPETTORE
// ============================================
export async function assignPDVToIspettore(ispettoreId: string, pdvId: string) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { data: ispettore } = await supabase
      .from('ispettori')
      .select('role')
      .eq('id', user.id)
      .single()

    if (ispettore?.role !== 'master') {
      throw new Error('Solo master può assegnare PDV')
    }

    const { error } = await supabase
      .from('ispettore_pdv')
      .insert({
        ispettore_id: ispettoreId,
        pdv_id: pdvId,
        assigned_by: user.id
      })

    if (error && error.code !== '23505') throw error // 23505 = unique constraint

    revalidatePath('/protected/master/confronta-conviene')
    return { success: true }
  } catch (error) {
    console.error('Assign PDV error:', error)
    return { error: String(error) }
  }
}

// ============================================
// RIMUOVI PDV DA ISPETTORE
// ============================================
export async function removePDVFromIspettore(ispettoreId: string, pdvId: string) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { data: ispettore } = await supabase
      .from('ispettori')
      .select('role')
      .eq('id', user.id)
      .single()

    if (ispettore?.role !== 'master') {
      throw new Error('Solo master può rimuovere assegnazioni')
    }

    const { error } = await supabase
      .from('ispettore_pdv')
      .delete()
      .eq('ispettore_id', ispettoreId)
      .eq('pdv_id', pdvId)

    if (error) throw error

    revalidatePath('/protected/master/confronta-conviene')
    return { success: true }
  } catch (error) {
    console.error('Remove PDV error:', error)
    return { error: String(error) }
  }
}

// ============================================
// GET KPI NETWORK (Master vede tutto)
// ============================================
export async function getKPINetwork() {
  try {
    const supabase = await createServerClient()
    
    // Conta coppie totali
    const { count: totalCoppie } = await supabase
      .from('coppie')
      .select('*', { count: 'exact' })
      .eq('active', true)

    // KPI per PDV
    const { data: pdvList } = await supabase
      .from('pdv')
      .select('id, code, name, city, province')
      .eq('status', 'active')

    if (!pdvList) return { error: 'PDV not found' }

    const kpiData = await Promise.all(
      pdvList.map(async (pdv) => {
        const { count: done } = await supabase
          .from('coppia_pdv_status')
          .select('*', { count: 'exact' })
          .eq('pdv_id', pdv.id)
          .eq('status', 'done')

        const { count: todo } = await supabase
          .from('coppia_pdv_status')
          .select('*', { count: 'exact' })
          .eq('pdv_id', pdv.id)
          .eq('status', 'todo')

        const total = (done || 0) + (todo || 0)
        const percentage = total > 0 ? Math.round(((done || 0) / total) * 100) : 0

        return {
          pdvId: pdv.id,
          pdvCode: pdv.code,
          pdvName: pdv.name,
          city: pdv.city,
          province: pdv.province,
          done: done || 0,
          todo: todo || 0,
          total,
          percentage
        }
      })
    )

    // Stats network
    const totalDone = kpiData.reduce((acc, k) => acc + k.done, 0)
    const totalTodo = kpiData.reduce((acc, k) => acc + k.todo, 0)
    const networkPercentage = (totalDone + totalTodo) > 0 
      ? Math.round((totalDone / (totalDone + totalTodo)) * 100)
      : 0

    return {
      success: true,
      network: {
        totalCoppie,
        totalDone,
        totalTodo,
        networkPercentage,
        pdvCount: pdvList.length
      },
      pdvList: kpiData
    }
  } catch (error) {
    console.error('Get KPI error:', error)
    return { error: String(error) }
  }
}

// ============================================
// GET ISPETTORI (Master lista)
// ============================================
export async function getIspettori() {
  try {
    const supabase = await createServerClient()
    
    const { data: ispettori } = await supabase
      .from('ispettori')
      .select('id, name, active, created_at')
      .eq('role', 'ispettore')
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (!ispettori) return { error: 'No ispettori found' }

    // Get PDV assegnati per ogni ispettore
    const ispettoriWithPDV = await Promise.all(
      ispettori.map(async (isp) => {
        const { data: pdvAssigned } = await supabase
          .from('ispettore_pdv')
          .select('pdv:pdv_id(id, code, name, city, province)')
          .eq('ispettore_id', isp.id)

        return {
          ...isp,
          pdvCount: pdvAssigned?.length || 0,
          pdv: pdvAssigned?.map(p => p.pdv) || []
        }
      })
    )

    return { success: true, ispettori: ispettoriWithPDV }
  } catch (error) {
    console.error('Get ispettori error:', error)
    return { error: String(error) }
  }
}

// ============================================
// GET COPPIE COUNT
// ============================================
export async function getCoppieCount() {
  try {
    const supabase = await createServerClient()
    
    const { count } = await supabase
      .from('coppie')
      .select('*', { count: 'exact' })
      .eq('active', true)

    return { success: true, count: count || 0 }
  } catch (error) {
    console.error('Get coppie count error:', error)
    return { error: String(error) }
  }
}