'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { getUserPDVId, getCoppieConStatus, updateCoppiaStatus } from './actions'

type StatusFilter = 'all' | 'done' | 'todo'

/* ─── Design tokens ─── */
const navy       = '#0f2236'
const navyLight  = '#1a3a5c'
const red        = '#E2001A'
const redLight   = '#fff5f5'
const redBorder  = '#fecaca'
const green      = '#22c55e'
const greenBg    = '#f0fdf4'
const greenBorder = '#bbf7d0'
const greenDark  = '#065f46'
const amber      = '#f59e0b'
const amberBg    = '#fffbeb'
const amberBorder = '#fde68a'
const amberDark  = '#92400e'
const border     = '#e2e8f0'
const bg         = '#f1f5f9'
const text       = '#0f172a'
const muted      = '#64748b'
const subtle     = '#94a3b8'

/* ─── ProductImage ─── */
function ProductImage({ ean, name, borderColor }: { ean?: string; name?: string; borderColor: string }) {
  const [imgUrl, setImgUrl] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    const params = new URLSearchParams()
    if (ean)  params.set('ean', ean.replace(/\D/g, ''))
    if (name) params.set('name', name)
    if (!params.toString()) { setImgUrl(null); return }
    fetch(`/api/product-image?${params}`)
      .then(r => r.json())
      .then(d => setImgUrl(d.url ?? null))
      .catch(() => setImgUrl(null))
  }, [ean, name])

  return (
    <div style={{
      width: 56, height: 56, borderRadius: 12, background: '#fff',
      border: `1px solid ${borderColor}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
    }}>
      {imgUrl
        ? <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <span style={{ fontSize: 9, color: subtle }}>{imgUrl === undefined ? '' : 'foto'}</span>
      }
    </div>
  )
}

/* ─── PAGE ──────────────────────────────────────────────── */
export default function PDVCCPage() {
  const router = useRouter()
  const [pdvId, setPdvId]       = useState<string | null>(null)
  const [pdvName, setPdvName]   = useState('')
  const [pdvCode, setPdvCode]   = useState('')
  const [coppie, setCoppie]     = useState<any[]>([])
  const [statusMap, setStatusMap] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [areaFilter, setAreaFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sideMenuOpen, setSideMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { loadData() }, [])
  useEffect(() => { setCurrentIndex(0) }, [statusFilter, areaFilter, search])

  const loadData = async () => {
    setIsLoading(true)
    const pdvRes = await getUserPDVId()
    if (!pdvRes.success || !pdvRes.pdvId) {
      setError(pdvRes.error || 'PDV non trovato')
      setIsLoading(false)
      return
    }
    setPdvId(pdvRes.pdvId)
    setPdvName(pdvRes.pdvName || '')
    setPdvCode(pdvRes.pdvCode || '')
    const dataRes = await getCoppieConStatus(pdvRes.pdvId)
    if (dataRes.success) {
      setCoppie(dataRes.coppie || [])
      setStatusMap(dataRes.statusMap || {})
    }
    setIsLoading(false)
  }

  const toggleStatus = async (coppiaId: string) => {
    if (!pdvId || updating) return
    const next = (statusMap[coppiaId] || 'todo') === 'done' ? 'todo' : 'done'
    setUpdating(coppiaId)
    setStatusMap(prev => ({ ...prev, [coppiaId]: next }))
    await updateCoppiaStatus(pdvId, coppiaId, next)
    setUpdating(null)
  }

  const areas = useMemo(() => {
    const set = new Set(coppie.map(c => (c.area || '').trim()).filter(Boolean))
    return Array.from(set).sort()
  }, [coppie])

  const done      = Object.values(statusMap).filter(s => s === 'done').length
  const total     = coppie.length
  const todo      = total - done
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0

  const filtered = useMemo(() => coppie.filter(c => {
    const s = statusMap[c.id] || 'todo'
    if (statusFilter !== 'all' && s !== statusFilter) return false
    if (areaFilter !== 'all' && (c.area || '').trim() !== areaFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!c.name_coop?.toLowerCase().includes(q) && !c.name_idm?.toLowerCase().includes(q) && !String(c.numero).includes(q)) return false
    }
    return true
  }), [coppie, statusMap, statusFilter, areaFilter, search])

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

  const savingLabel = (coppia: any) => {
    const pCoop = Number(coppia.price_coop)
    const pIdm  = Number(coppia.price_idm)
    if (pIdm > pCoop && pIdm > 0) {
      const pct = Math.round(((pIdm - pCoop) / pIdm) * 100)
      return `-${pct}%`
    }
    return undefined
  }

  const closeMenu = () => setSideMenuOpen(false)

  const downloadReport = () => {
    const rows = coppie.map(c => ({
      'N° Coppia': c.numero,
      'Area': c.area || '',
      'Nome COOP': c.name_coop || '',
      'EAN COOP': c.ean_coop || '',
      'Prezzo COOP': c.price_coop ?? '',
      'Nome IDM': c.name_idm || '',
      'EAN IDM': c.ean_idm || '',
      'Prezzo IDM': c.price_idm ?? '',
      'Stato': (statusMap[c.id] || 'todo') === 'done' ? 'Fatta' : 'Non fatta',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Coppie')
    const date = new Date().toISOString().slice(0, 10)
    const prefix = pdvCode ? `report_coppie_${pdvCode}` : 'report_coppie'
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
        {/* Drawer header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Coppie</span>
          <button type="button" onClick={closeMenu}
            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', fontSize: 14 }}>
            ✕
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <input type="text" placeholder="Cerca…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12, outline: 'none', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', boxSizing: 'border-box' }} />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map((c) => {
            const isDone = (statusMap[c.id] || 'todo') === 'done'
            const isActive = isMobile ? currentIndex === filtered.indexOf(c) : false
            return (
              <button key={c.id} type="button"
                onClick={() => { if (isMobile) setCurrentIndex(filtered.indexOf(c)); closeMenu() }}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  borderLeft: isActive ? `3px solid ${red}` : '3px solid transparent',
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  cursor: 'pointer', border: 'none',
                  borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: isActive ? red : 'transparent',
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.25)', marginBottom: 2 }}>#{c.numero} · {(c.area || '').trim()}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name_coop}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{c.name_idm || '—'}</p>
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

        {/* Footer stats */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: green, margin: 0 }}>{done}</p>
              <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Fatte</p>
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
  const Topbar = (
    <div style={{ position: 'sticky', top: 0, zIndex: 20 }}>
      {/* Main bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 56, background: navy, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button type="button" onClick={() => setSideMenuOpen(true)}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 40, height: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 0, cursor: 'pointer' }}>
          <span style={{ display: 'block', width: 18, height: 2, borderRadius: 2, background: '#fff' }} />
          <span style={{ display: 'block', width: 18, height: 2, borderRadius: 2, background: '#fff' }} />
          <span style={{ display: 'block', width: 18, height: 2, borderRadius: 2, background: '#fff' }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Hub Punto Vendita
          </span>
        </div>
        <button type="button" onClick={() => router.push('/protected/home')}
          style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', flexShrink: 0 }}>
          ← Menu
        </button>
      </div>

      {/* Thin progress line */}
      <div style={{ height: 3, background: '#e2e8f0' }}>
        <div style={{ height: 3, width: `${percentage}%`, background: green, transition: 'width 0.4s ease' }} />
      </div>

      {/* KPI subbar */}
      <div style={{ background: navyLight, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 6px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{total} tot</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: 'rgba(22,163,74,0.15)', color: green }}>{done} fatte</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>{todo} mancano</span>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginLeft: 4 }}>
            <div style={{ height: '100%', width: `${percentage}%`, background: green, borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 900, color: '#a78bfa', flexShrink: 0 }}>{percentage}%</span>
          {total > 0 && (
            <button
              type="button"
              onClick={downloadReport}
              title="Scarica report Excel"
              style={{ padding: '3px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              ↓ Excel
            </button>
          )}
        </div>
      </div>

      {/* Filter bar — WHITE CARD style */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${border}`, padding: '8px 16px', display: 'flex', gap: 6, overflowX: 'auto', alignItems: 'center' }}>
        {/* Status pills */}
        {([
          ['all',  `Tutte (${total})`],
          ['done', `✓ Fatte (${done})`],
          ['todo', `○ Da fare (${todo})`],
        ] as [StatusFilter, string][]).map(([f, label]) => {
          const isActive = statusFilter === f
          let pillStyle: React.CSSProperties
          if (isActive && f === 'done') {
            pillStyle = { background: greenBg, color: greenDark, border: `1px solid ${greenBorder}` }
          } else if (isActive && f === 'todo') {
            pillStyle = { background: amberBg, color: amberDark, border: `1px solid ${amberBorder}` }
          } else if (isActive) {
            pillStyle = { background: '#1a1a1a', color: '#fff', border: '1px solid #1a1a1a' }
          } else {
            pillStyle = { background: 'transparent', color: muted, border: `1px solid ${border}` }
          }
          return (
            <button key={f} type="button" onClick={() => setStatusFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', ...pillStyle }}>
              {label}
            </button>
          )
        })}

        <div style={{ flex: 1 }} />

        {/* Area dropdown */}
        <select
          value={areaFilter}
          onChange={e => setAreaFilter(e.target.value)}
          style={{ fontSize: 12, padding: '6px 12px', border: `1.5px solid ${border}`, borderRadius: 100, background: '#fff', color: text, outline: 'none', cursor: 'pointer' }}>
          <option value="all">Tutte le aree</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* PDV name strip */}
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

  /* ─── PAIR CARD ─── */
  const PairCard = ({ coppia, isDone, showNav, prevFn, nextFn, hasPrev, hasNext }: any) => {
    const saving = savingLabel(coppia)
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
        <div style={{
          background: '#f8fafc',
          padding: '10px 16px',
          borderBottom: `1px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: subtle }}>#{coppia.numero}</span>
            {coppia.area && <span style={{ fontSize: 11, color: muted, fontWeight: 600 }}>{(coppia.area || '').trim()}</span>}
            {coppia.forte && (
              <span style={{ fontSize: 9, fontWeight: 900, background: redLight, color: red, border: `1px solid ${redBorder}`, padding: '2px 7px', borderRadius: 100 }}>
                FORTE
              </span>
            )}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
            ...(isDone
              ? { background: greenBg, color: greenDark, border: `1px solid ${greenBorder}` }
              : { background: '#f1f5f9', color: muted, border: `1px solid ${border}` }),
          }}>
            {isDone ? '✓ Fatta' : '○ Da fare'}
          </span>
        </div>

        {/* IDM row — top, neutral */}
        <div style={{ background: '#f8fafc', padding: '14px 18px', display: 'flex', flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <ProductImage ean={coppia.ean_idm} name={coppia.name_idm} borderColor={border} />

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ background: '#e2e8f0', color: '#475569', fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 100 }}>IDM</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: text, lineHeight: 1.3, marginBottom: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {coppia.name_idm || '—'}
            </p>
            <p style={{ fontSize: 10, color: subtle }}>EAN {coppia.ean_idm}</p>
          </div>

          {/* Price */}
          <div style={{ fontSize: 22, fontWeight: 800, color: muted, flexShrink: 0 }}>
            €{Number(coppia.price_idm).toFixed(2)}
          </div>
        </div>

        {/* CC logo overlapping both product rows */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2, margin: '-22px 0', pointerEvents: 'none' }}>
          <img src="/cc_logo_nobg.png" alt="Confronta & Conviene" style={{ height: 56, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }} />
        </div>

        {/* COOP row — bottom, warm red (conveniente) */}
        <div style={{ background: redLight, padding: '14px 18px', display: 'flex', flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <ProductImage ean={coppia.ean_coop} name={coppia.name_coop} borderColor={redBorder} />

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ background: red, color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 100 }}>COOP</span>
              {saving && <span style={{ background: green, color: '#fff', fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 100, boxShadow: '0 2px 8px rgba(34,197,94,0.35)' }}>{saving}</span>}
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: text, lineHeight: 1.3, marginBottom: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {coppia.name_coop || '—'}
            </p>
            <p style={{ fontSize: 10, color: subtle }}>EAN {coppia.ean_coop}</p>
          </div>

          {/* Price */}
          <div style={{ fontSize: 22, fontWeight: 800, color: red, flexShrink: 0 }}>
            €{Number(coppia.price_coop).toFixed(2)}
          </div>
        </div>

        {/* Action bar */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${border}`, display: 'flex', gap: 8 }}>
          <button type="button"
            onClick={() => toggleStatus(coppia.id)}
            disabled={updating === coppia.id}
            style={{
              flex: 1, padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              ...(isDone
                ? { background: '#f1f5f9', color: muted, border: `1.5px solid ${border}` }
                : { background: green, color: '#fff', border: `1.5px solid ${green}` }),
            }}>
            {updating === coppia.id ? '...' : isDone ? '○ Segna da fare' : '✓ Segna come fatta'}
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
    const coppia = filtered[currentIndex]
    const isDone = coppia ? (statusMap[coppia.id] || 'todo') === 'done' : false

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: bg }}>
        {Topbar}
        {SideDrawer}

        {total === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: muted, padding: 32 }}>
            <p style={{ fontWeight: 600 }}>Nessuna coppia disponibile.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, fontSize: 13 }}>
            Nessuna coppia trovata
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div style={{ flex: 1, padding: 12 }}>
              <PairCard coppia={coppia} isDone={isDone}
                showNav={true}
                hasPrev={currentIndex > 0}
                hasNext={currentIndex < filtered.length - 1}
                prevFn={() => setCurrentIndex(i => Math.max(0, i - 1))}
                nextFn={() => setCurrentIndex(i => Math.min(filtered.length - 1, i + 1))} />
            </div>
            <div style={{ textAlign: 'center', paddingBottom: 16, paddingTop: 4 }}>
              <span style={{ fontSize: 12, color: subtle }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: text }}>{currentIndex + 1}</span>
                {' / '}{filtered.length}
                {areaFilter !== 'all' && <span style={{ marginLeft: 8, color: '#3b82f6', fontWeight: 600 }}>{areaFilter}</span>}
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
            <p style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>👈</p>
            <p style={{ fontWeight: 600 }}>Nessuna coppia disponibile.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Il master non ha ancora caricato le coppie.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: muted, fontSize: 13 }}>
            Nessuna coppia trovata
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map((coppia) => {
              const isDone = (statusMap[coppia.id] || 'todo') === 'done'
              return (
                <PairCard key={coppia.id} coppia={coppia} isDone={isDone}
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
