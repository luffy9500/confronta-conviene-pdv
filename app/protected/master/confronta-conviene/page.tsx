'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { uploadCoppie, getKPINetwork, getCoppieCount } from './actions'

type Tab = 'kpi' | 'carica'

export default function MasterCCPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('kpi')
  const [isLoading, setIsLoading] = useState(false)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-6 border-b">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">KPI Coppie</h1>
            <p className="text-gray-600 mt-1">{coppieCount} coppie nel sistema</p>
          </div>
          <Button onClick={() => router.push('/protected/home')} variant="outline">← Torna al menu</Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex border-b mb-6">
          <button
            onClick={() => setTab('kpi')}
            className={`px-5 py-3 text-sm font-bold transition ${tab === 'kpi' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
          >
            KPI Network
          </button>
          <button
            onClick={() => setTab('carica')}
            className={`px-5 py-3 text-sm font-bold transition ${tab === 'carica' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Carica Excel
          </button>
        </div>

        {tab === 'kpi' && (
          <div className="space-y-6">
            {kpiData?.network ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-6 bg-blue-50 border-blue-200">
                    <div className="text-3xl font-bold text-blue-600">{kpiData.network.totalCoppie}</div>
                    <div className="text-sm text-gray-600 mt-1">Coppie Totali</div>
                  </Card>
                  <Card className="p-6 bg-green-50 border-green-200">
                    <div className="text-3xl font-bold text-green-600">{kpiData.network.totalDone}</div>
                    <div className="text-sm text-gray-600 mt-1">Completate</div>
                  </Card>
                  <Card className="p-6 bg-amber-50 border-amber-200">
                    <div className="text-3xl font-bold text-amber-600">{kpiData.network.totalTodo}</div>
                    <div className="text-sm text-gray-600 mt-1">In Sospeso</div>
                  </Card>
                  <Card className="p-6 bg-purple-50 border-purple-200">
                    <div className="text-3xl font-bold text-purple-600">{kpiData.network.networkPercentage}%</div>
                    <div className="text-sm text-gray-600 mt-1">Avanzamento Rete</div>
                  </Card>
                </div>

                <Card className="p-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold">Avanzamento Rete</h3>
                    <span className="text-sm font-bold text-purple-600">{kpiData.network.networkPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all duration-500"
                      style={{ width: `${kpiData.network.networkPercentage}%` }}
                    />
                  </div>
                </Card>

                {kpiData.pdvList?.length > 0 && (
                  <Card className="overflow-hidden">
                    <div className="p-6 border-b">
                      <h3 className="font-bold text-lg">Dettaglio per PDV</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-6 py-3 text-left font-bold">Codice</th>
                            <th className="px-6 py-3 text-left font-bold">PDV</th>
                            <th className="px-6 py-3 text-center font-bold">Fatte</th>
                            <th className="px-6 py-3 text-center font-bold">Mancanti</th>
                            <th className="px-6 py-3 text-center font-bold">Avanzamento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kpiData.pdvList.map((pdv: any) => (
                            <tr key={pdv.pdvId} className="border-b hover:bg-gray-50">
                              <td className="px-6 py-4 font-mono text-gray-500 text-xs">{pdv.pdvCode}</td>
                              <td className="px-6 py-4 font-medium">{pdv.pdvName}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">{pdv.done}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">{pdv.todo}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pdv.percentage}%` }} />
                                  </div>
                                  <span className="text-xs font-bold w-8">{pdv.percentage}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                <div className="flex justify-center">
                  <Button onClick={loadData} variant="outline">Aggiorna KPI</Button>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-gray-500">
                <p className="text-lg">Nessuna coppia caricata.</p>
                <p className="text-sm mt-2">Vai su <strong>Carica Excel</strong> per iniziare.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'carica' && (
          <Card className="p-8 max-w-xl mx-auto">
            <h2 className="text-xl font-bold mb-2">Carica coppie da Excel</h2>
            <p className="text-sm text-gray-500 mb-6">
              Il file deve avere le colonne: <span className="font-mono text-xs">numero, area, ean_coop, name_coop, price_coop, ean_idm, name_idm, price_idm, discount_pct</span>
            </p>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center mb-6 cursor-pointer hover:border-blue-400 transition"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <div className="text-4xl mb-3">📁</div>
              <div className="font-semibold text-gray-700">{uploadFile ? uploadFile.name : 'Clicca per selezionare'}</div>
              <div className="text-sm text-gray-400 mt-1">.xlsx · .xls · .csv</div>
            </div>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
            >
              {isLoading ? 'Caricamento...' : 'Carica coppie'}
            </Button>
            {coppieCount > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium text-center">
                {coppieCount} coppie attive nel sistema
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
