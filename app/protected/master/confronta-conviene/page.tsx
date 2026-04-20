'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { uploadCoppie, getKPINetwork, getCoppieCount, getFullReport } from './actions'

type Tab = 'kpi' | 'carica'

/* ─── Design tokens ─── */
const navy       = '#0f2236'
const navyLight  = '#1a3a5c'
const red        = '#E2001A'
const green      = '#22c55e'
const greenBg    = '#f0fdf4'
const greenBorder = '#bbf7d0'
const greenDark  = '#065f46'
const amberBg    = '#fffbeb'
const amberBorder = '#fde68a'
const amberDark  = '#92400e'
const border     = '#e2e8f0'
const bg         = '#f1f5f9'
const text       = '#0f172a'
const muted      = '#64748b'
const subtle     = '#94a3b8'

/* ─── ProgressBar ─── */
function ProgressBar({ pct, color = green, height = 6 }: { pct: number; color?: string; height?: number }) {
  return (
    <div style={{ width: '100%', height, background: '#e2e8f0', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height, width: `${pct}%`, background: color, borderRadius: height, transition: 'width 0.5s ease' }} />
    </div>
  )
}

/* ─── KpiCard ─── */
function KpiCard({
  label, value, bgColor, textColor, borderColor,
}: {
  label: string; value: string | number
  bgColor: string; textColor: string; borderColor: string
}) {
  return (
    <div style={{
      background: bgColor,
      borderRadius: 12,
      border: `1.5px solid ${borderColor}`,
      padding: '16px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: textColor, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: textColor, opacity: 0.7 }}>{label}</div>
    </div>
  )
}

export default function MasterCCPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('kpi')
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [coppieCount, setCoppieCount] = useState(0)
  const [kpiData, setKpiData] = useState<any>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [countRes, kpiRes] = await Promise.all([getCoppieCount(), getKPINetwork()])
    if (countRes.success) setCoppieCount(countRes.count || 0)
    if (kpiRes.success) setKpiData(kpiRes)
  }

  const handleUpload = async () => {
    if (!uploadFile) { alert('Seleziona un file Excel'); return }
    setIsLoading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(sheet)
        const result = await uploadCoppie(jsonData)
        if (result.success) {
          setCoppieCount(result.count || 0)
          setUploadFile(null)
          setTab('kpi')
          await loadData()
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

  const downloadReport = async () => {
    setIsDownloading(true)
    const result = await getFullReport()
    setIsDownloading(false)
    if (!result.success || !result.rows) { alert('Errore nel download'); return }
    const ws = XLSX.utils.json_to_sheet(result.rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report Coppie')
    const date = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `report_coppie_rete_${date}.xlsx`)
  }

  const network = kpiData?.network
  const pdvList: any[] = kpiData?.pdvList
    ? [...kpiData.pdvList].sort((a: any, b: any) => b.percentage - a.percentage)
    : []

  const pctColor = (p: number) => p >= 80 ? green : p >= 50 ? '#f59e0b' : red

  return (
    <div style={{ minHeight: '100vh', background: bg }}>
      {/* ── HEADER (navy) ── */}
      <div style={{ background: navy }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 0' }}>

          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* Brand label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: red }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  KPI Coppie
                </span>
              </div>
              {/* Title */}
              <span style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>Dashboard Rete</span>
            </div>

            {/* Back button */}
            <button
              onClick={() => router.push('/protected/home')}
              style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 100, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>
              ← Menu
            </button>
          </div>

          {/* Tab bar (inside dark header) */}
          <div style={{ display: 'flex', gap: 2 }}>
            {([['kpi', 'KPI Network'], ['carica', 'Carica Excel']] as [Tab, string][]).map(([t, label]) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: tab === t ? `2px solid ${red}` : '2px solid transparent',
                  color: tab === t ? '#fff' : 'rgba(255,255,255,0.4)',
                  transition: 'color 0.15s',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI TAB ── */}
      {tab === 'kpi' && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
          {network ? (
            <>
              {/* Hero row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>

                {/* Left: big percentage card */}
                <div style={{
                  background: '#fff',
                  borderRadius: 16,
                  border: `1.5px solid ${border}`,
                  padding: 24,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                    Avanzamento Rete
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 16 }}>
                    <span style={{ fontSize: 64, fontWeight: 900, color: text, letterSpacing: '-2px', lineHeight: 1 }}>
                      {network.networkPercentage}
                    </span>
                    <span style={{ fontSize: 32, color: subtle }}>%</span>
                  </div>
                  <div style={{ width: '100%' }}>
                    <ProgressBar pct={network.networkPercentage} color={green} height={8} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                    <span style={{ fontSize: 11, color: muted }}>{network.totalDone} completate</span>
                    <span style={{ fontSize: 11, color: muted }}>{network.totalTodo} in sospeso</span>
                  </div>
                </div>

                {/* Right: 3×2 KPI grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <KpiCard label="PDV Attivi"     value={network.pdvCount}        bgColor={navy}     textColor="#fff"      borderColor="transparent" />
                  <KpiCard label="Completati"     value={network.totalDone}        bgColor={greenBg}  textColor={greenDark}  borderColor={greenBorder} />
                  <KpiCard label="In corso"       value={network.totalTodo}        bgColor={amberBg}  textColor={amberDark}  borderColor={amberBorder} />
                  <KpiCard label="Coppie totali"  value={network.totalCoppie ?? 0} bgColor="#f8fafc"  textColor={text}       borderColor={border} />
                  <KpiCard label="Completate"     value={network.totalDone}        bgColor={greenBg}  textColor={greenDark}  borderColor={greenBorder} />
                  <KpiCard label="In sospeso"     value={network.totalTodo}        bgColor={amberBg}  textColor={amberDark}  borderColor={amberBorder} />
                </div>
              </div>

              {/* PDV Table */}
              {pdvList.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${border}`, overflow: 'hidden' }}>
                  {/* Table header row */}
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: text }}>Dettaglio per PDV</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: '#f1f5f9', color: muted, border: `1px solid ${border}` }}>
                      {pdvList.length} punti vendita
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          {['Codice', 'PDV', 'Fatte', 'Mancanti', 'Avanzamento'].map(h => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Avanzamento' || h === 'Fatte' || h === 'Mancanti' ? 'center' : 'left', fontWeight: 700, color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${border}` }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pdvList.map((pdv: any) => {
                          const pc = pdv.percentage
                          const barColor = pctColor(pc)
                          return (
                            <tr key={pdv.pdvId} style={{ borderBottom: `1px solid ${border}` }}>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: subtle, fontSize: 11 }}>{pdv.pdvCode}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: text }}>{pdv.pdvName}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{ background: greenBg, color: greenDark, border: `1px solid ${greenBorder}`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
                                  {pdv.done}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{
                                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                                  ...(pdv.todo > 0
                                    ? { background: amberBg, color: amberDark, border: `1px solid ${amberBorder}` }
                                    : { background: greenBg, color: greenDark, border: `1px solid ${greenBorder}` }),
                                }}>
                                  {pdv.todo}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                  <div style={{ width: 80, height: 6, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pc}%`, background: barColor, borderRadius: 6, transition: 'width 0.4s ease' }} />
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: barColor, minWidth: 32, textAlign: 'right' }}>{pc}%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
                <button onClick={loadData}
                  style={{ padding: '10px 24px', borderRadius: 10, border: `1.5px solid ${border}`, background: '#fff', color: text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Aggiorna KPI
                </button>
                <button
                  onClick={downloadReport}
                  disabled={isDownloading}
                  style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: navy, color: '#fff', fontSize: 13, fontWeight: 600, cursor: isDownloading ? 'default' : 'pointer', opacity: isDownloading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isDownloading ? 'Generazione...' : '↓ Scarica Report Excel'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: muted }}>
              <p style={{ fontSize: 16, fontWeight: 600 }}>Nessuna coppia caricata.</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>Vai su <strong>Carica Excel</strong> per iniziare.</p>
            </div>
          )}
        </div>
      )}

      {/* ── CARICA EXCEL TAB ── */}
      {tab === 'carica' && (
        <div style={{ maxWidth: 560, margin: '32px auto', padding: '0 24px' }}>
          <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${border}`, padding: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: text, marginBottom: 6 }}>Carica coppie da Excel</h2>
            <p style={{ fontSize: 12, color: muted, marginBottom: 24, lineHeight: 1.6 }}>
              Il file deve avere le colonne:{' '}
              <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>
                numero, area, ean_coop, name_coop, price_coop, ean_idm, name_idm, price_idm, discount_pct
              </span>
            </p>

            {/* Drop zone */}
            <div
              onClick={() => document.getElementById('file-upload')?.click()}
              style={{
                border: `2px dashed ${border}`,
                borderRadius: 12,
                background: '#f1f5f9',
                padding: '40px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: 20,
                transition: 'border-color 0.2s',
              }}>
              <input type="file" accept=".xlsx,.xls,.csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }} id="file-upload" />
              <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: uploadFile ? text : muted }}>
                {uploadFile ? uploadFile.name : 'Clicca per selezionare'}
              </div>
              <div style={{ fontSize: 12, color: subtle, marginTop: 4 }}>.xlsx · .xls · .csv</div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!uploadFile || isLoading}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 10,
                background: !uploadFile || isLoading ? '#94a3b8' : navy,
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                cursor: !uploadFile || isLoading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}>
              {isLoading ? 'Caricamento...' : 'Carica coppie'}
            </button>

            {coppieCount > 0 && (
              <div style={{ marginTop: 16, padding: '10px 16px', background: greenBg, border: `1px solid ${greenBorder}`, borderRadius: 10, fontSize: 13, color: greenDark, fontWeight: 600, textAlign: 'center' }}>
                {coppieCount} coppie attive nel sistema
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
