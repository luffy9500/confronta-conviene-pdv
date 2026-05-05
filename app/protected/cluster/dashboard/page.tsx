'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { getUserClusterInfo, getClusterProdottiConStatus, updateClusterProdottoStatus } from '../actions'

type Stagione = 'INV' | 'EST'
type StatusFilter = 'all' | 'done' | 'todo'

/* ─── Design tokens ─── */
const navy        = '#0f2236'
const navyLight   = '#1a3a5c'
const red         = '#E2001A'
const green       = '#22c55e'
const greenBg     = '#f0fdf4'
const greenBorder = '#bbf7d0'
const greenDark   = '#065f46'
const amber       = '#f59e0b'
const amberBg     = '#fffbeb'
const amberBorder = '#fde68a'
const amberDark   = '#92400e'
const border      = '#e2e8f0'
const bg          = '#f1f5f9'
const text        = '#0f172a'
const muted       = '#64748b'
const subtle      = '#94a3b8'
const purple      = '#a78bfa'

const fasciaColors: Record<string, { bg: string; color: string }> = {
  MINI: { bg: '#d1fae5', color: '#065f46' },
  MIDI: { bg: '#dbeafe', color: '#1e40af' },
  MAXI: { bg: '#ede9fe', color: '#5b21b6' },
}

/* ─── PAGE ─── */
export default function ClusterDashboard() {
  const router = useRouter()
  const [pdvId, setPdvId]         = useState<string | null>(null)
  const [pdvName, setPdvName]     = useState('')
  const [pdvCode, setPdvCode]     = useState('')
  const [fascia, setFascia]       = useState<'MINI' | 'MIDI' | 'MAXI' | null>(null)
  const [stagione, setStagione]   = useState<Stagione>('INV')
  const [prodotti, setProdotti]   = useState<any[]>([])
  const [statusMap, setStatusMap] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [catFilter, setCatFilter] = useState('all')
  const [search, setSearch]       = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updating, setUpdating]   = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sideMenuOpen, setSideMenuOpen] = useState(false)
  const [isMobile, setIsMobile]   = useState(false)

  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (pdvId && fascia) loadProdotti(pdvId, fascia, stagione) }, [stagione])
  useEffect(() => { setCurrentIndex(0) }, [statusFilter, catFilter, search, stagione])

  const loadData = async () => {
    setIsLoading(true)
    const info = await getUserClusterInfo()
    if (!info.success || !info.pdvId) {
      setError(info.error || 'PDV non trovato')
      setIsLoading(false)
      return
    }
    if (!info.fascia) {
      setError('Metratura PDV non configurata. Contatta il master.')
      setIsLoading(false)
      return
    }
    setPdvId(info.pdvId)
    setPdvName(info.pdvName || '')
    setPdvCode(info.pdvCode || '')
    setFascia(info.fascia)
    await loadProdotti(info.pdvId, info.fascia, 'INV')
    setIsLoading(false)
  }

  const loadProdotti = async (pid: string, f: 'MINI' | 'MIDI' | 'MAXI', s: Stagione) => {
    const res = await getClusterProdottiConStatus(pid, f, s)
    if (res.success) {
      setProdotti(res.prodotti || [])
      setStatusMap(prev => ({ ...prev, ...(res.statusMap || {}) }))
    }
  }

  const toggleStatus = async (prodottoId: string) => {
    if (!pdvId || updating) return
    const next = (statusMap[prodottoId] || 'todo') === 'done' ? 'todo' : 'done'
    setUpdating(prodottoId)
    setStatusMap(prev => ({ ...prev, [prodottoId]: next }))
    await updateClusterProdottoStatus(pdvId, prodottoId, next)
    setUpdating(null)
  }

  const categorie = useMemo(() => {
    const set = new Set(prodotti.map(p => (p.categoria || '').trim()).filter(Boolean))
    return Array.from(set).sort()
  }, [prodotti])

  const done      = prodotti.filter(p => (statusMap[p.id] || 'todo') === 'done').length
  const total     = prodotti.length
  const todo      = total - done
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0

  const filtered = useMemo(() => prodotti.filter(p => {
    const s = statusMap[p.id] || 'todo'
    if (statusFilter !== 'all' && s !== statusFilter) return false
    if (catFilter !== 'all' && (p.categoria || '').trim() !== catFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const matches = p.nome?.toLowerCase().includes(q) || String(p.cod_articolo || '').includes(q)
      if (!matches) return false
    }
    return true
  }), [prodotti, statusMap, statusFilter, catFilter, search])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (sideMenuOpen) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (sideMenuOpen) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && currentIndex < filtered.length - 1) setCurrentIndex(i => i + 1)
      if (dx > 0 && currentIndex > 0) setCurrentIndex(i => i - 1)
    }
  }

  const closeMenu = () => setSideMenuOpen(false)

  const downloadReport = () => {
    const rows = prodotti.map(p => ({
      'Cod. Articolo': p.cod_articolo || '',
      'Nome': p.nome || '',
      'Categoria': p.categoria || '',
      'Stagione': stagione === 'INV' ? 'Invernale' : 'Estivo',
      'Fascia': fascia || '',
      'Assortimento': (stagione === 'INV' ? p.inv_assortimento : p.est_assortimento) || '',
      'Stato': (statusMap[p.id] || 'todo') === 'done' ? 'Presente' : 'Da verificare',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cluster')
    const date = new Date().toISOString().slice(0, 10)
    const prefix = pdvCode ? `report_cluster_${pdvCode}` : 'report_cluster'
    XLSX.writeFile(wb, `${prefix}_${date}.xlsx`)
  }

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: `4px solid ${red}`, borderTop: '4px solid transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 13, color: muted }}>Caricamento...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: bg }}>
      <div style={{ padding: 32, textAlign: 'center', background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', maxWidth: 360, width: '100%' }}>
        <p style={{ color: red, fontWeight: 700, marginBottom: 16 }}>{error}</p>
        <button onClick={() => router.push('/protected/home')}
          style={{ width: '100%', padding: '10px 0', border: `1.5px solid ${border}`, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#fff', color: text }}>
          ← Torna al menu
        </button>
      </div>
    </div>
  )

  /* ─── SIDE DRAWER ─── */
  const SideDrawer = (
    <>
      {sideMenuOpen && (
        <button type="button" aria-label="Chiudi menu" onClick={closeMenu}
          style={{ position: 'fixed', inset: 0, zIndex: 30, cursor: 'default', background: 'rgba(0,0,0,0.55)', border: 'none', padding: 0 }} />
      )}
      <div style={{
        position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 40, display: 'flex', flexDirection: 'column',
        width: 288, background: navyLight,
        transform: sideMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
        boxShadow: sideMenuOpen ? '12px 0 40px rgba(0,0,0,0.25)' : 'none',
        transition: 'transform 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Prodotti</span>
          <button type="button" onClick={closeMenu}
            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', fontSize: 14 }}>
            ✕
          </button>
        </div>

        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <input type="text" placeholder="Cerca…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12, outline: 'none', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', boxSizing: 'border-box' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map((p) => {
            const isDone = (statusMap[p.id] || 'todo') === 'done'
            const isActive = isMobile && currentIndex === filtered.indexOf(p)
            const assortimento = stagione === 'INV' ? p.inv_assortimento : p.est_assortimento
            return (
              <button key={p.id} type="button"
                onClick={() => { if (isMobile) setCurrentIndex(filtered.indexOf(p)); closeMenu() }}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: isActive ? red : 'transparent',
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  cursor: 'pointer', border: 'none',
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.25)', marginBottom: 2 }}>
                    {p.cod_articolo ? `#${p.cod_articolo}` : ''} {assortimento === 'SPOT' ? '· SPOT' : ''}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{p.categoria || ''}</p>
                </div>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0,
                  ...(isDone ? { background: 'rgba(22,163,74,0.15)', color: green } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' }),
                }}>
                  {isDone ? '✓' : '○'}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: green, margin: 0 }}>{done}</p>
              <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Presenti</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>{todo}</p>
              <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Da fare</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  /* ─── TOPBAR ─── */
  const fasciaStyle = fascia ? fasciaColors[fascia] : { bg: bg, color: muted }
  const Topbar = (
    <div style={{ position: 'sticky', top: 0, zIndex: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 56, background: navy, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button type="button" onClick={() => setSideMenuOpen(true)}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 40, height: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 0, cursor: 'pointer' }}>
          <span style={{ display: 'block', width: 18, height: 2, borderRadius: 2, background: '#fff' }} />
          <span style={{ display: 'block', width: 18, height: 2, borderRadius: 2, background: '#fff' }} />
          <span style={{ display: 'block', width: 18, height: 2, borderRadius: 2, background: '#fff' }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Assortimenti e Cluster
          </span>
          {fascia && (
            <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 100, background: fasciaStyle.bg, color: fasciaStyle.color, flexShrink: 0 }}>
              {fascia}
            </span>
          )}
        </div>
        <button type="button" onClick={() => router.push('/protected/home')}
          style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', flexShrink: 0 }}>
          ← Menu
        </button>
      </div>

      {/* Progress line */}
      <div style={{ height: 3, background: '#e2e8f0' }}>
        <div style={{ height: 3, width: `${percentage}%`, background: green, transition: 'width 0.4s ease' }} />
      </div>

      {/* KPI subbar */}
      <div style={{ background: navyLight, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 6px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{total} tot</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: 'rgba(22,163,74,0.15)', color: green }}>{done} presenti</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>{todo} mancano</span>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginLeft: 4 }}>
            <div style={{ height: '100%', width: `${percentage}%`, background: green, borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 900, color: purple, flexShrink: 0 }}>{percentage}%</span>
          {total > 0 && (
            <button type="button" onClick={downloadReport} title="Scarica report Excel"
              style={{ padding: '3px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              ↓ Excel
            </button>
          )}
        </div>
      </div>

      {/* Stagione tabs + filters */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${border}`, padding: '8px 16px', display: 'flex', gap: 6, overflowX: 'auto', alignItems: 'center' }}>
        {/* Stagione toggle */}
        {(['INV', 'EST'] as Stagione[]).map(s => (
          <button key={s} type="button" onClick={() => setStagione(s)}
            style={{
              padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              ...(stagione === s
                ? { background: navy, color: '#fff', border: `1px solid ${navy}` }
                : { background: 'transparent', color: muted, border: `1px solid ${border}` }),
            }}>
            {s === 'INV' ? '❄ Invernale' : '☀ Estivo'}
          </button>
        ))}

        <div style={{ width: 1, height: 24, background: border, flexShrink: 0 }} />

        {/* Status filter */}
        {([
          ['all',  `Tutti (${total})`],
          ['done', `✓ Presenti (${done})`],
          ['todo', `○ Da fare (${todo})`],
        ] as [StatusFilter, string][]).map(([f, label]) => {
          const isActive = statusFilter === f
          let pillStyle: React.CSSProperties
          if (isActive && f === 'done') pillStyle = { background: greenBg, color: greenDark, border: `1px solid ${greenBorder}` }
          else if (isActive && f === 'todo') pillStyle = { background: amberBg, color: amberDark, border: `1px solid ${amberBorder}` }
          else if (isActive) pillStyle = { background: '#1a1a1a', color: '#fff', border: '1px solid #1a1a1a' }
          else pillStyle = { background: 'transparent', color: muted, border: `1px solid ${border}` }
          return (
            <button key={f} type="button" onClick={() => setStatusFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', ...pillStyle }}>
              {label}
            </button>
          )
        })}

        <div style={{ flex: 1 }} />

        {categorie.length > 1 && (
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            style={{ fontSize: 12, padding: '6px 12px', border: `1.5px solid ${border}`, borderRadius: 100, background: '#fff', color: text, outline: 'none', cursor: 'pointer' }}>
            <option value="all">Tutte le categorie</option>
            {categorie.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* PDV strip */}
      {pdvName && (
        <div style={{ background: navy, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>PDV</span>
          {pdvCode && (
            <span style={{ fontSize: 10, fontWeight: 900, color: red, fontFamily: 'monospace', background: 'rgba(226,0,26,0.12)', padding: '1px 6px', borderRadius: 4 }}>{pdvCode}</span>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdvName}</span>
        </div>
      )}
    </div>
  )

  /* ─── PRODUCT CARD ─── */
  const ProductCard = ({ prodotto, isDone, showNav, prevFn, nextFn, hasPrev, hasNext }: any) => {
    const assortimento = stagione === 'INV' ? prodotto.inv_assortimento : prodotto.est_assortimento
    const isSpot = assortimento === 'SPOT'
    return (
      <div style={{
        background: '#fff',
        borderRadius: 16,
        border: `2px solid ${isDone ? greenBorder : border}`,
        overflow: 'hidden',
        boxShadow: isDone
          ? '0 0 0 2px #22c55e22, 0 2px 16px rgba(0,0,0,0.06)'
          : '0 2px 16px rgba(0,0,0,0.06)',
      }}>
        {/* Card header */}
        <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {prodotto.cod_articolo && (
              <span style={{ fontSize: 11, color: subtle, fontFamily: 'monospace' }}>#{prodotto.cod_articolo}</span>
            )}
            {prodotto.categoria && (
              <span style={{ fontSize: 11, color: muted, fontWeight: 600 }}>{prodotto.categoria}</span>
            )}
            {isSpot && (
              <span style={{ fontSize: 9, fontWeight: 900, background: amberBg, color: amberDark, border: `1px solid ${amberBorder}`, padding: '2px 7px', borderRadius: 100 }}>
                SPOT
              </span>
            )}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
            ...(isDone
              ? { background: greenBg, color: greenDark, border: `1px solid ${greenBorder}` }
              : { background: '#f1f5f9', color: muted, border: `1px solid ${border}` }),
          }}>
            {isDone ? '✓ Presente' : '○ Da verificare'}
          </span>
        </div>

        {/* Product body */}
        <div style={{ padding: '20px 20px 16px' }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: text, lineHeight: 1.35, marginBottom: 8 }}>
            {prodotto.nome || '—'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {fascia && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: fasciaColors[fascia].bg, color: fasciaColors[fascia].color }}>
                {fascia}
              </span>
            )}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
              background: stagione === 'INV' ? '#e0f2fe' : '#fef9c3',
              color: stagione === 'INV' ? '#0369a1' : '#854d0e',
            }}>
              {stagione === 'INV' ? '❄ Invernale' : '☀ Estivo'}
            </span>
            {assortimento && assortimento !== 'SPOT' && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: greenBg, color: greenDark, border: `1px solid ${greenBorder}` }}>
                {assortimento}
              </span>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${border}`, display: 'flex', gap: 8 }}>
          <button type="button"
            onClick={() => toggleStatus(prodotto.id)}
            disabled={updating === prodotto.id}
            style={{
              flex: 1, padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              ...(isDone
                ? { background: '#f1f5f9', color: muted, border: `1.5px solid ${border}` }
                : { background: green, color: '#fff', border: `1.5px solid ${green}` }),
            }}>
            {updating === prodotto.id ? '...' : isDone ? '○ Segna da verificare' : '✓ Segna come presente'}
          </button>

          {showNav && (hasPrev || hasNext) && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={prevFn} disabled={!hasPrev}
                style={{ width: 44, height: 44, borderRadius: 10, background: '#f1f5f9', border: `1.5px solid ${border}`, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: hasPrev ? 'pointer' : 'default', opacity: hasPrev ? 1 : 0.3 }}>
                ←
              </button>
              <button type="button" onClick={nextFn} disabled={!hasNext}
                style={{ width: 44, height: 44, borderRadius: 10, background: '#f1f5f9', border: `1.5px solid ${border}`, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: hasNext ? 'pointer' : 'default', opacity: hasNext ? 1 : 0.3 }}>
                →
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ─── MOBILE ─── */
  if (isMobile) {
    const prodotto = filtered[currentIndex]
    const isDone = prodotto ? (statusMap[prodotto.id] || 'todo') === 'done' : false

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: bg }}>
        {Topbar}
        {SideDrawer}

        {total === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: muted, padding: 32 }}>
            <div>
              <p style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📭</p>
              <p style={{ fontWeight: 600 }}>Nessun prodotto disponibile.</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Il master non ha ancora caricato i prodotti per il cluster {fascia}.</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, fontSize: 13 }}>
            Nessun prodotto trovato
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div style={{ flex: 1, padding: 12 }}>
              <ProductCard
                prodotto={prodotto}
                isDone={isDone}
                showNav={true}
                hasPrev={currentIndex > 0}
                hasNext={currentIndex < filtered.length - 1}
                prevFn={() => setCurrentIndex(i => Math.max(0, i - 1))}
                nextFn={() => setCurrentIndex(i => Math.min(filtered.length - 1, i + 1))}
              />
            </div>
            <div style={{ textAlign: 'center', paddingBottom: 16, paddingTop: 4 }}>
              <span style={{ fontSize: 12, color: subtle }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: text }}>{currentIndex + 1}</span>
                {' / '}{filtered.length}
              </span>
            </div>
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ─── DESKTOP ─── */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: bg }}>
      {Topbar}
      {SideDrawer}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 48px', width: '100%' }}>
        {total === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: muted }}>
            <p style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>📭</p>
            <p style={{ fontWeight: 600 }}>Nessun prodotto disponibile per il cluster {fascia}.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Il master non ha ancora caricato i prodotti.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: muted, fontSize: 13 }}>
            Nessun prodotto trovato
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(prodotto => {
              const isDone = (statusMap[prodotto.id] || 'todo') === 'done'
              return (
                <ProductCard key={prodotto.id} prodotto={prodotto} isDone={isDone}
                  showNav={false} hasPrev={false} hasNext={false}
                  prevFn={() => {}} nextFn={() => {}} />
              )
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
