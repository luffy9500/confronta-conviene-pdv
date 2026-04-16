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
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
      setIsLoading(false)
    }

    loadProfile()
  }, [router])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">🔄 Coop Alleanza 3.0</h1>
            <p className="text-gray-600 mt-1">
              Benvenuto, {profile?.name || 'Utente'}!
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 hover:shadow-lg transition cursor-pointer">
            <div className="text-5xl mb-4">🔄</div>
            <h2 className="text-2xl font-bold mb-3">Confronta & Conviene</h2>
            <p className="text-gray-600 mb-6">
              Gestisci le coppie prodotto COOP vs IDM. Conferma il montaggio in scaffale.
            </p>
            <Button
              onClick={() => router.push('/protected/confronta-conviene/dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Accedi →
            </Button>
          </Card>

          <Card className="p-8 hover:shadow-lg transition cursor-pointer">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-2xl font-bold mb-3">Cluster Analytics</h2>
            <p className="text-gray-600 mb-6">
              Gestisci gli assortimenti per categoria. Analisi per metratura PDV.
            </p>
            <Button
              onClick={() => router.push('/protected/cluster/dashboard')}
              disabled={profile?.role === 'pdv'}
              className={`w-full ${
                profile?.role === 'pdv'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {profile?.role === 'pdv' ? '(Solo Master)' : 'Accedi →'}
            </Button>
          </Card>
        </div>
      </main>
    </div>
  )
}
