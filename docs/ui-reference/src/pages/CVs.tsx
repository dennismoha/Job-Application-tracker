import { useState } from 'react'

interface CV {
  id: number
  name: string
  version: number
  isDefault: boolean
  updated: string
  size: string
  analyses: number
  generated: number
  tags: string[]
}

const CVS: CV[] = [
  { id: 1, name: 'Backend Engineering CV', version: 4, isDefault: true, updated: 'Sep 20, 2026', size: '124 KB', analyses: 18, generated: 3, tags: ['Python', 'Go', 'PostgreSQL', 'AWS', 'Django'] },
  { id: 2, name: 'Platform / DevOps CV', version: 2, isDefault: false, updated: 'Sep 15, 2026', size: '118 KB', analyses: 7, generated: 1, tags: ['Kubernetes', 'Terraform', 'AWS', 'Go'] },
  { id: 3, name: 'Fullstack Engineering CV', version: 1, isDefault: false, updated: 'Aug 30, 2026', size: '131 KB', analyses: 2, generated: 0, tags: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'] },
]

const ANALYSES = [
  { job: 'Senior Backend Engineer @ Stripe', cv: 'Backend Engineering CV v4', match: 78, status: 'Completed', date: 'Sep 25' },
  { job: 'Platform Engineer @ Cloudflare', cv: 'Platform / DevOps CV v2', match: 65, status: 'Completed', date: 'Sep 24' },
  { job: 'Staff Software Engineer @ Vercel', cv: 'Backend Engineering CV v4', match: 71, status: 'Completed', date: 'Sep 23' },
  { job: 'Backend Engineer @ Linear', cv: 'Backend Engineering CV v4', match: 82, status: 'Completed', date: 'Sep 22' },
  { job: 'Python Developer @ Startup X', cv: 'Backend Engineering CV v4', match: 0, status: 'Processing', date: 'Sep 25' },
]

function MatchBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? '#06d6a0' : pct >= 55 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#111c35', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: 'JetBrains Mono, monospace', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

export default function CVs() {
  const [selected, setSelected] = useState<CV | null>(CVS[0])
  const [activeTab, setActiveTab] = useState<'library' | 'analyses' | 'generated'>('library')

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em' }}>CVs & Resumés</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
            {CVS.length} CVs · {ANALYSES.length} analyses run
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '8px 16px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
            ↑ Upload CV
          </button>
          <button style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            ✦ Generate from Job
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #1a2540', marginBottom: 20 }}>
        {(['library', 'analyses', 'generated'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ padding: '10px 0', marginRight: 24, background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#3b82f6' : 'transparent'}`, color: activeTab === tab ? '#e2e8f0' : '#64748b', fontSize: 13, cursor: 'pointer', fontWeight: activeTab === tab ? 500 : 400, textTransform: 'capitalize' }}
          >
            {tab === 'library' ? 'CV Library' : tab === 'analyses' ? `Analyses (${ANALYSES.length})` : 'Generated CVs'}
          </button>
        ))}
      </div>

      {activeTab === 'library' && (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CVS.map(cv => (
              <div
                key={cv.id}
                className="data-card"
                onClick={() => setSelected(selected?.id === cv.id ? null : cv)}
                style={{
                  borderRadius: 6,
                  padding: '18px 20px',
                  cursor: 'pointer',
                  borderColor: selected?.id === cv.id ? '#3b82f6' : undefined,
                  background: selected?.id === cv.id ? 'rgba(59,130,246,0.04)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{cv.name}</div>
                      {cv.isDefault && (
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, border: '1px solid rgba(6,214,160,0.25)', color: '#06d6a0', background: 'rgba(6,214,160,0.08)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Default
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Version {cv.version} · Updated {cv.updated} · {cv.size}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={e => e.stopPropagation()} style={{ padding: '4px 10px', background: 'none', border: '1px solid #1a2540', borderRadius: 4, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>
                      Download
                    </button>
                    <button onClick={e => e.stopPropagation()} style={{ padding: '4px 10px', background: 'none', border: '1px solid #1a2540', borderRadius: 4, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>
                      Replace
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                  {cv.tags.map(t => (
                    <span key={t} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: '#93c5fd', fontFamily: 'JetBrains Mono, monospace' }}>
                      {t}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8', fontWeight: 600 }}>{cv.analyses}</span> analyses
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8', fontWeight: 600 }}>{cv.generated}</span> tailored CVs generated
                  </div>
                </div>
              </div>
            ))}

            <div
              style={{ borderRadius: 6, border: '2px dashed #1a2540', padding: '24px', textAlign: 'center', cursor: 'pointer', color: '#334155', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#243050')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a2540')}
            >
              <div style={{ fontSize: 20, marginBottom: 8 }}>↑</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 2 }}>Upload a new CV</div>
              <div style={{ fontSize: 11, color: '#334155' }}>PDF or DOCX · Max 10MB</div>
            </div>
          </div>

          {selected && (
            <div className="data-card" style={{ borderRadius: 6, padding: 20, position: 'sticky', top: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>v{selected.version} · {selected.updated}</div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Skills Detected</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selected.tags.map(t => (
                    <span key={t} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd', fontFamily: 'JetBrains Mono, monospace' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {ANALYSES.filter(a => a.cv.startsWith(selected.name)).slice(0, 3).map((a, i) => (
                  <div key={i} style={{ background: '#111c35', borderRadius: 5, padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{a.job}</div>
                    {a.status === 'Processing' ? (
                      <div style={{ fontSize: 11, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace' }}>Processing...</div>
                    ) : (
                      <MatchBar pct={a.match} />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!selected.isDefault && (
                  <button style={{ padding: '8px 0', background: 'none', border: '1px solid rgba(6,214,160,0.25)', borderRadius: 5, color: '#06d6a0', fontSize: 12, cursor: 'pointer' }}>
                    Set as Default
                  </button>
                )}
                <button style={{ padding: '8px 0', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 5, color: '#8b5cf6', fontSize: 12, cursor: 'pointer' }}>
                  ✦ Generate Tailored Version
                </button>
                <button style={{ padding: '8px 0', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 5, color: '#3b82f6', fontSize: 12, cursor: 'pointer' }}>
                  ⊕ Batch Analysis — All Saved Jobs
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analyses' && (
        <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
                {['Job', 'CV Used', 'Match Score', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ANALYSES.map((a, i) => (
                <tr key={i} className="tr-hover" style={{ borderBottom: i < ANALYSES.length - 1 ? '1px solid #1a2540' : 'none' }}>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{a.job}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748b' }}>{a.cv}</td>
                  <td style={{ padding: '11px 16px', minWidth: 160 }}>
                    {a.status === 'Processing' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
                        <span style={{ fontSize: 11, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace' }}>Processing</span>
                      </div>
                    ) : (
                      <MatchBar pct={a.match} />
                    )}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: `1px solid ${a.status === 'Processing' ? 'rgba(59,130,246,0.2)' : 'rgba(6,214,160,0.2)'}`, color: a.status === 'Processing' ? '#3b82f6' : '#06d6a0', background: a.status === 'Processing' ? 'rgba(59,130,246,0.08)' : 'rgba(6,214,160,0.08)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{a.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'generated' && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#334155' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
          <div style={{ fontSize: 14, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>No tailored CVs generated yet</div>
          <div style={{ fontSize: 12, color: '#334155' }}>Open a job and click "Generate Tailored CV" to create a customized version.</div>
        </div>
      )}
    </div>
  )
}
