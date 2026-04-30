'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPDVList, getPDVUsers, createPDV, updatePDV, deletePDV, setPDVStatus, createUser, deleteUser, resetUserPassword, updateUserPermissions } from './actions'
import { getFascia } from '@/lib/fascia'

/* ─── Design tokens ─── */
const navy     = '#0f2236'
const red      = '#E2001A'
const green    = '#22c55e'
const greenBg  = '#f0fdf4'
const greenBorder = '#bbf7d0'
const greenDark = '#065f46'
const muted    = '#64748b'
const border   = '#e2e8f0'
const bg       = '#f1f5f9'
const text     = '#0f172a'

/* ─── FasciaBadge ─── */
const fasciaMap: Record<string, { bg: string; color: string }> = {
  MINI: { bg: '#d1fae5', color: '#065f46' },
  MIDI: { bg: '#dbeafe', color: '#1e40af' },
  MAXI: { bg: '#ede9fe', color: '#5b21b6' },
}
function FasciaBadge({ fascia }: { fascia: string }) {
  const c = fasciaMap[fascia] || { bg: bg, color: muted }
  return (
    <span style={{
      display: 'inline-block',
      background: c.bg, color: c.color,
      fontSize: 11, fontWeight: 700,
      padding: '2px 10px', borderRadius: 100,
    }}>
      {fascia}
    </span>
  )
}

/* ─── Toggle ─── */
function Toggle({ checked, onChange, color = green }: { checked: boolean; onChange: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: checked ? color : '#e2e8f0',
        position: 'relative', border: 'none', cursor: 'pointer',
        flexShrink: 0, transition: 'background .2s',
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', position: 'absolute', top: 2,
        left: checked ? 18 : 2, transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

/* ─── Input ─── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', fontSize: 14,
  border: `1.5px solid ${border}`, borderRadius: 10,
  background: '#fff', color: text, outline: 'none',
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

type Tab = 'anagrafica' | 'utenze'

export default function GestioneUtenzePage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('anagrafica')
  const [isLoading, setIsLoading] = useState(false)
  const [pdvList, setPdvList] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const [codicePdv, setCodicePdv] = useState('')
  const [nomePdv, setNomePdv] = useState('')
  const [metratura, setMetratura] = useState('')

  const [selectedPdvId, setSelectedPdvId] = useState('')
  const [referente, setReferente] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [canSeeCoppie, setCanSeeCoppie] = useState(true)
  const [canSeeCluster, setCanSeeCluster] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string; pdv: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Modal reimposta password
  const [resetTarget, setResetTarget] = useState<{ userId: string; email: string; pdvName: string } | null>(null)
  const [resetPwd, setResetPwd] = useState('')
  const [showResetPwd, setShowResetPwd] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Filtri anagrafica
  const [fasciaFilter, setFasciaFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modifica PDV inline
  const [editingPdv, setEditingPdv] = useState<any | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editMq, setEditMq] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const mq = parseInt(metratura) || 0
  const fascia = mq > 0 ? getFascia(mq) : null

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [pdvResult, usersResult] = await Promise.all([getPDVList(), getPDVUsers()])
    if (pdvResult.success) setPdvList(pdvResult.pdvList || [])
    if (usersResult.success) setUsers(usersResult.users || [])
  }

  const handleCreatePDV = async () => {
    if (!codicePdv || !nomePdv || !metratura) { alert('Compila tutti i campi'); return }
    setIsLoading(true)
    const result = await createPDV(codicePdv, nomePdv, parseInt(metratura))
    setIsLoading(false)
    if (result.error) { alert(`Errore: ${result.error}`); return }
    setCodicePdv(''); setNomePdv(''); setMetratura('')
    await loadData()
  }

  const handleCreateUser = async () => {
    if (!selectedPdvId || !referente || !email || !password) { alert('Compila tutti i campi'); return }
    setIsLoading(true)
    const pdv = pdvList.find(p => p.id === selectedPdvId)
    const result = await createUser(email, password, referente, selectedPdvId, canSeeCoppie, canSeeCluster)
    setIsLoading(false)
    if (result.error) { alert(`Errore: ${result.error}`); return }
    setNewCredentials({ email, password, pdv: pdv?.name || '' })
    setSelectedPdvId(''); setReferente(''); setEmail(''); setPassword(''); setCanSeeCoppie(true); setCanSeeCluster(true)
    await loadData()
  }

  const handleTogglePermission = async (userId: string, field: 'can_see_coppie' | 'can_see_cluster', current: boolean) => {
    const u = users.find(u => u.id === userId)
    if (!u) return
    const newCoppie = field === 'can_see_coppie' ? !current : (u.can_see_coppie ?? true)
    const newCluster = field === 'can_see_cluster' ? !current : (u.can_see_cluster ?? true)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, can_see_coppie: newCoppie, can_see_cluster: newCluster } : u))
    await updateUserPermissions(userId, newCoppie, newCluster)
  }

  const handleResetPassword = (userId: string, email: string, pdvName: string) => {
    setResetPwd(generatePassword())
    setShowResetPwd(true)
    setResetTarget({ userId, email, pdvName })
  }

  const handleConfirmReset = async () => {
    if (!resetTarget || !resetPwd) return
    setIsResetting(true)
    const result = await resetUserPassword(resetTarget.userId, resetPwd)
    setIsResetting(false)
    if (result.error) { alert(`Errore: ${result.error}`); return }
    setNewCredentials({ email: resetTarget.email, password: resetPwd, pdv: resetTarget.pdvName })
    setResetTarget(null)
    setResetPwd('')
  }

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Eliminare l'utenza di ${name}? L'operazione è irreversibile.`)) return
    const result = await deleteUser(userId)
    if (result.error) { alert(`Errore: ${result.error}`); return }
    await loadData()
  }

  const copyCredentials = async (e: string, p: string) => {
    await navigator.clipboard.writeText(`Email: ${e}\nPassword: ${p}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openEditPdv = (pdv: any) => {
    setEditingPdv(pdv)
    setEditCode(pdv.code)
    setEditName(pdv.name)
    setEditMq(pdv.metratura_mq ? String(pdv.metratura_mq) : '')
  }

  const handleSavePdv = async () => {
    if (!editCode || !editName || !editMq) { alert('Compila tutti i campi'); return }
    setIsSaving(true)
    const result = await updatePDV(editingPdv.id, editCode, editName, parseInt(editMq))
    setIsSaving(false)
    if (result.error) { alert(`Errore: ${result.error}`); return }
    setEditingPdv(null)
    await loadData()
  }

  const handleDeletePdv = async (pdv: any) => {
    const hasUser = users.some((u: any) => {
      const uPdv = Array.isArray(u.pdv) ? u.pdv[0] : u.pdv
      return uPdv?.id === pdv.id
    })
    const msg = hasUser
      ? `Il PDV "${pdv.name}" ha un'utenza attiva. Eliminandolo si perderà il collegamento. Continuare?`
      : `Eliminare il PDV "${pdv.name}"? L'operazione è irreversibile.`
    if (!confirm(msg)) return
    const result = await deletePDV(pdv.id)
    if (result.error) { alert(`Errore: ${result.error}`); return }
    await loadData()
  }

  const handleTogglePdvStatus = async (pdv: any) => {
    const next = pdv.status === 'active' ? 'inactive' : 'active'
    setPdvList(prev => prev.map(p => p.id === pdv.id ? { ...p, status: next } : p))
    const result = await setPDVStatus(pdv.id, next)
    if (result.error) {
      setPdvList(prev => prev.map(p => p.id === pdv.id ? { ...p, status: pdv.status } : p))
      alert(`Errore: ${result.error}`)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: bg }}>

      {/* ── HEADER ── */}
      <div style={{ background: navy, padding: '20px 24px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Brand row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Master
              </span>
            </div>
            <button
              onClick={() => router.push('/protected/home')}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              ← Menu
            </button>
          </div>

          {/* Title */}
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            Gestione Utenze
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
            {pdvList.length} PDV · {users.length} utenti attivi
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0 }}>
            {(['anagrafica', 'utenze'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '10px 20px', fontSize: 13, fontWeight: 700,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: tab === t ? '#fff' : 'rgba(255,255,255,0.45)',
                  borderBottom: tab === t ? `2.5px solid ${red}` : '2.5px solid transparent',
                  transition: 'color .15s',
                }}
              >
                {t === 'anagrafica' ? `Anagrafica PDV (${pdvList.length})` : `Utenze (${users.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px' }}>

        {/* Credential banner */}
        {newCredentials && (
          <div style={{
            background: greenBg, border: `1.5px solid ${greenBorder}`,
            borderRadius: 14, padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            marginBottom: 20,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: greenDark, marginBottom: 4 }}>
                Utenza creata: {newCredentials.pdv}
              </div>
              <div style={{ fontSize: 13, color: text }}>
                Email: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{newCredentials.email}</span>
              </div>
              <div style={{ fontSize: 13, color: text }}>
                Password: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{newCredentials.password}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => copyCredentials(newCredentials.email, newCredentials.password)}
                style={{ padding: '8px 16px', background: green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {copied ? 'Copiato!' : 'Copia credenziali'}
              </button>
              <button
                onClick={() => setNewCredentials(null)}
                style={{ padding: '8px 16px', background: '#fff', color: muted, border: `1.5px solid ${border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Chiudi
              </button>
            </div>
          </div>
        )}

        {/* ── TAB ANAGRAFICA ── */}
        {tab === 'anagrafica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Form aggiungi PDV */}
            <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${border}`, padding: '24px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 18 }}>Aggiungi PDV</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 14, marginBottom: 16 }}>
                <Field label="Codice PDV">
                  <input style={inputStyle} value={codicePdv} onChange={e => setCodicePdv(e.target.value)} placeholder="es. 0123" />
                </Field>
                <Field label="Nome PDV">
                  <input style={inputStyle} value={nomePdv} onChange={e => setNomePdv(e.target.value)} placeholder="es. Coop Alleanza - Milano" />
                </Field>
                <Field label={fascia ? <span>Metri quadri <FasciaBadge fascia={fascia} /></span> as any : 'Metri quadri'}>
                  <input style={inputStyle} type="number" value={metratura} onChange={e => setMetratura(e.target.value)} placeholder="es. 750" />
                </Field>
              </div>
              <button
                onClick={handleCreatePDV}
                disabled={isLoading}
                style={{ padding: '10px 22px', background: navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: isLoading ? 'default' : 'pointer', opacity: isLoading ? 0.6 : 1 }}
              >
                {isLoading ? 'Salvataggio...' : 'Aggiungi PDV'}
              </button>
            </div>

            {/* Tabella PDV */}
            <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${border}`, overflow: 'hidden' }}>
              {/* Toolbar filtri */}
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: text, marginRight: 4 }}>PDV registrati</span>
                <div style={{ flex: 1 }} />

                {/* Filtro stato */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {([['all', 'Tutti'], ['active', 'Attivi'], ['inactive', 'Inattivi']] as [string, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setStatusFilter(val)}
                      style={{
                        padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: statusFilter === val ? navy : 'transparent',
                        color: statusFilter === val ? '#fff' : muted,
                        border: `1.5px solid ${statusFilter === val ? navy : border}`,
                        transition: 'all .15s',
                      }}
                    >{label}</button>
                  ))}
                </div>

                {/* Filtro fascia */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {([['all', 'Tutte'], ['MINI', 'MINI'], ['MIDI', 'MIDI'], ['MAXI', 'MAXI']] as [string, string][]).map(([val, label]) => {
                    const fc = fasciaMap[val]
                    const isActive = fasciaFilter === val
                    return (
                      <button
                        key={val}
                        onClick={() => setFasciaFilter(val)}
                        style={{
                          padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          background: isActive ? (fc?.bg ?? bg) : 'transparent',
                          color: isActive ? (fc?.color ?? muted) : muted,
                          border: `1.5px solid ${isActive ? (fc?.bg ?? border) : border}`,
                          transition: 'all .15s',
                        }}
                      >{label}</button>
                    )
                  })}
                </div>
              </div>

              {(() => {
                const filtered = pdvList.filter(pdv => {
                  if (statusFilter !== 'all' && pdv.status !== statusFilter) return false
                  if (fasciaFilter !== 'all') {
                    const f = pdv.metratura_mq > 0 ? getFascia(pdv.metratura_mq) : null
                    if (f !== fasciaFilter) return false
                  }
                  return true
                })

                if (filtered.length === 0) return (
                  <div style={{ padding: '32px 24px', textAlign: 'center', color: muted, fontSize: 14 }}>
                    {pdvList.length === 0 ? 'Nessun PDV registrato' : 'Nessun PDV corrisponde ai filtri'}
                  </div>
                )

                return (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: `1.5px solid ${border}`, background: bg }}>
                          {['Codice', 'Nome PDV', 'MQ', 'Fascia', 'Stato', 'Utenza', ''].map(h => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((pdv: any) => {
                          const f = pdv.metratura_mq > 0 ? getFascia(pdv.metratura_mq) : null
                          const hasUser = users.some((u: any) => {
                            const uPdv = Array.isArray(u.pdv) ? u.pdv[0] : u.pdv
                            return uPdv?.id === pdv.id
                          })
                          const isActive = pdv.status === 'active'
                          return (
                            <tr key={pdv.id} style={{ borderBottom: `1px solid ${border}`, opacity: isActive ? 1 : 0.55 }}>
                              <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: muted, fontSize: 13 }}>{pdv.code}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: text }}>{pdv.name}</td>
                              <td style={{ padding: '12px 16px', color: muted }}>{pdv.metratura_mq ? `${pdv.metratura_mq} mq` : '—'}</td>
                              <td style={{ padding: '12px 16px' }}>{f ? <FasciaBadge fascia={f} /> : '—'}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <button
                                  onClick={() => handleTogglePdvStatus(pdv)}
                                  title={isActive ? 'Clicca per disattivare' : 'Clicca per attivare'}
                                  style={{
                                    padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                    background: isActive ? greenBg : bg,
                                    color: isActive ? greenDark : muted,
                                    border: `1.5px solid ${isActive ? greenBorder : border}`,
                                  }}
                                >
                                  {isActive ? '● Attivo' : '○ Inattivo'}
                                </button>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                {hasUser
                                  ? <span style={{ fontSize: 12, fontWeight: 700, color: greenDark }}>✓ Attiva</span>
                                  : <span style={{ fontSize: 12, color: muted }}>Nessuna</span>}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => openEditPdv(pdv)}
                                    style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1.5px solid ${border}`, background: '#fff', color: text, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  >
                                    Modifica
                                  </button>
                                  <button
                                    onClick={() => handleDeletePdv(pdv)}
                                    style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1.5px solid #fecaca', background: '#fff5f5', color: '#991b1b', cursor: 'pointer' }}
                                  >
                                    Elimina
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* ── MODAL MODIFICA PDV ── */}
        {editingPdv && (
          <>
            <div
              onClick={() => setEditingPdv(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50 }}
            />
            <div style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              zIndex: 51, width: '100%', maxWidth: 520, padding: '0 16px',
            }}>
              <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${border}`, padding: 28, boxShadow: '0 16px 48px rgba(15,34,54,0.18)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: text }}>Modifica PDV</div>
                  <button onClick={() => setEditingPdv(null)} style={{ width: 32, height: 32, borderRadius: 8, background: bg, border: 'none', fontSize: 16, color: muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
                  <Field label="Codice PDV">
                    <input style={inputStyle} value={editCode} onChange={e => setEditCode(e.target.value)} placeholder="es. 0123" />
                  </Field>
                  <Field label="Nome PDV">
                    <input style={inputStyle} value={editName} onChange={e => setEditName(e.target.value)} placeholder="es. Coop Alleanza - Milano" />
                  </Field>
                </div>
                <div style={{ marginBottom: 22 }}>
                  <Field label={(() => {
                    const mqE = parseInt(editMq) || 0
                    const fE = mqE > 0 ? getFascia(mqE) : null
                    return fE ? <span>Metri quadri <FasciaBadge fascia={fE} /></span> as any : 'Metri quadri'
                  })()}>
                    <input style={inputStyle} type="number" value={editMq} onChange={e => setEditMq(e.target.value)} placeholder="es. 750" />
                  </Field>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleSavePdv}
                    disabled={isSaving}
                    style={{ flex: 1, padding: '11px 0', background: navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.6 : 1 }}
                  >
                    {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
                  </button>
                  <button
                    onClick={() => setEditingPdv(null)}
                    style={{ padding: '11px 20px', background: bg, color: muted, border: `1.5px solid ${border}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── MODAL REIMPOSTA PASSWORD ── */}
        {resetTarget && (
          <>
            <div
              onClick={() => setResetTarget(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50 }}
            />
            <div style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              zIndex: 51, width: '100%', maxWidth: 460, padding: '0 16px',
            }}>
              <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${border}`, padding: 28, boxShadow: '0 16px 48px rgba(15,34,54,0.18)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: text }}>Reimposta password</div>
                  <button onClick={() => setResetTarget(null)} style={{ width: 32, height: 32, borderRadius: 8, background: bg, border: 'none', fontSize: 16, color: muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <div style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
                  Utente: <span style={{ fontWeight: 600, color: text }}>{resetTarget.email}</span>
                  {resetTarget.pdvName && <span style={{ marginLeft: 6, color: muted }}>· {resetTarget.pdvName}</span>}
                </div>

                <Field label="Nuova password">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        style={{ ...inputStyle, paddingRight: 70 }}
                        type={showResetPwd ? 'text' : 'password'}
                        value={resetPwd}
                        onChange={e => setResetPwd(e.target.value)}
                        placeholder="••••••••"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPwd(v => !v)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 12, color: muted, cursor: 'pointer' }}
                      >
                        {showResetPwd ? 'Nascondi' : 'Mostra'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setResetPwd(generatePassword()); setShowResetPwd(true) }}
                      style={{ padding: '10px 14px', background: bg, color: text, border: `1.5px solid ${border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                    >
                      Genera
                    </button>
                  </div>
                </Field>

                <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                  <button
                    onClick={handleConfirmReset}
                    disabled={isResetting || !resetPwd}
                    style={{ flex: 1, padding: '11px 0', background: !resetPwd ? muted : navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: isResetting || !resetPwd ? 'default' : 'pointer', opacity: isResetting ? 0.6 : 1 }}
                  >
                    {isResetting ? 'Salvataggio...' : 'Salva e mostra credenziali'}
                  </button>
                  <button
                    onClick={() => setResetTarget(null)}
                    style={{ padding: '11px 20px', background: bg, color: muted, border: `1.5px solid ${border}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── TAB UTENZE ── */}
        {tab === 'utenze' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Form crea utenza */}
            <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${border}`, padding: '24px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 18 }}>Crea utenza PDV</div>

              {pdvList.length === 0 ? (
                <p style={{ fontSize: 14, color: muted }}>Aggiungi prima almeno un PDV nella tab <strong>Anagrafica PDV</strong>.</p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <Field label="PDV">
                      <select
                        value={selectedPdvId}
                        onChange={e => setSelectedPdvId(e.target.value)}
                        style={{ ...inputStyle, gridColumn: '1 / -1' }}
                      >
                        <option value="">Seleziona PDV...</option>
                        {pdvList.map((pdv: any) => {
                          const f = pdv.metratura_mq > 0 ? getFascia(pdv.metratura_mq) : null
                          return (
                            <option key={pdv.id} value={pdv.id}>
                              {pdv.code} — {pdv.name}{f ? ` (${f})` : ''}
                            </option>
                          )
                        })}
                      </select>
                    </Field>
                    <div style={{ gridColumn: '1 / -1' }} />
                    <Field label="Referente">
                      <input style={inputStyle} value={referente} onChange={e => setReferente(e.target.value)} placeholder="Nome e Cognome" />
                    </Field>
                    <Field label="Email accesso">
                      <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="referente@email.it" />
                    </Field>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Field label="Password">
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input
                              style={{ ...inputStyle, paddingRight: 70 }}
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 12, color: muted, cursor: 'pointer' }}
                            >
                              {showPassword ? 'Nascondi' : 'Mostra'}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setPassword(generatePassword()); setShowPassword(true) }}
                            style={{ padding: '10px 14px', background: bg, color: text, border: `1.5px solid ${border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                          >
                            Genera
                          </button>
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/* Permissions row */}
                  <div style={{ background: bg, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: muted, marginRight: 4 }}>Accesso a:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Toggle checked={canSeeCoppie} onChange={() => setCanSeeCoppie(!canSeeCoppie)} color="#3b82f6" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: text }}>Confronta &amp; Conviene</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Toggle checked={canSeeCluster} onChange={() => setCanSeeCluster(!canSeeCluster)} color="#8b5cf6" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: text }}>Assortimenti e Cluster</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateUser}
                    disabled={isLoading}
                    style={{ padding: '10px 22px', background: navy, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: isLoading ? 'default' : 'pointer', opacity: isLoading ? 0.6 : 1 }}
                  >
                    {isLoading ? 'Creazione...' : 'Crea utenza'}
                  </button>
                </>
              )}
            </div>

            {/* Tabella utenze */}
            <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${border}`, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px 14px', fontSize: 15, fontWeight: 700, color: text }}>Utenze attive</div>
              {users.length === 0 ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', color: muted, fontSize: 14 }}>Nessuna utenza creata</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1.5px solid ${border}`, background: bg }}>
                        {['Referente', 'PDV', 'Fascia', 'Coppie', 'Cluster', ''].map((h, i) => (
                          <th key={i} style={{ padding: '10px 16px', textAlign: i >= 3 && i <= 4 ? 'center' : 'left', fontWeight: 700, color: muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u: any) => {
                        const uPdv = Array.isArray(u.pdv) ? u.pdv[0] : u.pdv
                        const f = uPdv?.metratura_mq > 0 ? getFascia(uPdv.metratura_mq) : null
                        return (
                          <tr key={u.id} style={{ borderBottom: `1px solid ${border}` }}>
                            {/* Referente + email stacked */}
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: text }}>{u.name}</div>
                              <div style={{ fontSize: 12, color: muted, marginTop: 1 }}>{u.email || '—'}</div>
                            </td>
                            {/* PDV + code stacked */}
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: text }}>{uPdv?.name || '—'}</div>
                              {uPdv?.code && <div style={{ fontSize: 12, color: muted, fontFamily: 'monospace', marginTop: 1 }}>{uPdv.code}</div>}
                            </td>
                            <td style={{ padding: '12px 16px' }}>{f ? <FasciaBadge fascia={f} /> : '—'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <Toggle
                                checked={u.can_see_coppie ?? true}
                                onChange={() => handleTogglePermission(u.id, 'can_see_coppie', u.can_see_coppie ?? true)}
                                color="#3b82f6"
                              />
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <Toggle
                                checked={u.can_see_cluster ?? true}
                                onChange={() => handleTogglePermission(u.id, 'can_see_cluster', u.can_see_cluster ?? true)}
                                color="#8b5cf6"
                              />
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => handleResetPassword(u.id, u.email, uPdv?.name || u.name)}
                                  style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1.5px solid ${border}`, background: '#fff', color: text, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                >
                                  Reimposta pwd
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1.5px solid #fecaca', background: '#fff5f5', color: '#991b1b', cursor: 'pointer' }}
                                >
                                  Elimina
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
