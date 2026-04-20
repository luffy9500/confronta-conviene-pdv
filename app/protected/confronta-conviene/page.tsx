'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getUserPDVId, getCoppieConStatus, updateCoppiaStatus } from './actions'

type StatusFilter = 'all' | 'done' | 'todo'

/* ─── PRODUCT BLOCK ─────────────────────────────────────── */
function ProductBlock({ img, brand, isCoop, name, artId, ean, price, saving }: {
  img?: string; brand: string; isCoop: boolean
  name: string; artId: string; ean: string; price: number; saving?: string
}) {
  return (
    <div className="flex flex-col items-center text-center px-4 py-4 gap-2">
      {img
        ? <img src={img} alt="" className="w-[72px] h-[72px] rounded-xl object-contain bg-gray-50 border border-gray-100" />
        : <div className={`w-[72px] h-[72px] rounded-xl border ${isCoop ? 'bg-red-50 border-red-100' : 'bg-gray-100 border-gray-200'}`} />
      }
      <div className="flex items-center justify-center gap-1.5">
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider ${isCoop ? 'bg-[#E2001A] text-white' : 'bg-gray-800 text-white'}`}>{brand}</span>
        {saving && <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{saving}</span>}
      </div>
      <p className="text-sm font-semibold leading-snug line-clamp-2 text-gray-800">{name || '—'}</p>
      <p className="text-[10px] text-gray-400 leading-tight">EAN {ean} · COD {artId}</p>
      <p className={`text-xl font-black ${isCoop ? 'text-[#E2001A]' : 'text-gray-800'}`}>€{Number(price).toFixed(2)}</p>
    </div>
  )
}

/* ─── PAGE ──────────────────────────────────────────────── */
export default function PDVCCPage() {
  const router = useRouter()
  const [pdvId, setPdvId]       = useState<string | null>(null)
  const [pdvName, setPdvName]   = useState('')
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

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f1f5f9' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#E2001A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Caricamento...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f1f5f9' }}>
      <div className="p-8 text-center bg-white rounded-2xl shadow-lg max-w-sm w-full">
        <p className="text-red-600 font-bold mb-4">{error}</p>
        <button onClick={() => router.push('/protected/home')} className="w-full py-2.5 border rounded-xl text-sm font-semibold">← Torna al menu</button>
      </div>
    </div>
  )

  /* ─── SIDE DRAWER (shared mobile/desktop) ─── */
  const SideDrawer = (
    <>
      {sideMenuOpen && (
        <button type="button" aria-label="Chiudi menu" onClick={closeMenu}
          className="fixed inset-0 z-30 cursor-default"
          style={{ background: 'rgba(0,0,0,0.55)', border: 'none', padding: 0 }} />
      )}
      <div
        className="fixed top-0 left-0 h-full z-40 flex flex-col transition-transform duration-300"
        style={{
          width: 288,
          background: '#1a3a5c',
          transform: sideMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: sideMenuOpen ? '12px 0 40px rgba(0,0,0,0.25)' : 'none',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-xs font-black tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Coppie</span>
          <button type="button" onClick={closeMenu}
            className="w-9 h-9 flex items-center justify-center rounded-full text-base"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
            ✕
          </button>
        </div>

        {/* Area filter pills */}
        <div className="flex gap-2 px-3 py-2.5 overflow-x-auto scrollbar-none border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {['all', ...areas].map(a => (
            <button key={a} type="button"
              onClick={() => { setAreaFilter(a); }}
              className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition"
              style={areaFilter === a
                ? { background: '#E2001A', color: '#fff' }
                : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }}>
              {a === 'all' ? 'TUTTI' : a}
            </button>
          ))}
        </div>

        {/* Status filters */}
        <div className="flex gap-1.5 px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {([['all','Tutte'],['done','✓ Fatte'],['todo','○ Da fare']] as [StatusFilter,string][]).map(([f, label]) => (
            <button key={f} type="button"
              onClick={() => setStatusFilter(f)}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition"
              style={statusFilter === f
                ? f === 'done' ? { background: 'rgba(22,163,74,0.15)', color: '#22c55e' }
                  : f === 'todo' ? { background: 'rgba(217,119,6,0.15)', color: '#fbbf24' }
                  : { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <input type="text" placeholder="Cerca…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }} />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c, idx) => {
            const isDone = (statusMap[c.id] || 'todo') === 'done'
            const isActive = isMobile ? currentIndex === filtered.indexOf(c) : false
            return (
              <button key={c.id} type="button"
                onClick={() => {
                  if (isMobile) setCurrentIndex(filtered.indexOf(c))
                  closeMenu()
                }}
                className="w-full text-left px-4 py-3 flex items-center gap-3 border-b"
                style={{
                  borderColor: 'rgba(255,255,255,0.03)',
                  borderLeft: isActive ? '3px solid #E2001A' : '3px solid transparent',
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>#{c.numero} · {(c.area || '').trim()}</p>
                  <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.82)' }}>{c.name_coop}</p>
                  <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{c.name_idm || '—'}</p>
                </div>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
                  style={isDone
                    ? { background: 'rgba(22,163,74,0.15)', color: '#22c55e' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' }}>
                  {isDone ? '✓' : '○'}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer stats */}
        <div className="border-t p-3 space-y-2.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-xl font-black" style={{ color: '#22c55e' }}>{done}</p>
              <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Fatte</p>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-xl font-black text-white">{todo}</p>
              <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Da fare</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  /* ─── TOPBAR (shared) ─── */
  const Topbar = (
    <div style={{ position: 'sticky', top: 0, zIndex: 20 }}>
      {/* Main bar */}
      <div className="flex items-center gap-2 px-3 h-14" style={{ background: '#0f2744', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button type="button" onClick={() => setSideMenuOpen(true)}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 40, height: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, flexShrink: 0, cursor: 'pointer' }}>
          <span style={{ display: 'block', width: 18, height: 2, borderRadius: 2, background: '#fff' }} />
          <span style={{ display: 'block', width: 18, height: 2, borderRadius: 2, background: '#fff' }} />
          <span style={{ display: 'block', width: 18, height: 2, borderRadius: 2, background: '#fff' }} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#E2001A', flexShrink: 0 }} />
          <span className="text-sm font-black text-white truncate" style={{ letterSpacing: '-0.3px' }}>Confronta &amp; Conviene</span>
        </div>
        <button type="button" onClick={() => router.push('/protected/home')}
          className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}>
          ← Menu
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#e2e8f0' }}>
        <div style={{ height: 3, width: `${percentage}%`, background: '#22c55e', transition: 'width 0.4s ease' }} />
      </div>

      {/* KPI + filtri subbar (mobile) */}
      {isMobile && (
        <div style={{ background: '#1a3a5c', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Conteggi */}
          <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{total} tot</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.15)', color: '#22c55e' }}>{done} fatte</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(217,119,6,0.15)', color: '#fbbf24' }}>{todo} mancanti</span>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginLeft: 4 }}>
              <div style={{ height: '100%', width: `${percentage}%`, background: '#22c55e', borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
            <span className="text-[10px] font-black shrink-0" style={{ color: '#a78bfa' }}>{percentage}%</span>
          </div>
          {/* Filtri stato */}
          <div className="flex px-3 pb-2 gap-1.5">
            {([['all','Tutte'],['done','✓ Fatte'],['todo','○ Da fare']] as [StatusFilter,string][]).map(([f, label]) => (
              <button key={f} type="button" onClick={() => setStatusFilter(f)}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition"
                style={statusFilter === f
                  ? f === 'done' ? { background: 'rgba(22,163,74,0.2)', color: '#22c55e' }
                    : f === 'todo' ? { background: 'rgba(217,119,6,0.2)', color: '#fbbf24' }
                    : { background: 'rgba(255,255,255,0.15)', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PDV name (mobile) */}
      {isMobile && pdvName && (
        <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: '#0f2744', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>PDV</span>
          <span className="text-[10px] font-bold text-white truncate">{pdvName}</span>
        </div>
      )}
    </div>
  )

  /* ─── PAIR CARD ─── */
  const PairCard = ({ coppia, isDone, showNav, prevFn, nextFn, hasPrev, hasNext }: any) => {
    const saving = savingLabel(coppia)
    return (
      <div className={`bg-white rounded-2xl overflow-hidden ${isDone ? 'ring-2 ring-green-400' : ''}`}
        style={{ boxShadow: isDone ? '0 0 0 2px #4ade80, 0 2px 12px rgba(0,0,0,0.08)' : '0 2px 12px rgba(0,0,0,0.08)' }}>

        {/* Card topbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#f1f5f9' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>#{coppia.numero}</span>
            {coppia.forte && <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">FORTE</span>}
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {isDone ? '✓ Fatto' : '○ Da fare'}
            </span>
          </div>
        </div>

        {/* Products */}
        <ProductBlock img={coppia.img_coop} brand="COOP" isCoop saving={saving}
          name={coppia.name_coop} artId={coppia.articolo_id_coop}
          ean={coppia.ean_coop} price={coppia.price_coop} />

        <div className="flex items-center gap-3 mx-4">
          <div className="flex-1 border-t border-dashed" style={{ borderColor: '#e2e8f0' }} />
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black"
            style={{ background: '#0f2744', color: '#fff' }}>VS</div>
          <div className="flex-1 border-t border-dashed" style={{ borderColor: '#e2e8f0' }} />
        </div>

        <ProductBlock img={coppia.img_idm} brand="IDM" isCoop={false}
          name={coppia.name_idm} artId={coppia.articolo_id_idm}
          ean={coppia.ean_idm} price={coppia.price_idm} />

        {/* Action bar */}
        <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: '#f1f5f9' }}>
          <button type="button"
            onClick={() => toggleStatus(coppia.id)}
            disabled={updating === coppia.id}
            className="flex-1 py-3.5 rounded-xl font-black text-sm transition"
            style={isDone
              ? { background: '#f1f5f9', color: '#94a3b8' }
              : { background: '#16a34a', color: '#fff', boxShadow: '0 3px 12px rgba(22,163,74,0.25)' }}>
            {updating === coppia.id ? '...' : isDone ? '○ Da fare' : '✓ Fatta'}
          </button>
          {showNav && (
            <div className="flex gap-1.5">
              <button type="button" onClick={prevFn} disabled={!hasPrev}
                className="w-12 h-12 rounded-xl font-bold text-lg flex items-center justify-center transition disabled:opacity-30"
                style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', color: '#475569' }}>
                ←
              </button>
              <button type="button" onClick={nextFn} disabled={!hasNext}
                className="w-12 h-12 rounded-xl font-bold text-lg flex items-center justify-center transition disabled:opacity-30"
                style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', color: '#475569' }}>
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
      <div className="min-h-screen flex flex-col" style={{ background: '#f1f5f9' }}>
        {Topbar}
        {SideDrawer}

        {total === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center text-gray-400 p-8">
            <p className="font-semibold">Nessuna coppia disponibile.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Nessuna coppia trovata</div>
        ) : (
          <div className="flex-1 flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div className="flex-1 p-3">
              <PairCard coppia={coppia} isDone={isDone}
                showNav={true}
                hasPrev={currentIndex > 0}
                hasNext={currentIndex < filtered.length - 1}
                prevFn={() => setCurrentIndex(i => Math.max(0, i - 1))}
                nextFn={() => setCurrentIndex(i => Math.min(filtered.length - 1, i + 1))} />
            </div>
            <div className="text-center pb-4 pt-1">
              <span className="text-xs" style={{ color: '#94a3b8' }}>
                <span className="font-bold text-sm text-gray-700">{currentIndex + 1}</span> / {filtered.length}
                {areaFilter !== 'all' && <span className="ml-2 text-blue-600 font-semibold">{areaFilter}</span>}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ─── DESKTOP ─── */
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f1f5f9' }}>
      {Topbar}
      {SideDrawer}

      {/* Desktop area pills */}
      {areas.length > 0 && (
        <div className="bg-white border-b px-6 py-2.5 overflow-x-auto">
          <div className="flex gap-2 max-w-5xl mx-auto" style={{ width: 'max-content', minWidth: '100%' }}>
            {['all', ...areas].map(a => (
              <button key={a} type="button" onClick={() => setAreaFilter(a)}
                className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition"
                style={areaFilter === a
                  ? { background: '#0f2744', color: '#fff' }
                  : { background: '#f1f5f9', color: '#475569' }}>
                {a === 'all' ? 'Tutti' : a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Desktop search + status tabs */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
          <input type="text" placeholder="Cerca prodotto…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-400" />
          <div className="flex gap-1 shrink-0">
            {([['all',`Tutte (${total})`],['done',`Fatte (${done})`],['todo',`Da fare (${todo})`]] as [StatusFilter,string][]).map(([f, label]) => (
              <button key={f} type="button" onClick={() => setStatusFilter(f)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition"
                style={statusFilter === f
                  ? f === 'done' ? { background: '#dcfce7', color: '#16a34a' }
                    : f === 'todo' ? { background: '#fef3c7', color: '#d97706' }
                    : { background: '#dbeafe', color: '#1d4ed8' }
                  : { background: '#f1f5f9', color: '#64748b' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 w-full space-y-4">
        {total === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3 opacity-30">👈</p>
            <p>Nessuna coppia disponibile.</p>
            <p className="text-sm mt-1">Il master non ha ancora caricato le coppie.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Nessuna coppia trovata</div>
        ) : (
          filtered.map((coppia, idx) => {
            const isDone = (statusMap[coppia.id] || 'todo') === 'done'
            return (
              <PairCard key={coppia.id} coppia={coppia} isDone={isDone}
                showNav={false} hasPrev={false} hasNext={false}
                prevFn={() => {}} nextFn={() => {}} />
            )
          })
        )}
        <div className="h-6" />
      </div>
    </div>
  )
}
