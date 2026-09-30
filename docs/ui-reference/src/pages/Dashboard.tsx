interface Stat {
  label: string
  value: string
  sub?: string
  color?: string
  delta?: string
  deltaDir?: 'up' | 'down' | 'neutral'
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <div className="data-card" style={{ padding: '16px 20px', borderRadius: 6 }}>
      <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
        {stat.label}
      </div>
      <div
        className="num-highlight"
        style={{ fontSize: 28, fontWeight: 600, color: stat.color || '#e2e8f0', lineHeight: 1, marginBottom: 4 }}
      >
        {stat.value}
      </div>
      {stat.sub && (
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
          {stat.sub}
          {stat.delta && (
            <span style={{ marginLeft: 6, color: stat.deltaDir === 'up' ? '#06d6a0' : stat.deltaDir === 'down' ? '#ef4444' : '#64748b' }}>
              {stat.deltaDir === 'up' ? '↑' : stat.deltaDir === 'down' ? '↓' : '—'} {stat.delta}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, count }: { title: string; count?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>
        {title}
      </span>
      {count && (
        <span style={{ fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>({count})</span>
      )}
      <div style={{ flex: 1, height: 1, background: '#1a2540' }} />
    </div>
  )
}

const RECENT_JOBS = [
  { title: 'Senior Backend Engineer', company: 'Stripe', sites: 3, status: 'New', posted: 'Sep 24', tags: ['Python', 'Go', 'Remote'] },
  { title: 'Staff Software Engineer', company: 'Vercel', sites: 2, status: 'New', posted: 'Sep 24', tags: ['TypeScript', 'Remote'] },
  { title: 'Platform Engineer', company: 'Cloudflare', sites: 4, status: 'New', posted: 'Sep 23', tags: ['Rust', 'Distributed', 'Remote'] },
  { title: 'Senior DevOps Engineer', company: 'GitHub', sites: 2, status: 'New', posted: 'Sep 23', tags: ['Kubernetes', 'Remote'] },
  { title: 'Backend Engineer, Infra', company: 'Linear', sites: 1, status: 'Viewed', posted: 'Sep 22', tags: ['Node.js', 'PostgreSQL'] },
  { title: 'Principal Engineer', company: 'Figma', sites: 3, status: 'Viewed', posted: 'Sep 22', tags: ['C++', 'TypeScript', 'Hybrid'] },
]

const CRAWL_SESSIONS = [
  { site: 'LinkedIn', config: 'Software Engineering / Remote', started: '14:02', duration: '7m 14s', jobs: 42, newJobs: 13, status: 'completed' },
  { site: 'Indeed', config: 'Backend Engineering / Remote', started: '13:30', duration: '4m 02s', jobs: 28, newJobs: 7, status: 'completed' },
  { site: 'Greenhouse ATS', config: 'Fullstack / Any', started: '13:00', duration: '12m 31s', jobs: 91, newJobs: 31, status: 'completed' },
  { site: 'HackerNews Jobs', config: 'Engineering', started: '12:00', duration: '1m 55s', jobs: 14, newJobs: 4, status: 'completed' },
]

const ACTIVE_CRAWLERS = [
  { site: 'Wellfound', config: 'Startup / Remote', progress: 67, eta: '~2m' },
  { site: 'Glassdoor', config: 'Backend / Senior', progress: 34, eta: '~5m' },
  { site: 'RemoteOK', config: 'Engineering', progress: 89, eta: '~30s' },
]

const PIPELINE = [
  { label: 'Discovery', count: 891, color: '#3b82f6' },
  { label: 'Normalize', count: 887, color: '#3b82f6' },
  { label: 'Classify', count: 880, color: '#8b5cf6' },
  { label: 'Dedup', count: 842, color: '#06d6a0' },
  { label: 'Canonical', count: 391, color: '#06d6a0' },
  { label: 'Listings', count: 842, color: '#06d6a0' },
]

export default function Dashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#e2e8f0', margin: 0, letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
          <span style={{ fontSize: 11, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>
            Sep 25, 2026 · 14:31 UTC
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
          System overview — jobs, crawlers, applications
        </p>
      </div>

      {/* Top stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total Jobs', value: '12,481', sub: '342 new today', delta: '12%', deltaDir: 'up' as const, color: '#e2e8f0' },
          { label: 'Fetched Today', value: '891', sub: '72 in last 4h', delta: '8%', deltaDir: 'up' as const },
          { label: 'Job Sites', value: '147', sub: '89 crawlable · 31 restricted' },
          { label: 'Applications', value: '42', sub: '8 interviewing · 2 offers', color: '#06d6a0' },
        ].map(s => <StatCard key={s.label} stat={s} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Active crawlers */}
        <div>
          <SectionHeader title="Active Crawlers" count={String(ACTIVE_CRAWLERS.length)} />
          <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
            {ACTIVE_CRAWLERS.map((c, i) => (
              <div
                key={c.site}
                style={{
                  padding: '12px 16px',
                  borderBottom: i < ACTIVE_CRAWLERS.length - 1 ? '1px solid #1a2540' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#cbd5e1' }}>{c.site}</span>
                    <span style={{ fontSize: 11, color: '#475569', marginLeft: 8 }}>{c.config}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace' }}>Running</span>
                    <span style={{ fontSize: 11, color: '#475569', marginLeft: 4, fontFamily: 'JetBrains Mono, monospace' }}>ETA {c.eta}</span>
                  </div>
                </div>
                <div style={{ height: 3, background: '#111c35', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    className="progress-animated"
                    style={{
                      height: '100%',
                      width: `${c.progress}%`,
                      background: '#3b82f6',
                      borderRadius: 2,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <div style={{ marginTop: 4, fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>
                  {c.progress}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline */}
        <div>
          <SectionHeader title="Today's Pipeline" />
          <div className="data-card" style={{ borderRadius: 6, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {PIPELINE.map((p, i) => (
                <div key={p.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4, textAlign: 'center' }}>
                      {p.label}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 48,
                          height: 48,
                          borderRadius: 4,
                          background: `${p.color}18`,
                          border: `1px solid ${p.color}30`,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: p.color, fontFamily: 'JetBrains Mono, monospace' }}>
                          {p.count > 999 ? `${(p.count / 1000).toFixed(1)}k` : p.count}
                        </span>
                      </div>
                    </div>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div style={{ fontSize: 14, color: '#243050', flexShrink: 0, marginTop: 8 }}>→</div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: '#334155', fontFamily: 'JetBrains Mono, monospace', borderTop: '1px solid #1a2540', paddingTop: 10 }}>
              891 raw → 391 canonical · 500 deduplicated as existing jobs
            </div>
          </div>
        </div>
      </div>

      {/* Recent crawl sessions */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader title="Recent Crawl Sessions" count="4" />
        <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
                {['Site', 'Configuration', 'Started', 'Duration', 'Jobs Found', 'New Jobs', 'Status'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 16px',
                      textAlign: 'left',
                      fontSize: 10,
                      color: '#475569',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRAWL_SESSIONS.map((s, i) => (
                <tr
                  key={i}
                  className="tr-hover"
                  style={{ borderBottom: i < CRAWL_SESSIONS.length - 1 ? '1px solid #1a2540' : 'none' }}
                >
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>{s.site}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>{s.config}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{s.started}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{s.duration}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{s.jobs}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#06d6a0', fontFamily: 'JetBrains Mono, monospace' }}>+{s.newJobs}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span className={`status-${s.status}`} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: '1px solid', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Jobs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>
            New Jobs
          </span>
          <span style={{ fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>(342 today)</span>
          <div style={{ flex: 1, height: 1, background: '#1a2540' }} />
          <button
            onClick={() => onNavigate('jobs-new')}
            style={{ fontSize: 11, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}
          >
            View all →
          </button>
        </div>
        <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
                {['Title', 'Company', 'Sites', 'Tags', 'Posted', 'Status'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 16px',
                      textAlign: 'left',
                      fontSize: 10,
                      color: '#475569',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECENT_JOBS.map((j, i) => (
                <tr
                  key={i}
                  className="tr-hover"
                  style={{ borderBottom: i < RECENT_JOBS.length - 1 ? '1px solid #1a2540' : 'none', cursor: 'pointer' }}
                >
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{j.title}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#94a3b8' }}>{j.company}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: 11, color: j.sites > 1 ? '#3b82f6' : '#475569', fontFamily: 'JetBrains Mono, monospace' }}>
                      {j.sites > 1 ? `${j.sites} sites` : '1 site'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {j.tags.map(t => (
                        <span
                          key={t}
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 3,
                            background: '#111c35',
                            border: '1px solid #1a2540',
                            color: '#64748b',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{j.posted}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 7px',
                        borderRadius: 3,
                        border: '1px solid',
                        fontFamily: 'JetBrains Mono, monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: j.status === 'New' ? '#06d6a0' : '#64748b',
                        background: j.status === 'New' ? 'rgba(6, 214, 160, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                        borderColor: j.status === 'New' ? 'rgba(6, 214, 160, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                      }}
                    >
                      {j.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
