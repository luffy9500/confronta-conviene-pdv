'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function ClusterDashboard() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">📊 Cluster Analytics</h1>
          <Button onClick={() => router.push('/protected/home')} variant="outline">
            ← Torna al menu
          </Button>
        </div>
      </header>
      <main className="p-6">
        <p>Cluster Dashboard - Placeholder</p>
      </main>
    </div>
  )
}
