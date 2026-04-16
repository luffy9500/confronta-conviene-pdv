export type UserRole = 'pdv' | 'master'

export interface PDV {
  id: string
  code: string
  name: string
  address?: string
  city?: string
  province?: string
  metratura_mq?: number
  status: string
}

export interface CoppiaStatus {
  id: string
  pdv_id: string
  coppia_id: string
  status: 'pending' | 'mounted' | 'not_mounted'
  reason_not_mounted?: string
  notes?: string
  mounted_at?: string
}

export interface UserProfile {
  id: string
  role: UserRole
  pdv_id?: string
  name?: string
}

export type Fascia = 'MINI' | 'MIDI' | 'MAXI'
export type Stagione = 'INV' | 'EST'
export type ClusterStatus = 'pending' | 'in_progress' | 'completed'

export interface ClusterCategoria {
  id: string
  nome: string
  slug: string
  descrizione?: string
  icona?: string
  ordine: number
  active: boolean
}

export interface ClusterProdotto {
  id: string
  cluster_id: string
  cod_articolo: string
  nome: string
  brand: string
  assortimento_mini: string
  assortimento_midi: string
  assortimento_maxi: string
  ordine: number
  active: boolean
}

export interface ClusterPDVStatus {
  id: string
  pdv_id: string
  cluster_id: string
  fascia: Fascia
  stagione: Stagione
  prodotti_confermati: Record<string, boolean>
  percentage_complete: number
  status: ClusterStatus
  completato_at?: string
}
