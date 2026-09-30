import { useState } from 'react'
import { Breadcrumbs } from '../components/UI'

const LOG_ENTRIES = [
  { ts: '14:02:01', url: 'linkedin.com/jobs/search?q=Backend+Engineer&location=Remote&start=0', action: 'GET',    result: 'OK',    status: 200, jobs: 25 },
  { ts: '14:02:08', url: 'linkedin.com/jobs/search?q=Backend+Engineer&location=Remote&start=25', action: 'GET',  result: 'OK',    status: 200, jobs: 25 },
  { ts: '14:02:14', url: 'linkedin.com/jobs/123456', action: 'GET',                              result: 'OK',    status: 200, jobs: null },
  { ts: '14:02:19', url: 'linkedin.com/jobs/123457', action: 'GET',                              result: 'OK',    status: 200, jobs: null },
  { ts: '14:02:25', url: 'linkedin.com/jobs/search?q=Backend+Engineer&location=Remote&start=50', action: 'GET',  result: 'OK',    status: 200, jobs: 18 },
  { ts: '14:02:31', url: 'linkedin.com/jobs/123501', action: 'GET',                              result: 'RATE_LIMIT', status: 429, jobs: null },
  { ts: '14:02:36', url: 'linkedin.com/jobs/123501', action: 'RETRY',                            result: 'OK',    status: 200, jobs: null },
  { ts: '14:02:44', url: 'linkedin.com/jobs/search?q=Backend+Engineer&location=Remote&start=75', action: 'GET',  result: 'OK',    status: 200, jobs: 20 },
  { ts: '14:03:01', url: 'linkedin.com/jobs/search?q=Backend+Engineer&location=Remote&start=100',action: 'GET',  result: 'OK',    status: 200, jobs: 12 },
  { ts: '14:03:10', url: '[PIPELINE] Normalize',                                                  action: 'PROC', result: 'OK',    status: 200, jobs: 100 },
  { ts: '14:03:18', url: '[PIPELINE] Classify skills',                                            action: 'PROC', result: 'OK',    status: 200, jobs: 98 },
  { ts: '14:03:24', url: '[PIPELINE] Fingerprint',                                                action: 'PROC', result: 'OK',    status: 200, jobs: 98 },
  { ts: '14:03:31', url: '[PIPELINE] Deduplication',                                             action: 'PROC', result: 'OK',    status: 200, jobs: 42 },
  { ts: '14:03:40', url: '[PIPELINE] Save canonical jobs',                                        action: 'PROC', result: 'OK',    status: 200, jobs: 13 },
  { ts: '14:03:44', url: '[PIPELINE] Save job listings',                                         action: 'PROC', result: 'OK',    status: 200, jobs: 42 },
]

const RESULT_COLOR: Record<string, string> = {
  OK:         '#06d6a0',
  RATE_LIMIT: '#f59e0b',
  RETRY:      '#f59e0b',
  ERROR:      '#ef4444',
}

export default function CrawlSessionDetail({ onBack }: { onBack: () => void }) {
  const [logFilter, setLogFilter] = useState<'all' | 'errors' | 'pipeline'>('all')

  const filtered = LOG_ENTRIES.filter(e => {
    if (logFilter === 'errors')   return e.result !== 'OK'
    if (logFilter === 'pipeline') return e.action === 'PROC'
    return true
  })

  const session = {
    id: 'CS-2041',
    site: 'LinkedIn',
    config: 'SE Remote',
    status: 'completed',
    started: '14:02:01',
    finished: '14:09:44',
    duration: '7m 43s',
    pages: 18,
    jobsFound: 100,
    newJobs: 13,
    existing: 29,
    duplicates: 58,
    failed: 1,
    errors: ['Rate limit hit on job/123501 — retried successfully'],
  }

  return (
    <div className="page-pad">
      <Breadcrumbs items={[{ label: 'Crawling', onClick: onBack }, { label: 'Sessions', onClick: onBack }, { label: session.id }]} />

      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
              Session {session.id}
            </h1>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, border: '1px solid rgba(6,214,160,0.2)', color: '#06d6a0', background: 'rgba(6,214,160,0.08)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
              {session.status}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
            {session.site} · {session.config} · {session.started} → {session.finished}
          </p>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Duration',  val: session.duration,  color: '#e2e8f0' },
          { label: 'Pages',     val: session.pages,     color: '#e2e8f0' },
          { label: 'Scraped',   val: session.jobsFound, color: '#e2e8f0' },
          { label: 'New',       val: session.newJobs,   color: '#06d6a0' },
          { label: 'Existing',  val: session.existing,  color: '#64748b' },
          { label: 'Dupes',     val: session.duplicates,color: '#475569' },
          { label: 'Failed',    val: session.failed,    color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="data-card" style={{ borderRadius: 6, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Pipeline summary */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          Pipeline
          <div style={{ flex: 1, height: 1, background: '#1a2540' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
          {[
            { label: 'Scraped',    n: 100, color: '#3b82f6' },
            { label: 'Normalized', n: 100, color: '#3b82f6' },
            { label: 'Classified', n: 98,  color: '#8b5cf6' },
            { label: 'Fingerprinted', n: 98, color: '#8b5cf6' },
            { label: 'Deduped',    n: 42,  color: '#f59e0b' },
            { label: 'New Canon.',  n: 13,  color: '#06d6a0' },
            { label: 'Listings',   n: 42,  color: '#06d6a0' },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ textAlign: 'center', padding: '0 4px' }}>
                <div style={{ fontSize: 9, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                <div style={{ width: 52, height: 52, borderRadius: 6, background: `${s.color}18`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.n}</span>
                </div>
              </div>
              {i < arr.length - 1 && <span style={{ color: '#243050', margin: '0 2px', fontSize: 14, paddingTop: 14 }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Errors */}
      {session.errors.length > 0 && (
        <div style={{ marginBottom: 20, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Warnings ({session.errors.length})</div>
          {session.errors.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#f59e0b' }}>⚠</span> {e}
            </div>
          ))}
        </div>
      )}

      {/* Logs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Crawl Log</span>
          <div style={{ flex: 1, height: 1, background: '#1a2540' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'errors', 'pipeline'] as const).map(f => (
              <button key={f} onClick={() => setLogFilter(f)}
                style={{ padding: '4px 10px', background: logFilter === f ? 'rgba(59,130,246,0.15)' : 'none', border: `1px solid ${logFilter === f ? '#3b82f6' : '#1a2540'}`, borderRadius: 4, color: logFilter === f ? '#3b82f6' : '#64748b', fontSize: 11, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, maxHeight: 380, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 60px 1fr 80px 60px', background: '#0a1020', borderBottom: '1px solid #1a2540', padding: '7px 14px', gap: 10 }}>
              {['Time', 'Action', 'URL / Event', 'Result', 'Status'].map(h => (
                <div key={h} style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
              ))}
            </div>
            {filtered.map((e, i) => (
              <div
                key={i}
                style={{
                  display: 'grid', gridTemplateColumns: '70px 60px 1fr 80px 60px',
                  padding: '6px 14px', gap: 10,
                  borderBottom: i < filtered.length - 1 ? '1px solid #1a2540' : 'none',
                  background: e.result !== 'OK' ? 'rgba(245,158,11,0.04)' : 'none',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: '#334155' }}>{e.ts}</span>
                <span style={{ color: e.action === 'PROC' ? '#8b5cf6' : e.action === 'RETRY' ? '#f59e0b' : '#64748b' }}>{e.action}</span>
                <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.url}</span>
                <span style={{ color: RESULT_COLOR[e.result] ?? '#64748b' }}>{e.result}</span>
                <span style={{ color: e.status === 200 ? '#475569' : '#f59e0b' }}>{e.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
