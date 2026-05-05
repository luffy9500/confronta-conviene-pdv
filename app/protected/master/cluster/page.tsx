'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { uploadClusterProdotti, getClusterKPI, getCategorie, getProdottiByCategoria, getKPIByCategoria } from './actions'

type Tab = 'kpi' | 'assortimento' | 'carica'

/* ─── Design tokens ─── */
const navy        = '#0f2236'
const green       = '#22c55e'
const greenBg     = '#f0fdf4'
const greenBorder = '#bbf7d0'
const greenDark   = '#065f46'
const border      = '#e2e8f0'
const bg          = '#f1f5f9'
const text        = '#0f172a'
const muted       = '#64748b'
const subtle      = '#94a3b8'

const fasciaColors: Record<string, { bg: string; color: string }> = {
  MINI: { bg: '#d1fae5', color: '#065f46' },
  MIDI: { bg: '#dbeafe', color: '#1e40af' },
  MAXI: { bg: '#ede9fe', color: '#5b21b6' },
}

function ProgressBar({ pct, color = green, height = 6 }: { pct: number; color?: string; height?: number }) {
  return (
    <div style={{ width: '100%', height, background: '#e2e8f0', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height, width: `${pct}%`, background: color, borderRadius: height, transition: 'width 0.5s ease' }} />
    </div>
  )
}

function Check({ ok }: { ok: boolean }) {
  return ok
    ? <span style={{ color: greenDark, fontWeight: 900, fontSize: 14 }}>✓</span>
    : <span style={{ color: '#cbd5e1', fontSize: 14 }}>—</span>
}

function KpiBox({ label, value, bg: bgC, color }: { label: string; value: string | number; bg: string; color: string }) {
  return (
    <div style={{ background: bgC, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color, opacity: 0.75, marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  )
}

export default function MasterClusterPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('kpi')

  // KPI globale
  const [kpiData, setKpiData] = useState<any>(null)
  const [categorie, setCategorie] = useState<string[]>([])

  // Assortimento
  const [catSelezionata, setCatSelezionata] = useState('')
  const [prodotti, setProdotti] = useState<any[]>([])
  const [kpiCat, setKpiCat] = useState<any>(null)
  const [loadingAss, setLoadingAss] = useState(false)
  const [assortimentoSearch, setAssortimentoSearch] = useState('')

  // Upload
  const [isLoading, setIsLoading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCategoria, setUploadCategoria] = useState('')
  const [previewRows, setPreviewRows] = useState<any[][]>([])

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (tab === 'assortimento' && catSelezionata) fetchAssortimento(catSelezionata)
  }, [tab, catSelezionata])

  const loadData = async () => {
    const [kpi, cats] = await Promise.all([getClusterKPI(), getCategorie()])
    if (kpi.success) setKpiData(kpi)
    if (cats.success) {
      setCategorie(cats.categorie || [])
      if (!catSelezionata && cats.categorie?.length > 0) setCatSelezionata(cats.categorie[0])
    }
  }

  const fetchAssortimento = async (cat: string) => {
    setLoadingAss(true)
    const [prodRes, kpiRes] = await Promise.all([
      getProdottiByCategoria(cat),
      getKPIByCategoria(cat),
    ])
    if (prodRes.success) setProdotti(prodRes.prodotti || [])
    if (kpiRes.success) setKpiCat(kpiRes)
    setLoadingAss(false)
  }

  const handleCatChange = (cat: string) => {
    setCatSelezionata(cat)
    fetchAssortimento(cat)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    const nameGuess = file.name.replace(/\.xlsx?$/i, '').replace(/[_-]/g, ' ')
    setUploadCategoria(nameGuess)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
      setPreviewRows(rows.slice(0, 7))
    }
    reader.readAsArrayBuffer(file)
  }

  const handleUpload = async () => {
    if (!uploadFile) { alert('Seleziona un file Excel'); return }
    if (!uploadCategoria.trim()) { alert('Inserisci il nome della categoria'); return }
    setIsLoading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
        const result = await uploadClusterProdotti(rows, uploadCategoria)
        if (result.success) {
          alert(`Caricati ${result.count} prodotti per "${uploadCategoria}"`)
          setUploadFile(null)
          setPreviewRows([])
          await loadData()
          setCatSelezionata(uploadCategoria.trim())
          setTab('assortimento')
        } else {
          alert(`Errore: ${result.error}`)
        }
      } catch (err) {
        alert(`Errore lettura file: ${err}`)
      } finally {
        setIsLoading(false)
      }
    }
    reader.readAsArrayBuffer(uploadFile)
  }

  const prodottiFiltrati = prodotti.filter(p => {
    if (!assortimentoSearch) return true
    const q = assortimentoSearch.toLowerCase()
    return p.nome?.toLowerCase().includes(q) || String(p.cod_articolo || '').includes(q)
  })

  const tabs: [Tab, string][] = [
    ['kpi', 'KPI Rete'],
    ['assortimento', 'Assortimento'],
    ['carica', '↑ Carica Excel'],
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: bg }}>
      {/* Header */}
      <div style={{ background: navy, padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 12 }}>
        <button type="button" onClick={() => router.push('/protected/home')}
          style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', flexShrink: 0 }}>
          ← Menu
        </button>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Assortimenti e Cluster</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
          Master
        </span>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${border}`, padding: '0 24px', display: 'flex' }}>
        {tabs.map(([t, label]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            style={{
              padding: '14px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: 'transparent', borderBottom: tab === t ? `3px solid ${navy}` : '3px solid transparent',
              color: tab === t ? navy : muted,
            }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px', width: '100%' }}>

        {/* ─── KPI GLOBALE ─── */}
        {tab === 'kpi' && (
          <div>
            {kpiData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
                <div style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${border}`, padding: '16px 14px' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: navy }}>{kpiData.totalProdotti}</div>
                  <div style={{ fontSize: 11, color: muted }}>Prodotti attivi</div>
                </div>
                <div style={{ background: greenBg, borderRadius: 12, border: `1.5px solid ${greenBorder}`, padding: '16px 14px' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: greenDark }}>{kpiData.pdvList?.length ?? 0}</div>
                  <div style={{ fontSize: 11, color: greenDark }}>PDV attivi</div>
                </div>
                {categorie.length > 0 && (
                  <div style={{ background: '#f0f9ff', borderRadius: 12, border: `1.5px solid #bae6fd`, padding: '16px 14px' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#0369a1' }}>{categorie.length}</div>
                    <div style={{ fontSize: 11, color: '#0369a1' }}>Categorie</div>
                  </div>
                )}
              </div>
            )}

            {categorie.length > 0 && (
              <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {categorie.map(c => (
                  <button key={c} type="button" onClick={() => { setCatSelezionata(c); setTab('assortimento') }}
                    style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 100, background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', cursor: 'pointer' }}>
                    {c} →
                  </button>
                ))}
              </div>
            )}

            {kpiData?.pdvList?.length > 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${border}`, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: text }}>Avanzamento PDV</span>
                </div>
                {kpiData.pdvList.map((pdv: any) => (
                  <div key={pdv.pdvId} style={{ padding: '14px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: muted, fontFamily: 'monospace', background: bg, padding: '1px 6px', borderRadius: 4 }}>{pdv.pdvCode}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: text }}>{pdv.pdvName}</span>
                        {pdv.fascia && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: fasciaColors[pdv.fascia].bg, color: fasciaColors[pdv.fascia].color }}>
                            {pdv.fascia}
                          </span>
                        )}
                      </div>
                      <ProgressBar pct={pdv.percentage} />
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: pdv.percentage >= 100 ? greenDark : text }}>{pdv.percentage}%</div>
                      <div style={{ fontSize: 10, color: muted }}>{pdv.done}/{pdv.total}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', color: muted }}>
                <p style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📭</p>
                <p style={{ fontWeight: 600 }}>Nessun prodotto ancora caricato.</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Vai su "Carica Excel" per iniziare.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── ASSORTIMENTO ─── */}
        {tab === 'assortimento' && (
          <div>
            {/* Selettore + ricerca */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              {categorie.length > 1 ? (
                <select value={catSelezionata} onChange={e => handleCatChange(e.target.value)}
                  style={{ fontSize: 13, fontWeight: 700, padding: '8px 16px', border: `1.5px solid ${border}`, borderRadius: 100, background: '#fff', color: text, outline: 'none', cursor: 'pointer' }}>
                  {categorie.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : categorie.length === 1 ? (
                <span style={{ fontSize: 14, fontWeight: 700, color: navy, padding: '8px 16px', background: '#fff', border: `1.5px solid ${border}`, borderRadius: 100 }}>
                  {catSelezionata}
                </span>
              ) : null}
              <input type="text" placeholder="Cerca prodotto…" value={assortimentoSearch} onChange={e => setAssortimentoSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: '8px 14px', fontSize: 13, border: `1.5px solid ${border}`, borderRadius: 100, outline: 'none', color: text, background: '#fff' }} />
              <span style={{ fontSize: 12, color: muted, flexShrink: 0 }}>{prodottiFiltrati.length} prodotti</span>
            </div>

            {loadingAss ? (
              <div style={{ textAlign: 'center', padding: 48, color: muted }}>Caricamento…</div>
            ) : categorie.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: muted }}>
                <p style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📭</p>
                <p style={{ fontWeight: 600 }}>Nessuna categoria caricata.</p>
                <button type="button" onClick={() => setTab('carica')}
                  style={{ marginTop: 12, padding: '8px 20px', borderRadius: 100, background: navy, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Carica Excel →
                </button>
              </div>
            ) : (
              <>
                {/* ── KPI categoria ── */}
                {kpiCat && (
                  <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Conteggi prodotti per fascia */}
                    <div style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${border}`, padding: '16px 20px' }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                        Prodotti per cluster
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: '8px 16px', alignItems: 'center' }}>
                        {/* Intestazioni colonne */}
                        <div />
                        {['MINI', 'MIDI', 'MAXI'].map(f => (
                          <div key={f} style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 100, background: fasciaColors[f].bg, color: fasciaColors[f].color }}>
                              {f}
                            </span>
                          </div>
                        ))}
                        {/* Invernale */}
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', padding: '4px 10px', background: '#e0f2fe', borderRadius: 100, whiteSpace: 'nowrap' }}>❄ Invernale</div>
                        {(['MINI', 'MIDI', 'MAXI'] as const).map(f => (
                          <KpiBox key={`inv-${f}`} label="prodotti" value={kpiCat.conteggiFascia.inv[f]} bg={fasciaColors[f].bg} color={fasciaColors[f].color} />
                        ))}
                        {/* Estivo */}
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', padding: '4px 10px', background: '#fef9c3', borderRadius: 100, whiteSpace: 'nowrap' }}>☀ Estivo</div>
                        {(['MINI', 'MIDI', 'MAXI'] as const).map(f => (
                          <KpiBox key={`est-${f}`} label="prodotti" value={kpiCat.conteggiFascia.est[f]} bg={fasciaColors[f].bg} color={fasciaColors[f].color} />
                        ))}
                      </div>
                    </div>

                    {/* Avanzamento PDV per questa categoria */}
                    {kpiCat.pdvList?.length > 0 && (
                      <div style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: text }}>Avanzamento PDV</span>
                          <span style={{ fontSize: 11, color: muted }}>— prodotti rilevanti per fascia</span>
                        </div>
                        {kpiCat.pdvList.map((pdv: any) => (
                          <div key={pdv.pdvId} style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 900, color: muted, fontFamily: 'monospace', background: bg, padding: '1px 6px', borderRadius: 4 }}>{pdv.pdvCode}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: text }}>{pdv.pdvName}</span>
                                {pdv.fascia && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: fasciaColors[pdv.fascia].bg, color: fasciaColors[pdv.fascia].color }}>
                                    {pdv.fascia}
                                  </span>
                                )}
                                {pdv.total === 0 && (
                                  <span style={{ fontSize: 10, color: muted, fontStyle: 'italic' }}>nessun prodotto per questa fascia</span>
                                )}
                              </div>
                              {pdv.total > 0 && <ProgressBar pct={pdv.percentage} />}
                            </div>
                            {pdv.total > 0 && (
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: pdv.percentage >= 100 ? greenDark : text }}>{pdv.percentage}%</div>
                                <div style={{ fontSize: 10, color: muted }}>{pdv.done}/{pdv.total}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Griglia prodotti ── */}
                <div style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${border}`, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th rowSpan={2} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: `2px solid ${border}`, borderRight: `1px solid ${border}`, fontWeight: 700, color: text, whiteSpace: 'nowrap', minWidth: 280 }}>
                            Prodotto
                          </th>
                          <th colSpan={4} style={{ padding: '8px 14px', textAlign: 'center', borderBottom: `1px solid ${border}`, borderRight: `2px solid ${border}`, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', whiteSpace: 'nowrap' }}>
                            ❄ INVERNALE
                          </th>
                          <th colSpan={4} style={{ padding: '8px 14px', textAlign: 'center', borderBottom: `1px solid ${border}`, fontWeight: 800, color: '#854d0e', background: '#fef9c3', whiteSpace: 'nowrap' }}>
                            ☀ ESTIVO
                          </th>
                        </tr>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `2px solid ${border}`, borderRight: `1px solid ${border}`, fontWeight: 700, color: muted, whiteSpace: 'nowrap' }}>ASS.</th>
                          {['MINI', 'MIDI', 'MAXI'].map((f, i) => (
                            <th key={`inv-${f}`} style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `2px solid ${border}`, borderRight: i === 2 ? `2px solid ${border}` : `1px solid ${border}`, whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 100, background: fasciaColors[f].bg, color: fasciaColors[f].color }}>{f}</span>
                            </th>
                          ))}
                          <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `2px solid ${border}`, borderRight: `1px solid ${border}`, fontWeight: 700, color: muted, whiteSpace: 'nowrap' }}>ASS.</th>
                          {['MINI', 'MIDI', 'MAXI'].map((f, i) => (
                            <th key={`est-${f}`} style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `2px solid ${border}`, borderRight: i < 2 ? `1px solid ${border}` : undefined, whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 100, background: fasciaColors[f].bg, color: fasciaColors[f].color }}>{f}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {prodottiFiltrati.map((p, i) => (
                          <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '10px 14px', borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}` }}>
                              <div style={{ fontWeight: 600, color: text, marginBottom: 2 }}>{p.nome}</div>
                              {p.cod_articolo && <div style={{ fontSize: 10, color: subtle, fontFamily: 'monospace' }}>{p.cod_articolo}</div>}
                            </td>
                            {/* INVERNALE */}
                            <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}` }}>
                              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 100, background: p.inv_assortimento === 'SI' ? greenBg : p.inv_assortimento === 'SPOT' ? '#fffbeb' : '#f1f5f9', color: p.inv_assortimento === 'SI' ? greenDark : p.inv_assortimento === 'SPOT' ? '#92400e' : muted }}>
                                {p.inv_assortimento || 'NO'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}` }}><Check ok={p.inv_mini} /></td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}` }}><Check ok={p.inv_midi} /></td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${border}`, borderRight: `2px solid ${border}` }}><Check ok={p.inv_maxi} /></td>
                            {/* ESTIVO */}
                            <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}` }}>
                              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 100, background: p.est_assortimento === 'SI' ? greenBg : p.est_assortimento === 'SPOT' ? '#fffbeb' : '#f1f5f9', color: p.est_assortimento === 'SI' ? greenDark : p.est_assortimento === 'SPOT' ? '#92400e' : muted }}>
                                {p.est_assortimento || 'NO'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}` }}><Check ok={p.est_mini} /></td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}` }}><Check ok={p.est_midi} /></td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: `1px solid ${border}` }}><Check ok={p.est_maxi} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── CARICA ─── */}
        {tab === 'carica' && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Nome categoria
                </label>
                <input type="text" value={uploadCategoria} onChange={e => setUploadCategoria(e.target.value)}
                  placeholder="es. Pasta Fresca Ripiena"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14, border: `1.5px solid ${border}`, borderRadius: 10, outline: 'none', color: text }} />
                <p style={{ fontSize: 12, color: muted, marginTop: 6 }}>
                  Prodotti esistenti per questa categoria verranno disattivati e sostituiti.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  File Excel cluster
                </label>
                <div style={{ border: `2px dashed ${border}`, borderRadius: 12, padding: '28px 20px', textAlign: 'center', background: bg }}>
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} id="cluster-file" />
                  <label htmlFor="cluster-file" style={{ cursor: 'pointer' }}>
                    <p style={{ fontSize: 24, marginBottom: 8, opacity: 0.4 }}>📂</p>
                    {uploadFile
                      ? <p style={{ fontSize: 13, fontWeight: 700, color: navy }}>{uploadFile.name}</p>
                      : <p style={{ fontSize: 13, color: muted }}>Clicca per selezionare il file Excel</p>
                    }
                  </label>
                </div>
                <p style={{ fontSize: 11, color: subtle, marginTop: 6 }}>
                  Formato: COD ART · N9XART · SI/NO (INV) · MINI · MIDI · MAXI · SI/NO (EST) · MINI · MIDI · MAXI
                </p>
              </div>

              {previewRows.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Anteprima</p>
                  <div style={{ overflowX: 'auto', border: `1px solid ${border}`, borderRadius: 8 }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
                      <tbody>
                        {previewRows.map((row, ri) => (
                          <tr key={ri} style={{ background: ri < 3 ? '#f8fafc' : '#fff' }}>
                            {(row as any[]).slice(0, 10).map((cell, ci) => (
                              <td key={ci} style={{ padding: '5px 8px', border: `1px solid ${border}`, color: ri < 3 ? muted : text, fontWeight: ri === 2 ? 700 : 400, whiteSpace: 'nowrap' }}>
                                {cell != null ? String(cell) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button type="button" onClick={handleUpload}
                disabled={isLoading || !uploadFile || !uploadCategoria.trim()}
                style={{
                  padding: '12px 0', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: isLoading || !uploadFile || !uploadCategoria.trim() ? 'default' : 'pointer',
                  background: isLoading || !uploadFile || !uploadCategoria.trim() ? '#e2e8f0' : navy,
                  color: isLoading || !uploadFile || !uploadCategoria.trim() ? muted : '#fff',
                  border: 'none', width: '100%',
                }}>
                {isLoading ? 'Caricamento...' : '↑ Carica prodotti cluster'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
