'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { getPDVList, getPDVUsers, createPDVUser } from './actions'

export default function GestioneProfilePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [pdvList, setPdvList] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [selectedPdv, setSelectedPdv] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [pdvResult, usersResult] = await Promise.all([getPDVList(), getPDVUsers()])
      if (pdvResult.success) setPdvList(pdvResult.pdvList || [])
      if (usersResult.success) setUsers(usersResult.users || [])
    } catch (error) {
      console.error('Load error:', error)
    }
  }

  const handleCreateUser = async () => {
    if (!email || !name || !password || !selectedPdv) { alert('Compila tutti i campi'); return }
    try {
      setIsLoading(true)
      const result = await createPDVUser(email, name, password, selectedPdv)
      if (result.success) {
        alert(`✅ Utente ${name} creato!`)
        setEmail(''); setName(''); setPassword(''); setSelectedPdv(null)
        await loadData()
      } else {
        alert(`❌ Errore: ${result.error}`)
      }
    } catch (error) {
      alert(`❌ Errore: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-6 border-b">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-green-600">👤 Gestione Profili</h1>
            <p className="text-gray-600 mt-1">{users.length} utenti PDV</p>
          </div>
          <Button onClick={() => router.push('/protected/home')} variant="outline">← Torna al menu</Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Crea Utente PDV */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6">➕ Crea Utente PDV</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold mb-2">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pdv@example.com" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Nome</label>
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome PDV" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">PDV</label>
              <select
                value={selectedPdv || ''}
                onChange={(e) => setSelectedPdv(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Seleziona PDV...</option>
                {pdvList.map((pdv) => (
                  <option key={pdv.id} value={pdv.id}>{pdv.name} — {pdv.city}</option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={handleCreateUser} disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6">
            {isLoading ? '⏳ Creazione...' : '✅ Crea Utente'}
          </Button>
        </Card>

        {/* Lista Utenti PDV */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6">📋 Utenti PDV Attivi</h2>
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold">Nome</th>
                    <th className="px-6 py-3 text-left font-bold">PDV</th>
                    <th className="px-6 py-3 text-left font-bold">Città</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{u.name}</td>
                      <td className="px-6 py-4">{u.pdv?.name || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{u.pdv?.city || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">Nessun utente PDV creato</div>
          )}
        </Card>
      </div>
    </div>
  )
}
