'use client'

import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <div className="fixed top-6 right-6 z-50">
        <Button
          onClick={handleLogout}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? 'Uscita...' : '🚪 Esci'}
        </Button>
      </div>
      {children}
    </>
  )
}
