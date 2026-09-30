import { useState } from 'react'

interface SearchResult {
  title: string
  company: string
  location: string
  remote: boolean
  sites: string[]
  salary?: string
  skills: string[]
  posted: string
  saved: boolean
}

const RESULTS: SearchResult[] = [
  { title: 'Senior Backend Engineer', company: 'Stripe', location: 'Remote', remote: true, sites: ['LinkedIn', 'Greenhouse', 'Indeed'], salary: '$180k–$240k', skills: ['Go', 'Python', 'PostgreSQL'], posted: 'Sep 24', saved: false },
  { title: 'Backend Engineer — Payments API', company: 'Brex', location: 'Remote', remote: true, sites: ['Wellfound', 'LinkedIn'], salary: '$160k–$210k', skills: ['Python', 'Django', 'PostgreSQL'], posted: 'Sep 24', saved: true },
  { title: 'Staff Backend Engineer', company: 'Vercel', location: 'San Francisco', remote: true, sites: ['LinkedIn'], salary: '$200k–$280k', skills: ['TypeScript', 'Node.js', 'Rust'], posted: 'Sep 23', saved: false },
  { title: 'Senior Software Engineer, Infrastructure', company: 'Notion', location: 'Remote', remote: true, sites: ['Greenhouse', 'Indeed'], salary: '$175k–$235k', skills: ['Go', 'Kubernetes', 'PostgreSQL'], posted: 'Sep 23', saved: false },
  { title: 'Backend Engineer, Core Platform', company: 'Linear', location: 'Remote', remote: true, sites: ['Wellfound'], salary: '$150k–$200k', skills: ['Node.js', 'TypeScript', 'Redis'], posted: 'Sep 22', saved: false },
  { title: 'Platform Engineer', company: 'Cloudflare', location: 'Remote', remote: true, sites: ['LinkedIn', 'Indeed', 'Greenhouse', 'Company Page'], salary: '$160k–$220k', skills: ['Rust', 'Go', 'Kubernetes'], posted: 'Sep 22', saved: true },
]

const NEW_SITES = [
  { name: 'jobs.lever.co', url: 'jobs.lever.co', jobs: '1,200+', note: 'ATS platform — high quality listings' },
  { name: 'ashbyhq.com', url: 'ashbyhq.com', jobs: '800+', note: 'Growing ATS — many startups' },
  { name: 'jobsintech.io', url: 'jobsintech.io', jobs: '340+', note: 'Tech-focused job board' },
]

export default function UniversalSearch() {
  const [keywords, setKeywords] = useState('Backend Engineer')
  const [skills, setSkills] = useState('Python, Django, PostgreSQL')
  const [location, setLocation] = useState('Remote')
  const [experience, setExperience] = useState('Senior')
  const [hasSearched, setHasSearched] = useState(false)
  const [autoSave, setAutoSave] = useState(false)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])

  function runSearch() {
    setSearching(true)
    setHasSearched(false)
    setTimeout(() => {
      setResults(RESULTS)
      setHasSearched(true)
      setSearching(false)
    }, 1800)
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Universal Search</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
          Search across all configured sources simultaneously
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'flex-start' }}>
        {/* Search form */}
        <div className="data-card" style={{ borderRadius: 6, padding: 20, position: 'sticky', top: 28 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Search Parameters</div>

          {[
            { label: 'Keywords', value: keywords, set: setKeywords, placeholder: 'Backend Engineer, Python Developer...' },
            { label: 'Skills', value: skills, set: setSkills, placeholder: 'Python, Django, PostgreSQL...' },
            { label: 'Location', value: location, set: setLocation, placeholder: 'Remote, New York...' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{f.label.toUpperCase()}</label>
              <input
                value={f.value}
                onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder}
                style={{ width: '100%', padding: '7px 10px', background: '#111c35', border: '1px solid #1a2540', borderRadius: 5, color: '#e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>EXPERIENCE</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['Any', 'Junior', 'Mid', 'Senior', 'Staff'].map(e => (
                <button
                  key={e}
                  onClick={() => setExperience(e)}
                  style={{ flex: 1, padding: '5px 4px', background: experience === e ? 'rgba(59,130,246,0.15)' : 'none', border: `1px solid ${experience === e ? '#3b82f6' : '#1a2540'}`, borderRadius: 4, color: experience === e ? '#3b82f6' : '#64748b', fontSize: 10, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>SOURCES</label>
            <div style={{ padding: '8px 10px', background: '#111c35', border: '1px solid #1a2540', borderRadius: 5, fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
              <span>All configured sites</span>
              <span style={{ color: '#3b82f6', cursor: 'pointer' }}>Select →</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '10px 12px', background: '#111c35', borderRadius: 5, border: '1px solid #1a2540' }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Auto-save results</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Normalize, dedup, classify, save</div>
            </div>
            <div
              onClick={() => setAutoSave(!autoSave)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: autoSave ? '#3b82f6' : '#1a2540',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute',
                top: 3,
                left: autoSave ? 19 : 3,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>

          <button
            onClick={runSearch}
            disabled={searching}
            style={{ width: '100%', padding: '10px 0', background: searching ? '#1a2540' : '#3b82f6', border: 'none', borderRadius: 5, color: searching ? '#64748b' : '#fff', fontSize: 13, fontWeight: 500, cursor: searching ? 'default' : 'pointer', transition: 'background 0.15s' }}
          >
            {searching ? '⟳ Searching...' : '⊕ Search All Sources'}
          </button>
        </div>

        {/* Results */}
        <div>
          {!hasSearched && !searching && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#334155' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⊕</div>
              <div style={{ fontSize: 14, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>Configure search parameters and run</div>
            </div>
          )}

          {searching && (
            <div style={{ padding: '40px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['LinkedIn', 'Indeed', 'Wellfound', 'HackerNews Jobs', 'Greenhouse ATS', 'RemoteOK'].map((s, i) => (
                  <div key={s} className="data-card" style={{ borderRadius: 6, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#94a3b8', flex: 1 }}>{s}</span>
                    <span style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>Searching...</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasSearched && (
            <div>
              {/* Summary bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div className="data-card" style={{ borderRadius: 6, padding: '14px 18px' }}>
                  <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Jobs Found</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#06d6a0', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{results.length}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>across 6 sources · 2 already saved</div>
                </div>
                <div className="data-card" style={{ borderRadius: 6, padding: '14px 18px' }}>
                  <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>New Sites Discovered</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{NEW_SITES.length}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>potential job sources not yet registered</div>
                </div>
              </div>

              {/* Action bar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button style={{ padding: '7px 14px', background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.25)', borderRadius: 5, color: '#06d6a0', fontSize: 12, cursor: 'pointer' }}>
                  ↓ Save All Jobs
                </button>
                <button style={{ padding: '7px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
                  Filter: Remote only
                </button>
                <button style={{ padding: '7px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
                  Sort: Newest first
                </button>
              </div>

              {/* Job results */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  Jobs
                  <div style={{ flex: 1, height: 1, background: '#1a2540' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {results.map((r, i) => (
                    <div key={i} className="data-card" style={{ borderRadius: 6, padding: '14px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 2 }}>{r.title}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.company} · {r.remote ? <span style={{ color: '#06d6a0' }}>Remote</span> : r.location}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {r.saved && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: '1px solid rgba(6,214,160,0.2)', color: '#06d6a0', background: 'rgba(6,214,160,0.08)', fontFamily: 'JetBrains Mono, monospace' }}>Saved</span>}
                          {!r.saved && (
                            <button style={{ padding: '4px 10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 4, color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>
                              + Save
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{r.salary}</span>
                        <span style={{ color: '#1a2540' }}>·</span>
                        <span style={{ fontSize: 11, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace' }}>{r.sites.length} site{r.sites.length > 1 ? 's' : ''}</span>
                        <span style={{ color: '#1a2540' }}>·</span>
                        <span style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>Posted {r.posted}</span>
                        {r.skills.slice(0, 3).map(s => (
                          <span key={s} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#111c35', border: '1px solid #1a2540', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* New sites */}
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  New Sites Discovered
                  <div style={{ flex: 1, height: 1, background: '#1a2540' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {NEW_SITES.map((s, i) => (
                    <div key={i} className="data-card" style={{ borderRadius: 6, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 2 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#475569' }}>{s.note} · ~{s.jobs} jobs</div>
                      </div>
                      <button style={{ padding: '5px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 4, color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>
                        + Add Site
                      </button>
                      <button style={{ padding: '5px 12px', background: 'none', border: '1px solid #1a2540', borderRadius: 4, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>
                        Ignore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
