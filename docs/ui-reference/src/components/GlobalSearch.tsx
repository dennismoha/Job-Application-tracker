import { useState, useEffect, useRef } from 'react'
import { useKeydown } from './UI'

interface Result {
  type: 'job' | 'site' | 'application' | 'cv'
  title: string
  sub: string
  badge?: string
  badgeColor?: string
}

const ALL_RESULTS: Result[] = [
  { type: 'job', title: 'Senior Backend Engineer', sub: 'Stripe · Remote', badge: 'Active', badgeColor: '#06d6a0' },
  { type: 'job', title: 'Staff Software Engineer', sub: 'Vercel · Remote', badge: 'Considering', badgeColor: '#f59e0b' },
  { type: 'job', title: 'Platform Engineer', sub: 'Cloudflare · Remote', badge: 'Applied', badgeColor: '#3b82f6' },
  { type: 'site', title: 'LinkedIn', sub: 'linkedin.com · Restricted', badge: 'Trusted', badgeColor: '#06d6a0' },
  { type: 'site', title: 'Greenhouse ATS', sub: 'boards.greenhouse.io · Crawlable', badge: 'Trusted', badgeColor: '#06d6a0' },
  { type: 'site', title: 'Indeed', sub: 'indeed.com · Crawlable', badge: 'Trusted', badgeColor: '#06d6a0' },
  { type: 'application', title: 'Stripe · Senior Backend Engineer', sub: 'Interviewing · Applied Sep 20', badge: 'Interviewing', badgeColor: '#8b5cf6' },
  { type: 'application', title: 'Linear · Principal Engineer', sub: 'Offer received · Applied Sep 5', badge: 'Offer', badgeColor: '#06d6a0' },
  { type: 'cv', title: 'Backend Engineering CV', sub: 'v4 · Default · Sep 20', badge: 'Default', badgeColor: '#3b82f6' },
  { type: 'cv', title: 'Platform / DevOps CV', sub: 'v2 · Sep 15', badge: '', badgeColor: '' },
]

const TYPE_ICON: Record<string, string> = { job: '◈', site: '◇', application: '◉', cv: '▤' }
const TYPE_COLOR: Record<string, string> = { job: '#3b82f6', site: '#06d6a0', application: '#8b5cf6', cv: '#f59e0b' }
const TYPE_LABEL: Record<string, string> = { job: 'Jobs', site: 'Sites', application: 'Applications', cv: 'CVs' }

export default function GlobalSearch({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (p: string) => void }) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) { setQuery(''); setCursor(0); setTimeout(() => inputRef.current?.focus(), 50) } }, [open])

  useKeydown('Escape', false, () => open && onClose())

  if (!open) return null

  const filtered = query.trim()
    ? ALL_RESULTS.filter(r => r.title.toLowerCase().includes(query.toLowerCase()) || r.sub.toLowerCase().includes(query.toLowerCase()))
    : ALL_RESULTS

  const grouped = ['job','site','application','cv'].reduce<Record<string, Result[]>>((acc, t) => {
    const items = filtered.filter(r => r.type === t)
    if (items.length) acc[t] = items
    return acc
  }, {})

  const flat = Object.values(grouped).flat()

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && flat[cursor]) {
      const r = flat[cursor]
      if (r.type === 'job') onNavigate('jobs-all')
      if (r.type === 'site') onNavigate('sites-all')
      if (r.type === 'application') onNavigate('apps-all')
      if (r.type === 'cv') onNavigate('cvs')
      onClose()
    }
  }

  let globalIdx = 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 100, zIndex: 900 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 580, background: '#0d1425', border: '1px solid #1a2540', borderRadius: 8, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #1a2540' }}>
          <span style={{ color: '#475569', fontSize: 14 }}>⊕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={handleKey}
            placeholder="Search jobs, sites, applications, CVs..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}
          />
          <span style={{ fontSize: 10, padding: '2px 6px', border: '1px solid #1a2540', borderRadius: 3, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>ESC</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {Object.keys(grouped).length === 0 ? (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: '#475569', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>No results for "{query}"</div>
          ) : (
            Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <div style={{ padding: '8px 18px 4px', fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {TYPE_LABEL[type]}
                </div>
                {items.map(r => {
                  const idx = globalIdx++
                  const isActive = cursor === idx
                  return (
                    <div
                      key={r.title}
                      onClick={() => { if (r.type === 'job') onNavigate('jobs-all'); if (r.type === 'site') onNavigate('sites-all'); if (r.type === 'application') onNavigate('apps-all'); if (r.type === 'cv') onNavigate('cvs'); onClose() }}
                      onMouseEnter={() => setCursor(idx)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', background: isActive ? 'rgba(59,130,246,0.08)' : 'none', cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: 13, color: TYPE_COLOR[type], width: 16, flexShrink: 0 }}>{TYPE_ICON[type]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{r.title}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{r.sub}</div>
                      </div>
                      {r.badge && (
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, border: `1px solid ${r.badgeColor}30`, color: r.badgeColor, background: `${r.badgeColor}15`, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', flexShrink: 0 }}>
                          {r.badge}
                        </span>
                      )}
                      {isActive && <span style={{ fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>↵</span>}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 18px', borderTop: '1px solid #1a2540', display: 'flex', gap: 12 }}>
          {[['↑↓', 'Navigate'], ['↵', 'Open'], ['ESC', 'Close']].map(([k, l]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, padding: '1px 5px', border: '1px solid #1a2540', borderRadius: 3, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{k}</span>
              <span style={{ fontSize: 10, color: '#334155' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
