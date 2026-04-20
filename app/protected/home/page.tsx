'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { UserProfile } from '@/lib/types'

export default function HomePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: ispData } = await supabase
        .from('ispettori').select('*').eq('id', user.id).single()

      if (ispData) {
        setProfile({ id: user.id, role: ispData.role, name: ispData.name })
        setIsLoading(false)
        return
      }

      const { data: profileData } = await supabase
        .from('user_profiles').select('id, role, name, pdv_id, can_see_coppie, can_see_cluster').eq('id', user.id).single()

      if (profileData) {
        setProfile(profileData)
        setIsLoading(false)
        return
      }

      // Fallback: leggi ruolo dai metadata auth (app_metadata o user_metadata)
      const metaRole = (user.app_metadata?.role || user.user_metadata?.role) as string | undefined
      const metaName = user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'Utente'
      if (metaRole) {
        setProfile({ id: user.id, role: metaRole as UserProfile['role'], name: metaName })
      } else {
        console.error('Ruolo non trovato. User ID:', user.id, '| app_metadata:', user.app_metadata, '| user_metadata:', user.user_metadata)
        setProfile({ id: user.id, role: 'pdv', name: metaName })
      }
      setIsLoading(false)
    }
    loadProfile()
  }, [])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-blue-600">Coop Alleanza 3.0</h1>
          <p className="text-gray-600 mt-1">Benvenuto, {profile?.name || 'Utente'}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {profile?.role === 'master' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-8 hover:shadow-lg transition">
              <div className="text-5xl mb-4">🔄</div>
              <h2 className="text-2xl font-bold mb-3">KPI Coppie</h2>
              <p className="text-gray-600 mb-6">KPI rete, carica coppie, monitora avanzamento PDV.</p>
              <Button onClick={() => router.push('/protected/master/confronta-conviene')} className="w-full bg-blue-600 hover:bg-blue-700">Accedi →</Button>
            </Card>
            <Card className="p-8 hover:shadow-lg transition">
              <div className="text-5xl mb-4">📊</div>
              <h2 className="text-2xl font-bold mb-3">KPI Cluster</h2>
              <p className="text-gray-600 mb-6">Monitora assortimenti cluster per categoria e metratura.</p>
              <Button onClick={() => router.push('/protected/cluster/dashboard')} className="w-full bg-purple-600 hover:bg-purple-700">Accedi →</Button>
            </Card>
            <Card className="p-8 hover:shadow-lg transition">
              <div className="text-5xl mb-4">👤</div>
              <h2 className="text-2xl font-bold mb-3">Gestione Utenze</h2>
              <p className="text-gray-600 mb-6">Crea e gestisci gli utenti PDV.</p>
              <Button onClick={() => router.push('/protected/master/profili')} className="w-full bg-green-600 hover:bg-green-700">Accedi →</Button>
            </Card>
          </div>
        )}

        {profile?.role === 'pdv' && (
          <div className="grid md:grid-cols-2 gap-6">
            {(profile as any).can_see_coppie !== false && (
              <Card className="p-8 hover:shadow-lg transition">
                <div className="text-5xl mb-4">🔄</div>
                <h2 className="text-2xl font-bold mb-3">Confronta & Conviene</h2>
                <p className="text-gray-600 mb-6">Gestisci le coppie prodotto COOP vs IDM.</p>
                <Button onClick={() => router.push('/protected/confronta-conviene')} className="w-full bg-blue-600 hover:bg-blue-700">Accedi →</Button>
              </Card>
            )}
            {(profile as any).can_see_cluster !== false && (
              <Card className="p-8 hover:shadow-lg transition">
                <div className="text-5xl mb-4">📊</div>
                <h2 className="text-2xl font-bold mb-3">Cluster Analytics</h2>
                <p className="text-gray-600 mb-6">Gestisci assortimenti per categoria e metratura.</p>
                <Button onClick={() => router.push('/protected/cluster/dashboard')} className="w-full bg-purple-600 hover:bg-purple-700">Accedi →</Button>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
