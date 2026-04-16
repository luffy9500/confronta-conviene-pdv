'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/protected/home')
      } else {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  return <div>Caricamento...</div>
}
