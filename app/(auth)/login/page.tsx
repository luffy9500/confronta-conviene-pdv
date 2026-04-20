'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmail } from './actions'

/* ─── Design tokens ─── */
const navy    = '#0f2236'
const red     = '#E2001A'
const border  = '#e2e8f0'
const bg      = '#f1f5f9'
const text    = '#0f172a'
const muted   = '#64748b'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: `1.5px solid ${border}`,
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
  background: '#fff',
  color: text,
  fontFamily: 'inherit',
  transition: 'border-color .15s',
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Inserisci email e password.'); return }
    setIsLoading(true)
    const result = await signInWithEmail(email, password)
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      router.push('/protected/home')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: bg }}>

      {/* ── Navy branding strip ── */}
      <div style={{ background: navy, padding: '32px 24px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: red }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Coop Alleanza 3.0
          </span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
          Confronta<br />& Conviene
        </div>
      </div>

      {/* ── Overlapping card ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '0 24px', marginTop: -48 }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: '#fff',
          borderRadius: 20,
          border: `1.5px solid ${border}`,
          padding: 32,
          boxShadow: '0 8px 32px rgba(15,34,54,0.12)',
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.4px', color: text }}>
            Accedi
          </div>
          <div style={{ fontSize: 13, color: muted, marginBottom: 28, lineHeight: 1.5 }}>
            Inserisci le credenziali ricevute dal tuo responsabile.
          </div>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tuaemail@example.com"
                style={inputStyle}
                required
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 80 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 600, color: muted, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPassword ? 'Nascondi' : 'Mostra'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991b1b', marginBottom: 16 }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: 14, borderRadius: 12,
                background: isLoading ? muted : navy,
                color: '#fff', fontSize: 14, fontWeight: 700,
                border: 'none', cursor: isLoading ? 'default' : 'pointer',
                transition: 'background .15s', fontFamily: 'inherit',
              }}
            >
              {isLoading ? 'Accesso in corso…' : 'Accedi →'}
            </button>
          </form>
        </div>
      </div>

      <style>{`input::placeholder { color: #94a3b8; }`}</style>
    </div>
  )
}
