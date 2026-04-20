'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { getPDVList, getPDVUsers, createPDV, createUser, deleteUser, resetUserPassword, updateUserPermissions } from './actions'
import { getFascia } from '@/lib/fascia'

const fasciaBadge: Record<string, string> = {
  MINI: 'bg-green-100 text-green-800',
  MIDI: 'bg-blue-100 text-blue-800',
  MAXI: 'bg-purple-100 text-purple-800',
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

  // Anagrafica form
  const [codicePdv, setCodicePdv] = useState('')
  const [nomePdv, setNomePdv] = useState('')
  const [metratura, setMetratura] = useState('')

  // Utenze form
  const [selectedPdvId, setSelectedPdvId] = useState('')
  const [referente, setReferente] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [canSeeCoppie, setCanSeeCoppie] = useState(true)
  const [canSeeCluster, setCanSeeCluster] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string; pdv: string } | null>(null)
  const [copied, setCopied] = useState(false)

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

  const handleResetPassword = async (userId: string, email: string, pdvName: string) => {
    const newPassword = generatePassword()
    const result = await resetUserPassword(userId, newPassword)
    if (result.error) { alert(`Errore: ${result.error}`); return }
    setNewCredentials({ email, password: newPassword, pdv: pdvName })
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-6 border-b">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-green-600">Gestione Utenze</h1>
            <p className="text-gray-600 mt-1">{pdvList.length} PDV · {users.length} utenti attivi</p>
          </div>
          <Button onClick={() => router.push('/protected/home')} variant="outline">← Torna al menu</Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Banner credenziali */}
        {newCredentials && (
          <div className="bg-green-50 border-2 border-green-400 rounded-xl p-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-green-800 mb-1">Utenza creata: {newCredentials.pdv}</p>
              <p className="text-sm text-gray-700">Email: <span className="font-mono font-bold">{newCredentials.email}</span></p>
              <p className="text-sm text-gray-700">Password: <span className="font-mono font-bold">{newCredentials.password}</span></p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button onClick={() => copyCredentials(newCredentials.email, newCredentials.password)} className="bg-green-600 hover:bg-green-700 text-white">
                {copied ? 'Copiato!' : 'Copia credenziali'}
              </Button>
              <Button variant="outline" onClick={() => setNewCredentials(null)}>Chiudi</Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b bg-white rounded-t-xl overflow-hidden shadow-sm">
          <button
            onClick={() => setTab('anagrafica')}
            className={`flex-1 py-4 text-sm font-bold transition ${tab === 'anagrafica' ? 'bg-white border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Anagrafica PDV ({pdvList.length})
          </button>
          <button
            onClick={() => setTab('utenze')}
            className={`flex-1 py-4 text-sm font-bold transition ${tab === 'utenze' ? 'bg-white border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Utenze ({users.length})
          </button>
        </div>

        {/* TAB ANAGRAFICA */}
        {tab === 'anagrafica' && (
          <div className="space-y-6">
            <Card className="p-8">
              <h2 className="text-lg font-bold mb-5">Aggiungi PDV</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-bold mb-1">Codice PDV</label>
                  <Input value={codicePdv} onChange={(e) => setCodicePdv(e.target.value)} placeholder="es. 0123" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Nome PDV</label>
                  <Input value={nomePdv} onChange={(e) => setNomePdv(e.target.value)} placeholder="es. Coop Alleanza - Milano" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">
                    Metri quadri
                    {fascia && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${fasciaBadge[fascia]}`}>{fascia}</span>
                    )}
                  </label>
                  <Input type="number" value={metratura} onChange={(e) => setMetratura(e.target.value)} placeholder="es. 750" />
                </div>
              </div>
              <Button onClick={handleCreatePDV} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                {isLoading ? 'Salvataggio...' : 'Aggiungi PDV'}
              </Button>
            </Card>

            <Card className="p-8">
              <h2 className="text-lg font-bold mb-5">PDV registrati</h2>
              {pdvList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-3 text-left font-bold">Codice</th>
                        <th className="px-4 py-3 text-left font-bold">Nome PDV</th>
                        <th className="px-4 py-3 text-left font-bold">MQ</th>
                        <th className="px-4 py-3 text-left font-bold">Fascia</th>
                        <th className="px-4 py-3 text-left font-bold">Utenza</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pdvList.map((pdv: any) => {
                        const f = pdv.metratura_mq > 0 ? getFascia(pdv.metratura_mq) : null
                        const hasUser = users.some((u: any) => {
                          const uPdv = Array.isArray(u.pdv) ? u.pdv[0] : u.pdv
                          return uPdv?.id === pdv.id
                        })
                        return (
                          <tr key={pdv.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-gray-600">{pdv.code}</td>
                            <td className="px-4 py-3 font-medium">{pdv.name}</td>
                            <td className="px-4 py-3">{pdv.metratura_mq ? `${pdv.metratura_mq} mq` : '—'}</td>
                            <td className="px-4 py-3">
                              {f && <span className={`px-2 py-1 rounded-full text-xs font-bold ${fasciaBadge[f]}`}>{f}</span>}
                            </td>
                            <td className="px-4 py-3">
                              {hasUser
                                ? <span className="text-xs text-green-700 font-bold">Attiva</span>
                                : <span className="text-xs text-gray-400">Nessuna</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">Nessun PDV registrato</div>
              )}
            </Card>
          </div>
        )}

        {/* TAB UTENZE */}
        {tab === 'utenze' && (
          <div className="space-y-6">
            <Card className="p-8">
              <h2 className="text-lg font-bold mb-5">Crea utenza PDV</h2>
              {pdvList.length === 0 ? (
                <p className="text-gray-500">Aggiungi prima almeno un PDV nella tab <strong>Anagrafica PDV</strong>.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold mb-1">PDV</label>
                      <select
                        value={selectedPdvId}
                        onChange={(e) => setSelectedPdvId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
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
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Referente</label>
                      <Input value={referente} onChange={(e) => setReferente(e.target.value)} placeholder="Nome e Cognome" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Email accesso</label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="referente@email.it" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold mb-1">Password</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs"
                          >
                            {showPassword ? 'Nascondi' : 'Mostra'}
                          </button>
                        </div>
                        <Button type="button" variant="outline" onClick={() => { setPassword(generatePassword()); setShowPassword(true) }}>
                          Genera
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6 mb-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={canSeeCoppie} onChange={e => setCanSeeCoppie(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                      <span className="text-sm font-medium">Confronta & Conviene</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={canSeeCluster} onChange={e => setCanSeeCluster(e.target.checked)} className="w-4 h-4 accent-purple-600" />
                      <span className="text-sm font-medium">Cluster Analytics</span>
                    </label>
                  </div>
                  <Button onClick={handleCreateUser} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                    {isLoading ? 'Creazione...' : 'Crea utenza'}
                  </Button>
                </>
              )}
            </Card>

            <Card className="p-8">
              <h2 className="text-lg font-bold mb-5">Utenze attive</h2>
              {users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-3 text-left font-bold">Referente</th>
                        <th className="px-4 py-3 text-left font-bold">Email</th>
                        <th className="px-4 py-3 text-left font-bold">PDV</th>
                        <th className="px-4 py-3 text-center font-bold">Coppie</th>
                        <th className="px-4 py-3 text-center font-bold">Cluster</th>
                        <th className="px-4 py-3 text-left font-bold">Fascia</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u: any) => {
                        const uPdv = Array.isArray(u.pdv) ? u.pdv[0] : u.pdv
                        const f = uPdv?.metratura_mq > 0 ? getFascia(uPdv.metratura_mq) : null
                        return (
                          <tr key={u.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{u.name}</td>
                            <td className="px-4 py-3 text-gray-600">{u.email || '—'}</td>
                            <td className="px-4 py-3">{uPdv ? `${uPdv.code} — ${uPdv.name}` : '—'}</td>
                            <td className="px-4 py-3 text-center">
                              <input type="checkbox" checked={u.can_see_coppie ?? true} onChange={() => handleTogglePermission(u.id, 'can_see_coppie', u.can_see_coppie ?? true)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input type="checkbox" checked={u.can_see_cluster ?? true} onChange={() => handleTogglePermission(u.id, 'can_see_cluster', u.can_see_cluster ?? true)} className="w-4 h-4 accent-purple-600 cursor-pointer" />
                            </td>
                            <td className="px-4 py-3">
                              {f && <span className={`px-2 py-1 rounded-full text-xs font-bold ${fasciaBadge[f]}`}>{f}</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleResetPassword(u.id, u.email, uPdv?.name || u.name)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50 transition"
                                >
                                  Reimposta e copia
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-red-300 text-red-700 hover:bg-red-50 transition"
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
              ) : (
                <div className="text-center py-10 text-gray-500">Nessuna utenza creata</div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
