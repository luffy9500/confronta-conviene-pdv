'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import {
  uploadCoppie,
  createIspettore,
  assignPDVToIspettore,
  removePDVFromIspettore,
  getKPINetwork,
  getIspettori,
  getCoppieCount
} from './actions'

type TabType = 'coppie' | 'ispettori' | 'kpi'

export default function MasterCCPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('kpi')
  const [isLoading, setIsLoading] = useState(false)

  // ========== COPPIE UPLOAD ==========
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [coppieCount, setCoppieCount] = useState(0)

  // ========== ISPETTORI ==========
  const [newIspEmail, setNewIspEmail] = useState('')
  const [newIspName, setNewIspName] = useState('')
  const [newIspPassword, setNewIspPassword] = useState('')
  const [ispettori, setIspettori] = useState<any[]>([])
  const [pdvList, setPdvList] = useState<any[]>([])
  const [selectedIsp, setSelectedIsp] = useState<string | null>(null)
  const [selectedPdv, setSelectedPdv] = useState<string | null>(null)

  // ========== KPI NETWORK ==========
  const [kpiData, setKpiData] = useState<any>(null)

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      // Carica PDV
      const { data: pdv } = await supabase
        .from('pdv')
        .select('id, code, name, city, province')
        .eq('status', 'active')
      setPdvList(pdv || [])

      // Carica ispettori
      const ispResult = await getIspettori()
      if (ispResult.success) {
        setIspettori(ispResult.ispettori || [])
      }

      // Carica count coppie
      const copResult = await getCoppieCount()
      if (copResult.success) {
        setCoppieCount(copResult.count || 0)
      }

      // Carica KPI network
      await loadKPI()
    } catch (error) {
      console.error('Load initial data error:', error)
    }
  }

  const loadKPI = async () => {
    try {
      const result = await getKPINetwork()
      if (result.success) {
        setKpiData(result)
      }
    } catch (error) {
      console.error('Load KPI error:', error)
    }
  }

  // ========== UPLOAD COPPIE ==========
  const handleUploadCoppie = async () => {
    if (!uploadFile) {
      alert('Seleziona un file Excel')
      return
    }

    try {
      setIsLoading(true)
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'array' })
          const worksheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          const result = await uploadCoppie(jsonData)
          if (result.success) {
            alert(`✅ Caricate ${result.count} coppie!`)
            setCoppieCount(result.count || 0)
            setUploadFile(null)
            await loadKPI()
          } else {
            alert(`❌ Errore: ${result.error}`)
          }
        } catch (error) {
          alert(`❌ Errore lettura file: ${error}`)
        } finally {
          setIsLoading(false)
        }
      }
      reader.readAsArrayBuffer(uploadFile)
    } catch (error) {
      alert(`❌ Errore: ${error}`)
      setIsLoading(false)
    }
  }

  // ========== CREA ISPETTORE ==========
  const handleCreateIspettore = async () => {
    if (!newIspEmail || !newIspName || !newIspPassword) {
      alert('Compila tutti i campi')
      return
    }

    try {
      setIsLoading(true)
      const result = await createIspettore(newIspEmail, newIspName, newIspPassword)
      if (result.success) {
        alert(`✅ Ispettore ${newIspName} creato!`)
        setNewIspEmail('')
        setNewIspName('')
        setNewIspPassword('')
        await loadInitialData()
      } else {
        alert(`❌ Errore: ${result.error}`)
      }
    } catch (error) {
      alert(`❌ Errore: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // ========== ASSEGNA PDV ==========
  const handleAssignPDV = async () => {
    if (!selectedIsp || !selectedPdv) {
      alert('Seleziona ispettore e PDV')
      return
    }

    try {
      setIsLoading(true)
      const result = await assignPDVToIspettore(selectedIsp, selectedPdv)
      if (result.success) {
        alert('✅ PDV assegnato!')
        setSelectedPdv(null)
        await loadInitialData()
      } else {
        alert(`❌ Errore: ${result.error}`)
      }
    } catch (error) {
      alert(`❌ Errore: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // ========== RIMUOVI PDV ==========
  const handleRemovePDV = async (ispId: string, pdvId: string) => {
    if (!confirm('Vuoi rimuovere questa assegnazione?')) return

    try {
      setIsLoading(true)
      const result = await removePDVFromIspettore(ispId, pdvId)
      if (result.success) {
        alert('✅ Assegnazione rimossa!')
        await loadInitialData()
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
      {/* HEADER */}
      <header className="bg-white shadow-sm p-6 border-b">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">🔄 Master Dashboard</h1>
            <p className="text-gray-600 mt-1">Confronta & Conviene</p>
          </div>
          <Button
            onClick={() => router.push('/protected/home')}
            variant="outline"
          >
            ← Torna al menu
          </Button>
        </div>
      </header>

      {/* TABS */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('kpi')}
            className={`px-4 py-3 font-bold text-sm transition ${
              activeTab === 'kpi'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 KPI Network ({coppieCount} coppie)
          </button>
          <button
            onClick={() => setActiveTab('coppie')}
            className={`px-4 py-3 font-bold text-sm transition ${
              activeTab === 'coppie'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📦 Carica Coppie
          </button>
          <button
            onClick={() => setActiveTab('ispettori')}
            className={`px-4 py-3 font-bold text-sm transition ${
              activeTab === 'ispettori'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👥 Gestione Ispettori ({ispettori.length})
          </button>
        </div>

        {/* CONTENT */}
        {activeTab === 'kpi' && (
          <div className="space-y-6">
            {/* Network Stats */}
            {kpiData?.network && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 bg-blue-50 border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {kpiData.network.totalCoppie}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Coppie Totali</div>
                </Card>
                <Card className="p-6 bg-green-50 border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {kpiData.network.totalDone}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Completate</div>
                </Card>
                <Card className="p-6 bg-amber-50 border-amber-200">
                  <div className="text-2xl font-bold text-amber-600">
                    {kpiData.network.totalTodo}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">In Sospeso</div>
                </Card>
                <Card className="p-6 bg-purple-50 border-purple-200">
                  <div className="text-2xl font-bold text-purple-600">
                    {kpiData.network.networkPercentage}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Avanzamento</div>
                </Card>
              </div>
            )}

            {/* Progress Bar */}
            {kpiData?.network && (
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">Avanzamento Rete</h3>
                  <span className="text-sm font-bold text-purple-600">
                    {kpiData.network.networkPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all duration-500"
                    style={{
                      width: `${kpiData.network.networkPercentage}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* PDV Table */}
            {kpiData?.pdvList && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-6 border-b">
                  <h3 className="font-bold text-lg">Dettaglio PDV</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left font-bold">PDV</th>
                        <th className="px-6 py-3 text-left font-bold">Città</th>
                        <th className="px-6 py-3 text-center font-bold">Done</th>
                        <th className="px-6 py-3 text-center font-bold">Todo</th>
                        <th className="px-6 py-3 text-center font-bold">Avanzamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpiData.pdvList.map((pdv: any) => (
                        <tr key={pdv.pdvId} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium">{pdv.pdvName}</td>
                          <td className="px-6 py-4 text-gray-600">{pdv.city}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                              {pdv.done}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">
                              {pdv.todo}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${pdv.percentage}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold">{pdv.percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <div className="flex justify-center">
              <Button
                onClick={loadKPI}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                🔄 Aggiorna KPI
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'coppie' && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6">📦 Carica Coppie (Excel)</h2>
            <p className="text-gray-600 mb-6">
              Carica un file Excel con le coppie COOP vs IDM. Se il file contiene coppie già caricate, verranno aggiornate.
            </p>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer"
                >
                  <div className="text-4xl mb-2">📁</div>
                  <div className="font-bold text-gray-800">
                    {uploadFile ? uploadFile.name : 'Seleziona file Excel'}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Oppure trascina il file qui
                  </div>
                </label>
              </div>

              <Button
                onClick={handleUploadCoppie}
                disabled={!uploadFile || isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3"
              >
                {isLoading ? '⏳ Caricamento...' : '✅ Carica Coppie'}
              </Button>
            </div>

            {coppieCount > 0 && (
              <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-green-800 font-bold">
                  ✅ {coppieCount} coppie caricate nel sistema
                </div>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'ispettori' && (
          <div className="space-y-6">
            {/* Crea Ispettore */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6">👤 Crea Ispettore</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Email</label>
                  <Input
                    type="email"
                    value={newIspEmail}
                    onChange={(e) => setNewIspEmail(e.target.value)}
                    placeholder="ispettore@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Nome</label>
                  <Input
                    type="text"
                    value={newIspName}
                    onChange={(e) => setNewIspName(e.target.value)}
                    placeholder="Nome Cognome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Password</label>
                  <Input
                    type="password"
                    value={newIspPassword}
                    onChange={(e) => setNewIspPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateIspettore}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6"
              >
                {isLoading ? '⏳ Creazione...' : '➕ Crea Ispettore'}
              </Button>
            </Card>

            {/* Assegna PDV */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6">📍 Assegna PDV</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Ispettore</label>
                  <select
                    value={selectedIsp || ''}
                    onChange={(e) => setSelectedIsp(e.target.value || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Seleziona ispettore...</option>
                    {ispettori.map((isp) => (
                      <option key={isp.id} value={isp.id}>
                        {isp.name} ({isp.pdvCount} PDV)
                      </option>
                    ))}
                  </select>
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
                      <option key={pdv.id} value={pdv.id}>
                        {pdv.name} ({pdv.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleAssignPDV}
                    disabled={!selectedIsp || !selectedPdv || isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    {isLoading ? '⏳ Assegnazione...' : '✅ Assegna'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Lista Ispettori */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6">📋 Ispettori Attivi</h2>

              <div className="space-y-4">
                {ispettori.map((isp) => (
                  <div
                    key={isp.id}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{isp.name}</h3>
                        <p className="text-sm text-gray-600">{isp.pdvCount} PDV assegnati</p>
                      </div>
                    </div>

                    {isp.pdv && isp.pdv.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {isp.pdv.map((pdv: any) => (
                          <div
                            key={pdv.id}
                            className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-sm"
                          >
                            <span>{pdv.name} ({pdv.city})</span>
                            <button
                              onClick={() => handleRemovePDV(isp.id, pdv.id)}
                              className="ml-1 text-red-600 hover:text-red-800 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {ispettori.length === 0 && (
                  <div className="text-center py-8 text-gray-600">
                    Nessun ispettore creato
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
