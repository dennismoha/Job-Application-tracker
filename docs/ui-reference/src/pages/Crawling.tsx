import { useState } from 'react'

interface CrawlConfig {
  id: number
  name: string
  sites: string[]
  keywords: string[]
  categories: string[]
  location: string
  employment: string
  frequency: string
  enabled: boolean
  nextRun: string
  lastRun: string
  totalJobs: number
}

interface CrawlSession {
  id: number
  site: string
  config: string
  started: string
  finished: string
  duration: string
  status: 'completed' | 'running' | 'failed'
  jobsFound: number
  newJobs: number
  duplicates: number
  failed: number
  pages: number
}

const CONFIGS: CrawlConfig[] = [
  { id: 1, name: 'SE Remote', sites: ['LinkedIn', 'Indeed', 'Greenhouse ATS'], keywords: ['Software Engineer', 'Backend Engineer'], categories: ['Software Engineering', 'Backend'], location: 'Remote', employment: 'Full-time', frequency: 'Every 4 hours', enabled: true, nextRun: '14:00', lastRun: '10:00', totalJobs: 4821 },
  { id: 2, name: 'DevOps Remote', sites: ['LinkedIn', 'RemoteOK', 'Indeed'], keywords: ['DevOps Engineer', 'Platform Engineer', 'SRE'], categories: ['DevOps', 'Infrastructure'], location: 'Remote', employment: 'Full-time', frequency: 'Every 6 hours', enabled: true, nextRun: '16:00', lastRun: '10:00', totalJobs: 1203 },
  { id: 3, name: 'Startup Engineering', sites: ['Wellfound', 'HackerNews Jobs'], keywords: ['Engineer', 'Developer'], categories: ['Software Engineering'], location: 'Remote', employment: 'Any', frequency: 'Every 2 hours', enabled: true, nextRun: '12:00', lastRun: '10:00', totalJobs: 892 },
  { id: 4, name: 'Data Science', sites: ['LinkedIn', 'Indeed'], keywords: ['Data Scientist', 'ML Engineer', 'Data Engineer'], categories: ['Data Science', 'ML'], location: 'Any', employment: 'Full-time', frequency: 'Every 8 hours', enabled: false, nextRun: '—', lastRun: '2d ago', totalJobs: 341 },
]

const SESSIONS: CrawlSession[] = [
  { id: 1, site: 'LinkedIn', config: 'SE Remote', started: '14:02', finished: '14:09', duration: '7m 14s', status: 'completed', jobsFound: 42, newJobs: 13, duplicates: 29, failed: 0, pages: 18 },
  { id: 2, site: 'Indeed', config: 'SE Remote', started: '14:02', finished: '14:06', duration: '4m 02s', status: 'completed', jobsFound: 28, newJobs: 7, duplicates: 21, failed: 0, pages: 11 },
  { id: 3, site: 'Wellfound', config: 'Startup Engineering', started: '14:00', finished: '—', duration: '—', status: 'running', jobsFound: 14, newJobs: 5, duplicates: 9, failed: 0, pages: 6 },
  { id: 4, site: 'HackerNews Jobs', config: 'Startup Engineering', started: '12:00', finished: '12:02', duration: '1m 55s', status: 'completed', jobsFound: 14, newJobs: 4, duplicates: 10, failed: 0, pages: 3 },
  { id: 5, site: 'Glassdoor', config: 'SE Remote', started: '10:00', finished: '10:04', duration: '4m 12s', status: 'failed', jobsFound: 0, newJobs: 0, duplicates: 0, failed: 1, pages: 2 },
]

function StatusDot({ status }: { status: CrawlSession['status'] }) {
  const map = { completed: '#06d6a0', running: '#3b82f6', failed: '#ef4444' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className={status === 'running' ? 'pulse' : ''} style={{ width: 7, height: 7, borderRadius: '50%', background: map[status] }} />
      <span style={{ fontSize: 10, color: map[status], fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{status}</span>
    </div>
  )
}

function ConfigDetail({ config, onClose }: { config: CrawlConfig; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#0d1425', border: '1px solid #1a2540', borderRadius: 8, width: 480, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>Config #{config.id} — {config.name}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Sites', value: config.sites.join(', ') },
            { label: 'Keywords', value: config.keywords.join(', ') },
            { label: 'Categories', value: config.categories.join(', ') },
            { label: 'Location', value: config.location },
            { label: 'Employment', value: config.employment },
            { label: 'Frequency', value: config.frequency },
            { label: 'Status', value: config.enabled ? 'Active' : 'Disabled' },
            { label: 'Next Run', value: config.nextRun },
            { label: 'Last Run', value: config.lastRun },
            { label: 'Total Jobs Found', value: config.totalJobs.toLocaleString() },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', borderBottom: '1px solid #1a2540', paddingBottom: 10 }}>
              <div style={{ width: 140, fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{r.label}</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>{r.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '8px 0', background: '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Edit Config</button>
          <button onClick={onClose} style={{ padding: '8px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 13, cursor: 'pointer' }}>Run Now</button>
          <button onClick={onClose} style={{ padding: '8px 14px', background: 'none', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, color: '#ef4444', fontSize: 13, cursor: 'pointer' }}>Disable</button>
        </div>
      </div>
    </div>
  )
}

export default function Crawling({ filter, onNavigate }: { filter: string; onNavigate?: (p: string) => void }) {
  const [selectedConfig, setSelectedConfig] = useState<CrawlConfig | null>(null)
  const [activeTab, setActiveTab] = useState<'configs' | 'sessions' | 'scheduler'>(
    filter === 'crawl-configs' ? 'configs' : filter === 'crawl-sessions' || filter === 'crawl-failed' ? 'sessions' : 'scheduler'
  )

  const sessions = filter === 'crawl-failed' ? SESSIONS.filter(s => s.status === 'failed') : SESSIONS

  return (
    <div style={{ padding: '28px 32px' }}>
      {selectedConfig && <ConfigDetail config={selectedConfig} onClose={() => setSelectedConfig(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Crawling</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
            {CONFIGS.filter(c => c.enabled).length} active configurations · {SESSIONS.filter(s => s.status === 'running').length} sessions running
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '8px 16px', background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.25)', borderRadius: 5, color: '#06d6a0', fontSize: 13, cursor: 'pointer' }}>
            ▶ Run All Now
          </button>
          <button style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            + New Config
          </button>
        </div>
      </div>

      {/* Scheduler preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {CONFIGS.filter(c => c.enabled).map(c => (
          <div key={c.id} className="data-card" style={{ borderRadius: 6, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1' }}>{c.name}</span>
              <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#06d6a0' }} />
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>{c.sites.slice(0, 2).join(', ')}{c.sites.length > 2 ? ` +${c.sites.length - 2}` : ''}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>Next run</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace' }}>{c.nextRun}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>Freq</div>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{c.frequency.replace('Every ', '')}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1a2540', marginBottom: 16 }}>
        {(['configs', 'sessions', 'scheduler'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ padding: '10px 0', marginRight: 24, background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#3b82f6' : 'transparent'}`, color: activeTab === tab ? '#e2e8f0' : '#64748b', fontSize: 13, cursor: 'pointer', fontWeight: activeTab === tab ? 500 : 400, textTransform: 'capitalize' }}
          >
            {tab === 'configs' ? `Configurations (${CONFIGS.length})` : tab === 'sessions' ? `Sessions (${SESSIONS.length})` : 'Scheduler'}
          </button>
        ))}
      </div>

      {activeTab === 'configs' && (
        <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
                {['Name', 'Sites', 'Keywords', 'Location', 'Frequency', 'Next Run', 'Total Jobs', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CONFIGS.map((c, i) => (
                <tr key={c.id} className="tr-hover" style={{ borderBottom: i < CONFIGS.length - 1 ? '1px solid #1a2540' : 'none' }}>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{c.name}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{c.sites.join(', ')}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{c.keywords.join(', ')}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{c.location}</td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{c.frequency}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace' }}>{c.nextRun}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{c.totalJobs.toLocaleString()}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: `1px solid ${c.enabled ? 'rgba(6,214,160,0.2)' : 'rgba(100,116,139,0.2)'}`, color: c.enabled ? '#06d6a0' : '#64748b', background: c.enabled ? 'rgba(6,214,160,0.08)' : 'rgba(100,116,139,0.08)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      {c.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <button onClick={() => setSelectedConfig(c)} style={{ padding: '3px 10px', background: 'none', border: '1px solid #1a2540', borderRadius: 4, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
                {['Site', 'Config', 'Started', 'Duration', 'Pages', 'Found', 'New', 'Dupes', 'Failed', 'Status'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => (
                <tr key={s.id} className="tr-hover" onClick={() => onNavigate?.('crawl-session-detail')} style={{ borderBottom: i < sessions.length - 1 ? '1px solid #1a2540' : 'none', cursor: 'pointer' }}>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{s.site}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{s.config}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{s.started}</td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{s.duration}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{s.pages}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{s.jobsFound}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#06d6a0', fontFamily: 'JetBrains Mono, monospace' }}>+{s.newJobs}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{s.duplicates}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: s.failed > 0 ? '#ef4444' : '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{s.failed}</td>
                  <td style={{ padding: '11px 16px' }}><StatusDot status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'scheduler' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CONFIGS.filter(c => c.enabled).map(c => (
            <div key={c.id} className="data-card" style={{ borderRadius: 6, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{c.nextRun}</div>
                <div style={{ fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>next run</div>
              </div>
              <div style={{ width: 1, height: 36, background: '#1a2540' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{c.sites.join(' · ')} · {c.frequency}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ padding: '5px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 4, color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>
                  ▶ Run Now
                </button>
                <button style={{ padding: '5px 12px', background: 'none', border: '1px solid #1a2540', borderRadius: 4, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>
                  Pause
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
