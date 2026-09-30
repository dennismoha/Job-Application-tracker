import { useState } from 'react'

interface Notification {
  id: number
  type: 'crawl' | 'job' | 'cv' | 'application' | 'error'
  message: string
  time: string
  unread: boolean
}

const NOTIFS: Notification[] = [
  { id: 1, type: 'job',         message: '342 new jobs discovered in the last crawl cycle', time: '2m ago',  unread: true  },
  { id: 2, type: 'crawl',       message: 'LinkedIn SE Remote crawl completed — 42 jobs found', time: '8m ago',  unread: true  },
  { id: 3, type: 'crawl',       message: 'Glassdoor crawl failed — bot protection detected',   time: '14m ago', unread: true  },
  { id: 4, type: 'application', message: 'Application status updated: Stripe → Interviewing',  time: '1h ago',  unread: false },
  { id: 5, type: 'cv',          message: 'CV analysis complete: Backend CV vs Stripe — 78%',   time: '2h ago',  unread: false },
  { id: 6, type: 'job',         message: '3 new sites discovered during universal search',     time: '3h ago',  unread: false },
]

const TYPE_ICON: Record<string, string> = { crawl: '⟳', job: '◈', cv: '▤', application: '◉', error: '⚠' }
const TYPE_COLOR: Record<string, string> = { crawl: '#3b82f6', job: '#06d6a0', cv: '#f59e0b', application: '#8b5cf6', error: '#ef4444' }

export default function TopBar({
  onSearchOpen,
  onNavigate,
}: {
  onSearchOpen: () => void
  onNavigate: (p: string) => void
}) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const unread = NOTIFS.filter(n => n.unread).length

  return (
    <div style={{
      height: 48,
      background: '#080d1c',
      borderBottom: '1px solid #1a2540',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 12,
      flexShrink: 0,
      position: 'relative',
      zIndex: 30,
    }}>
      {/* Global search trigger */}
      <button
        onClick={onSearchOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px',
          background: '#111c35',
          border: '1px solid #1a2540',
          borderRadius: 5,
          color: '#475569',
          fontSize: 12,
          cursor: 'pointer',
          flex: 1, maxWidth: 320,
        }}
      >
        <span style={{ fontSize: 13 }}>⊕</span>
        <span>Search jobs, sites, applications...</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 5px', border: '1px solid #1a2540', borderRadius: 3, fontFamily: 'JetBrains Mono, monospace' }}>⌘K</span>
      </button>

      <div style={{ flex: 1 }} />

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {[
          { label: 'Jobs', val: '12,481', nav: 'jobs-all' },
          { label: 'Sites', val: '147', nav: 'sites-all' },
          { label: 'Crawlers', val: '3 running', nav: 'crawl-sessions', color: '#3b82f6' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => onNavigate(s.nav)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', gap: 5, alignItems: 'center' }}
          >
            <span style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{s.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: s.color ?? '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{s.val}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: '#1a2540' }} />

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setNotifOpen(v => !v); setUserOpen(false) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 5, position: 'relative', color: '#64748b', fontSize: 15 }}
        >
          🔔
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#3b82f6', border: '2px solid #080d1c',
              fontSize: 9, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
            }}>
              {unread}
            </span>
          )}
        </button>

        {notifOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 340, background: '#0d1425', border: '1px solid #1a2540',
            borderRadius: 7, boxShadow: '0 12px 36px rgba(0,0,0,0.4)', zIndex: 100,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2540', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>Notifications</span>
              <span style={{ fontSize: 11, color: '#3b82f6', cursor: 'pointer' }}>Mark all read</span>
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {NOTIFS.map((n, i) => (
                <div
                  key={n.id}
                  style={{
                    padding: '10px 16px',
                    borderBottom: i < NOTIFS.length - 1 ? '1px solid #1a2540' : 'none',
                    background: n.unread ? 'rgba(59,130,246,0.04)' : 'none',
                    display: 'flex', gap: 10, cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13, color: TYPE_COLOR[n.type], marginTop: 1, flexShrink: 0 }}>{TYPE_ICON[n.type]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: n.unread ? '#cbd5e1' : '#94a3b8', lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>{n.time}</div>
                  </div>
                  {n.unread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: 4 }} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setUserOpen(v => !v); setNotifOpen(false) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color: '#fff',
          }}>AK</div>
          <span style={{ fontSize: 12, color: '#94a3b8', display: 'none' }}>Alex Kim</span>
        </button>

        {userOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 200, background: '#0d1425', border: '1px solid #1a2540',
            borderRadius: 7, boxShadow: '0 12px 36px rgba(0,0,0,0.4)', zIndex: 100, overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2540' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>Alex Kim</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>alex@example.com</div>
            </div>
            {[
              { label: 'Settings', nav: 'settings' },
              { label: 'API Keys', nav: 'settings' },
              { label: 'Extension', nav: 'extension' },
            ].map(item => (
              <div key={item.label} onClick={() => { onNavigate(item.nav); setUserOpen(false) }}
                style={{ padding: '9px 16px', fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {item.label}
              </div>
            ))}
            <div style={{ borderTop: '1px solid #1a2540' }}>
              <div style={{ padding: '9px 16px', fontSize: 13, color: '#ef4444', cursor: 'pointer' }}>Sign out</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
