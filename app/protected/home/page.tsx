'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { UserProfile } from '@/lib/types'
import { getPDVProgress } from './actions'

/* ─── Design tokens ─── */
const navy     = '#0f2236'
const navyLight = '#1a3a5c'
const red      = '#E2001A'
const green    = '#22c55e'
const greenBg  = '#f0fdf4'
const greenBorder = '#bbf7d0'
const greenDark = '#065f46'
const amber    = '#f59e0b'
const amberBg  = '#fffbeb'
const amberBorder = '#fde68a'
const amberDark = '#92400e'
const muted    = '#64748b'
const border   = '#e2e8f0'
const bg       = '#f1f5f9'

/* ─── ProgressBar ─── */
function ProgressBar({ pct, color = green, height = 5 }: { pct: number; color?: string; height?: number }) {
  return (
    <div style={{ width: '100%', height, background: 'rgba(255,255,255,0.12)', borderRadius: height }}>
      <div style={{ height, width: `${pct}%`, background: color, borderRadius: height, transition: 'width 0.4s ease' }} />
    </div>
  )
}

/* ─── Tag ─── */
function Tag({ text, color }: { text: string; color: 'green' | 'amber' | 'red' | 'blue' | 'gray' }) {
  const map: Record<string, { bg: string; fg: string; bd: string }> = {
    green: { bg: greenBg,          fg: greenDark,  bd: greenBorder },
    amber: { bg: amberBg,          fg: amberDark,  bd: amberBorder },
    red:   { bg: '#fff5f5',        fg: red,        bd: '#fecaca'   },
    blue:  { bg: '#eff6ff',        fg: '#1d4ed8',  bd: '#bfdbfe'   },
    gray:  { bg: '#f1f5f9',        fg: muted,      bd: border      },
  }
  const c = map[color]
  return (
    <span style={{
      display: 'inline-block',
      background: c.bg,
      color: c.fg,
      border: `1px solid ${c.bd}`,
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 100,
      lineHeight: 1.6,
    }}>
      {text}
    </span>
  )
}

/* ─── ModuleCard ─── */
function ModuleCard({
  icon, title, desc, tags, ctaLabel, ctaColor, disabled, onClick,
}: {
  icon: string
  title: string
  desc: string
  tags?: React.ReactNode
  ctaLabel: string
  ctaColor: string
  disabled?: boolean
  onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: 16,
        border: `1.5px solid ${border}`,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'row',
        gap: 18,
        alignItems: 'flex-start',
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: hovered && !disabled
          ? '0 8px 32px rgba(15,34,54,0.12)'
          : '0 2px 8px rgba(15,34,54,0.05)',
        transition: 'box-shadow 0.2s ease',
      }}
      onClick={!disabled ? onClick : undefined}
    >
      {/* Icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: disabled ? '#f1f5f9' : navy,
        fontSize: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, color: muted, marginBottom: tags ? 8 : 0, lineHeight: 1.5 }}>{desc}</div>
        {tags && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{tags}</div>}
      </div>

      {/* CTA */}
      <div style={{ flexShrink: 0, alignSelf: 'center' }}>
        <span style={{
          display: 'inline-block',
          padding: '10px 18px',
          borderRadius: 10,
          background: ctaColor,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          cursor: disabled ? 'default' : 'pointer',
        }}>
          {ctaLabel}
        </span>
      </div>
    </div>
  )
}

/* ─── PAGE ─── */
export default function HomePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [pdvCode, setPdvCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)

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
        .from('user_profiles').select('id, role, name, pdv_id, can_see_coppie, can_see_cluster, pdv:pdv_id(code)').eq('id', user.id).single()

      if (profileData) {
        setProfile(profileData)
        const pdv = Array.isArray(profileData.pdv) ? profileData.pdv[0] : profileData.pdv
        if (pdv?.code) setPdvCode(pdv.code)
        // Load progress for PDV via server action (admin client bypasses RLS)
        if (profileData.role === 'pdv' && profileData.pdv_id) {
          const progress = await getPDVProgress(profileData.pdv_id)
          if (progress.success) {
            setTotal(progress.total)
            setDone(progress.done)
          }
        }
        setIsLoading(false)
        return
      }

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
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: `4px solid ${red}`, borderTop: '4px solid transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 13, color: muted }}>Caricamento...</p>
        </div>
      </div>
    )
  }

  const isMaster = profile?.role === 'master'
  const todo = total - done
  const pct  = total > 0 ? Math.round((done / total) * 100) : 0
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ minHeight: '100vh', background: bg }}>
      {/* ── HEADER ── */}
      <div style={{ background: navy, padding: '20px 24px 0' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Brand row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: red }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Coop Alleanza 3.0
            </span>
          </div>

          {/* Greeting */}
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            {isMaster ? 'Dashboard Master' : `Ciao, ${profile?.name || 'Utente'}`}
          </div>
          {!isMaster && pdvCode && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PDV</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'monospace', background: 'rgba(226,0,26,0.18)', padding: '2px 8px', borderRadius: 6 }}>{pdvCode}</span>
            </div>
          )}

          {/* Date */}
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
            {today}
          </div>

          {/* PDV progress strip */}
          {!isMaster && (
            <div style={{
              background: 'rgba(255,255,255,0.07)',
              borderRadius: '12px 12px 0 0',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 20,
            }}>
              {/* Left: progress */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Avanzamento settimana
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <ProgressBar pct={pct} color={green} height={5} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: green, flexShrink: 0 }}>{pct}%</span>
                </div>
              </div>

              {/* Right: stats */}
              <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: green, lineHeight: 1 }}>{done}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>FATTE</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{todo}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>MANCANO</div>
                </div>
              </div>
            </div>
          )}

          {/* Spacer for master (no strip) */}
          {isMaster && <div style={{ height: 8 }} />}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* PDV modules */}
        {!isMaster && (
          <>
            <ModuleCard
              icon="🔄"
              title="Confronta & Conviene"
              desc="Gestisci le coppie prodotto COOP vs IDM"
              tags={<>
                <Tag text={`${done} fatte`} color="green" />
                <Tag text={`${todo} da fare`} color="amber" />
              </>}
              ctaLabel="Apri le coppie"
              ctaColor={navy}
              onClick={() => router.push('/protected/confronta-conviene')}
            />
            <ModuleCard
              icon="📊"
              title="Cluster Analytics"
              desc="Gestisci assortimenti per categoria e metratura"
              ctaLabel="Non disponibile"
              ctaColor={muted}
              disabled
            />
          </>
        )}

        {/* Master modules */}
        {isMaster && (
          <>
            <ModuleCard
              icon="🔄"
              title="KPI Coppie"
              desc="Monitora avanzamento rete, carica coppie da Excel"
              tags={<Tag text="PDV attivi" color="blue" />}
              ctaLabel="Apri KPI"
              ctaColor={navy}
              onClick={() => router.push('/protected/master/confronta-conviene')}
            />
            <ModuleCard
              icon="📊"
              title="KPI Cluster"
              desc="Monitora assortimenti cluster per categoria e metratura"
              ctaLabel="Non disponibile"
              ctaColor={muted}
              disabled
            />
            <ModuleCard
              icon="👤"
              title="Gestione Utenze"
              desc="Crea e gestisci gli utenti PDV"
              ctaLabel="Gestisci"
              ctaColor={navyLight}
              onClick={() => router.push('/protected/master/profili')}
            />
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
