'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { UserProfile } from '@/lib/types'
import { getPDVProgress, getClusterProgress } from './actions'

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
  icon, logo, title, desc, tags, ctaLabel, ctaColor, disabled, onClick, progress,
}: {
  icon?: React.ReactNode
  logo?: string
  title: string
  desc: string
  tags?: React.ReactNode
  ctaLabel: string
  ctaColor: string
  disabled?: boolean
  onClick?: () => void
  progress?: number
}) {
  const [hovered, setHovered] = useState(false)
  const [isMob, setIsMob] = useState(false)
  useEffect(() => {
    const check = () => setIsMob(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return (
    <div
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: 16,
        border: `1.5px solid ${hovered && !disabled ? navy : border}`,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: isMob ? 'column' : 'row',
        alignItems: isMob ? 'flex-start' : 'center',
        gap: 12,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: hovered && !disabled ? '0 4px 20px rgba(15,34,54,0.12)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onClick={!disabled ? onClick : undefined}
    >
      {/* Logo + Text row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        {/* Icon / Logo */}
        {logo
          ? <div style={{ width: 70, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={logo} alt="" style={{ height: 38, objectFit: 'contain', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.12))' }} />
            </div>
          : <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: disabled ? '#f1f5f9' : navy,
              fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {icon}
            </div>
        }

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 13, color: muted, marginBottom: tags ? 8 : 0, lineHeight: 1.4 }}>{desc}</div>
          {tags && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: progress != null ? 6 : 0 }}>{tags}</div>}
          {progress != null && (
            <div style={{ marginTop: 2 }}>
              <div style={{ height: 4, background: border, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: green, borderRadius: 4, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 10, color: muted, marginTop: 3, fontWeight: 600 }}>{progress}% completato</div>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          padding: '10px 18px',
          borderRadius: 10,
          background: disabled ? bg : ctaColor,
          color: disabled ? muted : '#fff',
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          width: isMob ? '100%' : 'auto',
          textAlign: 'center',
        }}>
          {ctaLabel}{!disabled && ' →'}
        </div>
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
  const [clusterDone, setClusterDone] = useState(0)
  const [clusterTotal, setClusterTotal] = useState(0)

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
          const [progress, clusterProg] = await Promise.all([
            getPDVProgress(profileData.pdv_id),
            getClusterProgress(profileData.pdv_id),
          ])
          if (progress.success) {
            setTotal(progress.total)
            setDone(progress.done)
          }
          if (clusterProg.success) {
            setClusterTotal(clusterProg.total)
            setClusterDone(clusterProg.done)
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
      <div style={{ background: navy, padding: '20px 24px 28px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Brand row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Le Due Sicilie Srl
            </span>
          </div>

          {/* Greeting */}
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 4 }}>
            {isMaster ? 'Dashboard Master' : `Ciao, ${profile?.name || 'Utente'}`}
          </div>
          {!isMaster && pdvCode && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PDV</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'monospace', background: 'rgba(226,0,26,0.18)', padding: '2px 8px', borderRadius: 6 }}>{pdvCode}</span>
            </div>
          )}

          {/* Date */}
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
            {today}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* PDV modules */}
        {!isMaster && (
          <>
            <ModuleCard
              logo="/cc_logo_nobg.png"
              title="Confronta & Conviene"
              desc="Gestisci le coppie prodotto COOP vs IDM"
              tags={<>
                <Tag text={`${done} fatte`} color="green" />
                <Tag text={`${todo} da fare`} color="amber" />
              </>}
              progress={pct}
              ctaLabel="Apri le coppie"
              ctaColor={navy}
              onClick={() => router.push('/protected/confronta-conviene')}
            />
            <ModuleCard
              icon="📊"
              title="Assortimenti e Cluster"
              desc="Verifica l'assortimento prodotti per il tuo cluster"
              tags={<>
                <Tag text={`${clusterDone} presenti`} color="green" />
                <Tag text={`${clusterTotal - clusterDone} da fare`} color="amber" />
              </>}
              progress={clusterTotal > 0 ? Math.round((clusterDone / clusterTotal) * 100) : 0}
              ctaLabel="Apri cluster"
              ctaColor={navyLight}
              onClick={() => router.push('/protected/cluster/dashboard')}
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
              title="Assortimenti e Cluster"
              desc="Gestisci assortimenti e carica file Excel per categoria"
              ctaLabel="Apri cluster"
              ctaColor={navyLight}
              onClick={() => router.push('/protected/master/cluster')}
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
