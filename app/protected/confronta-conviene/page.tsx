'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { getUserPDVId, getCoppieConStatus, updateCoppiaStatus } from './actions'

type Filter = 'all' | 'done' | 'todo'

export default function PDVCCPage() {
  const router = useRouter()
  const [pdvId, setPdvId] = useState<string | null>(null)
  const [pdvName, setPdvName] = useState('')
  const [userName, setUserName] = useState('')
  const [coppie, setCoppie] = useState<any[]>([])
  const [statusMap, setStatusMap] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

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
    setUserName(pdvRes.userName || '')

    const dataRes = await getCoppieConStatus(pdvRes.pdvId)
    if (dataRes.success) {
      setCoppie(dataRes.coppie || [])
      setStatusMap(dataRes.statusMap || {})
    }
    setIsLoading(false)
  }

  const toggleStatus = async (coppiaId: string) => {
    if (!pdvId || updating) return
    const current = statusMap[coppiaId] || 'todo'
    const next = current === 'done' ? 'todo' : 'done'
    setUpdating(coppiaId)
    setStatusMap(prev => ({ ...prev, [coppiaId]: next }))
    await updateCoppiaStatus(pdvId, coppiaId, next)
    setUpdating(null)
  }

  const done = Object.values(statusMap).filter(s => s === 'done').length
  const total = coppie.length
  const todo = total - done
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0

  const filtered = coppie.filter(c => {
    const s = statusMap[c.id] || 'todo'
    const matchFilter = filter === 'all' || s === filter
    const matchSearch = !search ||
      c.name_coop?.toLowerCase().includes(search.toLowerCase()) ||
      c.name_idm?.toLowerCase().includes(search.toLowerCase()) ||
      String(c.numero).includes(search)
    return matchFilter && matchSearch
  })

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-8 text-center max-w-sm">
        <p className="text-red-600 font-bold mb-4">{error}</p>
        <Button onClick={() => router.push('/protected/home')} variant="outline">← Torna al menu</Button>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-6 border-b">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Confronta & Conviene</h1>
            <p className="text-gray-600 mt-0.5">{pdvName} · {userName}</p>
          </div>
          <Button onClick={() => router.push('/protected/home')} variant="outline">← Menu</Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-5 bg-blue-50 border-blue-200">
            <div className="text-3xl font-bold text-blue-600">{total}</div>
            <div className="text-xs text-gray-500 mt-1">Totali</div>
          </Card>
          <Card className="p-5 bg-green-50 border-green-200">
            <div className="text-3xl font-bold text-green-600">{done}</div>
            <div className="text-xs text-gray-500 mt-1">Fatte</div>
          </Card>
          <Card className="p-5 bg-amber-50 border-amber-200">
            <div className="text-3xl font-bold text-amber-600">{todo}</div>
            <div className="text-xs text-gray-500 mt-1">Mancanti</div>
          </Card>
          <Card className="p-5 bg-purple-50 border-purple-200">
            <div className="text-3xl font-bold text-purple-600">{percentage}%</div>
            <div className="text-xs text-gray-500 mt-1">Avanzamento</div>
          </Card>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Filtri + ricerca */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'todo', 'done'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                filter === f
                  ? f === 'done' ? 'bg-green-600 text-white' : f === 'todo' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? `Tutte (${total})` : f === 'done' ? `Fatte (${done})` : `Mancanti (${todo})`}
            </button>
          ))}
          <input
            type="text"
            placeholder="Cerca coppia..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-40 px-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Lista coppie */}
        {total === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Nessuna coppia disponibile.</p>
            <p className="text-sm mt-1">Il master non ha ancora caricato le coppie.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(coppia => {
              const isDone = (statusMap[coppia.id] || 'todo') === 'done'
              return (
                <Card key={coppia.id} className={`p-5 border-2 transition ${isDone ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xs font-bold text-red-600 uppercase">Coppia #{coppia.numero}</span>
                      {coppia.area && <span className="text-xs text-gray-500 ml-2">{coppia.area}</span>}
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDone ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {isDone ? 'Completata' : 'In sospeso'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="border-r pr-4">
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">COOP</span>
                      <div className="mt-2">
                        <div className="font-semibold text-sm">{coppia.name_coop}</div>
                        <div className="text-xs text-gray-400">Cod: {coppia.articolo_id_coop} · EAN: {coppia.ean_coop}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-xl font-bold text-red-600">€{Number(coppia.price_coop).toFixed(2)}</div>
                          {coppia.forte && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">FORTE</span>}
                        </div>
                      </div>
                    </div>
                    <div className="pl-4">
                      <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">IDM</span>
                      <div className="mt-2">
                          <div className="font-semibold text-sm">{coppia.name_idm || '—'}</div>
                        <div className="text-xs text-gray-400">Cod: {coppia.articolo_id_idm || '—'} · EAN: {coppia.ean_idm || '—'}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-xl font-bold text-gray-800">€{Number(coppia.price_idm).toFixed(2)}</div>
                          {coppia.discount_pct > 0 && (
                            <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">-{coppia.discount_pct}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleStatus(coppia.id)}
                    disabled={updating === coppia.id}
                    className={`w-full py-2.5 rounded-lg font-bold text-sm transition ${
                      isDone
                        ? 'bg-gray-200 text-gray-600 hover:bg-amber-100 hover:text-amber-800'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {updating === coppia.id ? '...' : isDone ? 'Segna come mancante' : 'Segna come fatto'}
                  </button>
                </Card>
              )
            })}
            {filtered.length === 0 && (
              <div className="text-center py-10 text-gray-400">Nessuna coppia trovata</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
