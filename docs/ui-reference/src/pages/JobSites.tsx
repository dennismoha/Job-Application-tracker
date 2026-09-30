import { useState } from 'react'

interface Site {
  name: string
  url: string
  crawlability: 'Crawlable' | 'Restricted' | 'Uncertain'
  auth: 'Required' | 'Optional' | 'None'
  botProtection: 'Detected' | 'Low' | 'None'
  jsRequired: boolean
  active: boolean
  reputation: 'Trusted' | 'Unverified' | 'Scam' | 'Blocked'
  lastCrawl: string
  jobsTotal: number
  confidence: number
}

interface SiteJob {
  title: string
  company: string
  posted: string
  firstSeen: string
  lastFetched: string
  appStatus: string
  salary?: string
}

interface CrawlConfig {
  name: string
  keywords: string
  location: string
  frequency: string
  enabled: boolean
  nextRun: string
}

const SITE_JOBS: Record<string, SiteJob[]> = {
  LinkedIn: [
    { title: 'Senior Backend Engineer', company: 'Stripe', posted: 'Sep 24', firstSeen: 'Sep 24', lastFetched: 'Sep 25 14:02', appStatus: 'Considering', salary: '$180k–$240k' },
    { title: 'Staff Software Engineer', company: 'Vercel', posted: 'Sep 24', firstSeen: 'Sep 24', lastFetched: 'Sep 25 13:30', appStatus: 'Not Applied', salary: '$200k–$280k' },
    { title: 'Platform Engineer', company: 'Cloudflare', posted: 'Sep 23', firstSeen: 'Sep 23', lastFetched: 'Sep 25 12:00', appStatus: 'Not Applied', salary: '$160k–$220k' },
    { title: 'Senior DevOps Engineer', company: 'GitHub', posted: 'Sep 23', firstSeen: 'Sep 23', lastFetched: 'Sep 25 11:00', appStatus: 'Not Applied', salary: '$170k–$230k' },
    { title: 'Principal Engineer', company: 'Figma', posted: 'Sep 22', firstSeen: 'Sep 22', lastFetched: 'Sep 25 10:00', appStatus: 'Not Applied' },
  ],
  Indeed: [
    { title: 'Backend Engineer', company: 'Linear', posted: 'Sep 22', firstSeen: 'Sep 23', lastFetched: 'Sep 25 13:00', appStatus: 'Applied', salary: '$140k–$200k' },
    { title: 'Senior Backend Engineer', company: 'Stripe', posted: 'Sep 24', firstSeen: 'Sep 25', lastFetched: 'Sep 25 14:02', appStatus: 'Considering', salary: '$180k–$240k' },
    { title: 'Python Developer', company: 'DataCo', posted: 'Sep 21', firstSeen: 'Sep 22', lastFetched: 'Sep 25 09:00', appStatus: 'Not Applied' },
  ],
  'HackerNews Jobs': [
    { title: 'Backend Engineer (Rust)', company: 'Mysten Labs', posted: 'Sep 23', firstSeen: 'Sep 23', lastFetched: 'Sep 25 12:00', appStatus: 'Not Applied' },
    { title: 'Founding Engineer', company: 'Stealth AI Startup', posted: 'Sep 22', firstSeen: 'Sep 22', lastFetched: 'Sep 25 12:00', appStatus: 'Not Applied' },
    { title: 'Staff Engineer', company: 'Warp', posted: 'Sep 21', firstSeen: 'Sep 21', lastFetched: 'Sep 25 12:00', appStatus: 'Not Applied' },
  ],
  Wellfound: [
    { title: 'Senior Full Stack Engineer', company: 'Loom', posted: 'Sep 24', firstSeen: 'Sep 24', lastFetched: 'Sep 25 11:00', appStatus: 'Not Applied' },
    { title: 'Backend Engineer', company: 'Linear', posted: 'Sep 22', firstSeen: 'Sep 23', lastFetched: 'Sep 25 11:00', appStatus: 'Applied' },
  ],
}

const SITE_CONFIGS: Record<string, CrawlConfig[]> = {
  LinkedIn: [
    { name: 'SE Remote', keywords: 'Software Engineer, Backend Engineer', location: 'Remote', frequency: 'Every 4h', enabled: true, nextRun: '14:00' },
    { name: 'DevOps Remote', keywords: 'DevOps, Platform Engineer, SRE', location: 'Remote', frequency: 'Every 6h', enabled: true, nextRun: '16:00' },
    { name: 'Data Science', keywords: 'Data Scientist, ML Engineer', location: 'Any', frequency: 'Every 8h', enabled: false, nextRun: '—' },
  ],
  Indeed: [
    { name: 'SE Remote', keywords: 'Software Engineer, Backend Engineer', location: 'Remote', frequency: 'Every 4h', enabled: true, nextRun: '14:00' },
  ],
}

const SITES: Site[] = [
  { name: 'LinkedIn', url: 'linkedin.com', crawlability: 'Restricted', auth: 'Required', botProtection: 'Detected', jsRequired: true, active: true, reputation: 'Trusted', lastCrawl: '2h ago', jobsTotal: 4821, confidence: 95 },
  { name: 'Indeed', url: 'indeed.com', crawlability: 'Crawlable', auth: 'Optional', botProtection: 'Low', jsRequired: false, active: true, reputation: 'Trusted', lastCrawl: '30m ago', jobsTotal: 3102, confidence: 89 },
  { name: 'HackerNews Jobs', url: 'news.ycombinator.com/jobs', crawlability: 'Crawlable', auth: 'None', botProtection: 'None', jsRequired: false, active: true, reputation: 'Trusted', lastCrawl: '1h ago', jobsTotal: 312, confidence: 97 },
  { name: 'Wellfound', url: 'wellfound.com', crawlability: 'Crawlable', auth: 'Optional', botProtection: 'Low', jsRequired: true, active: true, reputation: 'Trusted', lastCrawl: '45m ago', jobsTotal: 892, confidence: 82 },
  { name: 'Glassdoor', url: 'glassdoor.com', crawlability: 'Restricted', auth: 'Required', botProtection: 'Detected', jsRequired: true, active: true, reputation: 'Trusted', lastCrawl: '3h ago', jobsTotal: 2100, confidence: 78 },
  { name: 'RemoteOK', url: 'remoteok.com', crawlability: 'Crawlable', auth: 'None', botProtection: 'None', jsRequired: false, active: true, reputation: 'Trusted', lastCrawl: '20m ago', jobsTotal: 421, confidence: 96 },
  { name: 'Greenhouse ATS', url: 'boards.greenhouse.io', crawlability: 'Crawlable', auth: 'None', botProtection: 'None', jsRequired: false, active: true, reputation: 'Trusted', lastCrawl: '1h ago', jobsTotal: 1893, confidence: 94 },
  { name: 'Workday', url: 'myworkday.com', crawlability: 'Uncertain', auth: 'Required', botProtection: 'Detected', jsRequired: true, active: false, reputation: 'Unverified', lastCrawl: '2d ago', jobsTotal: 0, confidence: 41 },
  { name: 'ScamJobs.biz', url: 'scamjobs.biz', crawlability: 'Crawlable', auth: 'None', botProtection: 'None', jsRequired: false, active: false, reputation: 'Scam', lastCrawl: '1w ago', jobsTotal: 23, confidence: 99 },
]

/* ── small helpers ── */
function Chip({ color, bg, border, children }: { color: string; bg: string; border: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: `1px solid ${border}`, color, background: bg, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
    </span>
  )
}

function CrawlabilityBadge({ val }: { val: Site['crawlability'] }) {
  const map = {
    Crawlable:  { color: '#06d6a0', bg: 'rgba(6,214,160,0.1)',   border: 'rgba(6,214,160,0.2)' },
    Restricted: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
    Uncertain:  { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)' },
  }
  return <Chip {...map[val]}>{val}</Chip>
}

function ReputationBadge({ val }: { val: Site['reputation'] }) {
  const map = {
    Trusted:    { color: '#06d6a0', bg: 'rgba(6,214,160,0.08)',   border: 'rgba(6,214,160,0.15)' },
    Unverified: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.15)' },
    Scam:       { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.15)' },
    Blocked:    { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.15)' },
  }
  return <Chip {...map[val]}>{val}</Chip>
}

function AppStatusBadge({ s }: { s: string }) {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    'Not Applied': { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.15)' },
    Considering:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.15)' },
    Applied:       { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.15)' },
    Rejected:      { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.15)' },
    Interviewing:  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.15)' },
  }
  const c = map[s] ?? map['Not Applied']
  return <Chip {...c}>{s}</Chip>
}

/* ── Add Job Modal ── */
function AddJobModal({ site, onClose }: { site: Site; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [url, setUrl] = useState('')
  const [location, setLocation] = useState('Remote')
  const [salary, setSalary] = useState('')
  const [done, setDone] = useState(false)

  function submit() {
    if (!title || !url) return
    setDone(true)
  }

  if (done) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
        <div style={{ background: '#0d1425', border: '1px solid #1a2540', borderRadius: 8, width: 400, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#06d6a0', marginBottom: 6 }}>Job added manually</div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>Listed under <strong style={{ color: '#94a3b8' }}>{site.name}</strong></div>
          <div style={{ fontSize: 11, color: '#334155', fontFamily: 'JetBrains Mono, monospace', marginBottom: 20 }}>source = manual_entry</div>
          <button onClick={onClose} style={{ padding: '8px 24px', background: '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Done</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#0d1425', border: '1px solid #1a2540', borderRadius: 8, width: 460, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>Add Job Manually</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>
          Adding under <strong style={{ color: '#94a3b8' }}>{site.name}</strong> · {site.url}
        </div>

        {[
          { label: 'Job Title *', value: title, set: setTitle, placeholder: 'e.g. Senior Backend Engineer' },
          { label: 'Company', value: company, set: setCompany, placeholder: 'e.g. Stripe' },
          { label: 'Job URL *', value: url, set: setUrl, placeholder: `https://${site.url}/jobs/...` },
          { label: 'Location', value: location, set: setLocation, placeholder: 'Remote / New York / Hybrid' },
          { label: 'Salary', value: salary, set: setSalary, placeholder: '$120k–$180k (optional)' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>
              {f.label.toUpperCase()}
            </label>
            <input
              value={f.value}
              onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              style={{ width: '100%', padding: '8px 10px', background: '#111c35', border: '1px solid #1a2540', borderRadius: 5, color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}

        <div style={{ padding: '10px 12px', background: '#111c35', border: '1px solid #1a2540', borderRadius: 5, marginBottom: 18, fontSize: 11, color: '#64748b' }}>
          The job will be normalized, deduplicated against existing records, and tagged <span style={{ color: '#8b5cf6', fontFamily: 'JetBrains Mono, monospace' }}>manual_entry</span>.
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={submit} style={{ flex: 1, padding: '9px 0', background: '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Add Job →
          </button>
          <button onClick={onClose} style={{ padding: '9px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Add Crawl Config Modal ── */
function AddCrawlModal({ site, onClose }: { site: Site; onClose: () => void }) {
  const [name, setName] = useState('')
  const [keywords, setKeywords] = useState('')
  const [location, setLocation] = useState('Remote')
  const [freq, setFreq] = useState('4')
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
        <div style={{ background: '#0d1425', border: '1px solid #1a2540', borderRadius: 8, width: 400, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#06d6a0', marginBottom: 4 }}>Crawl configuration created</div>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>Scheduled to run every {freq} hours on <strong style={{ color: '#94a3b8' }}>{site.name}</strong></div>
          <button onClick={onClose} style={{ padding: '8px 24px', background: '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Done</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#0d1425', border: '1px solid #1a2540', borderRadius: 8, width: 460, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>New Crawl Configuration</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>
          Crawling <strong style={{ color: '#94a3b8' }}>{site.name}</strong>
          {site.crawlability === 'Restricted' && <span style={{ color: '#f59e0b', marginLeft: 8 }}>⚠ Site is restricted — manual auth may be required</span>}
        </div>

        {[
          { label: 'Config Name', value: name, set: setName, placeholder: 'e.g. SE Remote' },
          { label: 'Keywords', value: keywords, set: setKeywords, placeholder: 'Software Engineer, Backend Engineer' },
          { label: 'Location', value: location, set: setLocation, placeholder: 'Remote / New York / Any' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>{f.label.toUpperCase()}</label>
            <input
              value={f.value}
              onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              style={{ width: '100%', padding: '8px 10px', background: '#111c35', border: '1px solid #1a2540', borderRadius: 5, color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>FREQUENCY</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['1', '2', '4', '6', '8', '12', '24'].map(h => (
              <button
                key={h}
                onClick={() => setFreq(h)}
                style={{
                  flex: 1, padding: '7px 0',
                  background: freq === h ? 'rgba(59,130,246,0.15)' : 'none',
                  border: `1px solid ${freq === h ? '#3b82f6' : '#1a2540'}`,
                  borderRadius: 4, color: freq === h ? '#3b82f6' : '#64748b',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setDone(true)} style={{ flex: 1, padding: '9px 0', background: '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Create Configuration →
          </button>
          <button onClick={onClose} style={{ padding: '9px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Site Detail Drawer ── */
function SiteDetail({ site, onClose }: { site: Site; onClose: () => void }) {
  const [tab, setTab] = useState<'jobs' | 'configs' | 'analysis'>('jobs')
  const [showAddJob, setShowAddJob] = useState(false)
  const [showAddCrawl, setShowAddCrawl] = useState(false)

  const jobs = SITE_JOBS[site.name] ?? []
  const configs = SITE_CONFIGS[site.name] ?? []

  const capabilities = [
    { label: 'Public access',         ok: site.auth === 'None',          warn: false },
    { label: 'Auth required',         ok: false,                         warn: site.auth === 'Required' },
    { label: 'JavaScript rendering',  ok: false,                         warn: site.jsRequired },
    { label: 'Bot protection',        ok: false,                         warn: site.botProtection === 'Detected' },
    { label: 'Static HTML',           ok: !site.jsRequired,              warn: false },
    { label: 'No major restrictions', ok: site.botProtection === 'None', warn: false },
  ]

  return (
    <>
      {showAddJob   && <AddJobModal   site={site} onClose={() => setShowAddJob(false)}   />}
      {showAddCrawl && <AddCrawlModal site={site} onClose={() => setShowAddCrawl(false)} />}

      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 100,
      }}>
        <div style={{
          width: 580, height: '100%',
          background: '#0d1425', borderLeft: '1px solid #1a2540',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a2540' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: site.active ? '#06d6a0' : '#334155' }} />
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#e2e8f0' }}>{site.name}</h2>
                </div>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{site.url}</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <CrawlabilityBadge val={site.crawlability} />
              <ReputationBadge val={site.reputation} />
              <Chip color="#94a3b8" bg="rgba(148,163,184,0.08)" border="rgba(148,163,184,0.15)">
                Auth: {site.auth}
              </Chip>
              <Chip color={site.botProtection === 'Detected' ? '#ef4444' : '#06d6a0'}
                bg={site.botProtection === 'Detected' ? 'rgba(239,68,68,0.08)' : 'rgba(6,214,160,0.08)'}
                border={site.botProtection === 'Detected' ? 'rgba(239,68,68,0.15)' : 'rgba(6,214,160,0.15)'}>
                Bot: {site.botProtection}
              </Chip>
            </div>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'Jobs tracked', val: site.jobsTotal.toLocaleString() },
                { label: 'Last crawl', val: site.lastCrawl },
                { label: 'Confidence', val: `${site.confidence}%` },
              ].map(s => (
                <div key={s.label} style={{ background: '#111c35', borderRadius: 5, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace' }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1a2540', padding: '0 24px' }}>
            {([
              { key: 'jobs',     label: `Jobs (${jobs.length || site.jobsTotal.toLocaleString()})` },
              { key: 'configs',  label: `Crawl Configs (${configs.length})` },
              { key: 'analysis', label: 'Analysis' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '10px 0', marginRight: 24, background: 'none', border: 'none',
                  borderBottom: `2px solid ${tab === t.key ? '#3b82f6' : 'transparent'}`,
                  color: tab === t.key ? '#e2e8f0' : '#64748b',
                  fontSize: 12, cursor: 'pointer', fontWeight: tab === t.key ? 500 : 400,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

            {/* ── JOBS tab ── */}
            {tab === 'jobs' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Jobs fetched from <strong style={{ color: '#94a3b8' }}>{site.name}</strong>.
                    <span style={{ color: '#475569' }}> Fetched recently ≠ posted recently.</span>
                  </div>
                  <button
                    onClick={() => setShowAddJob(true)}
                    style={{ padding: '5px 12px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 5, color: '#3b82f6', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    + Add Manually
                  </button>
                </div>

                {jobs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#334155', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                    No sample jobs available for this site.<br />
                    <button onClick={() => setShowAddJob(true)} style={{ marginTop: 10, padding: '6px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>+ Add a Job Manually</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {jobs.map((j, i) => (
                      <div key={i} style={{ background: '#111c35', border: '1px solid #1a2540', borderRadius: 6, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 2 }}>{j.title}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{j.company}{j.salary && <span style={{ color: '#64748b', marginLeft: 8 }}>{j.salary}</span>}</div>
                          </div>
                          <AppStatusBadge s={j.appStatus} />
                        </div>
                        <div style={{ display: 'flex', gap: 14, fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>
                          <span>Posted: {j.posted}</span>
                          <span>First seen: {j.firstSeen}</span>
                          <span style={{ color: '#334155' }}>Fetched: {j.lastFetched}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── CONFIGS tab ── */}
            {tab === 'configs' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Crawl configurations for this site.</div>
                  <button
                    onClick={() => setShowAddCrawl(true)}
                    style={{ padding: '5px 12px', background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.25)', borderRadius: 5, color: '#06d6a0', fontSize: 11, cursor: 'pointer' }}
                  >
                    + New Config
                  </button>
                </div>

                {configs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#334155', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                    No crawl configurations yet.
                    {site.crawlability === 'Restricted' && (
                      <div style={{ marginTop: 6, color: '#f59e0b', fontSize: 11 }}>⚠ This site is restricted — crawling may be limited.</div>
                    )}
                    <br />
                    <button onClick={() => setShowAddCrawl(true)} style={{ marginTop: 10, padding: '6px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>+ Create Configuration</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {configs.map((c, i) => (
                      <div key={i} style={{ background: '#111c35', border: '1px solid #1a2540', borderRadius: 6, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{c.name}</span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: `1px solid ${c.enabled ? 'rgba(6,214,160,0.2)' : 'rgba(100,116,139,0.2)'}`, color: c.enabled ? '#06d6a0' : '#64748b', background: c.enabled ? 'rgba(6,214,160,0.08)' : 'rgba(100,116,139,0.08)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                              {c.enabled ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                          {[
                            { label: 'Keywords', val: c.keywords },
                            { label: 'Location', val: c.location },
                            { label: 'Frequency', val: c.frequency },
                          ].map(r => (
                            <div key={r.label}>
                              <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{r.label}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.val}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace' }}>Next: {c.nextRun}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button style={{ padding: '3px 10px', background: 'none', border: '1px solid #1a2540', borderRadius: 4, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                            <button style={{ padding: '3px 10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 4, color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>▶ Run Now</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ANALYSIS tab ── */}
            {tab === 'analysis' && (
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Capabilities</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  {capabilities.map(c => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: c.warn ? '#f59e0b' : c.ok ? '#06d6a0' : '#334155', width: 14 }}>
                        {c.warn ? '⚠' : c.ok ? '✓' : '·'}
                      </span>
                      <span style={{ fontSize: 12, color: c.warn ? '#94a3b8' : c.ok ? '#94a3b8' : '#475569' }}>{c.label}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#111c35', borderRadius: 6, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>Classification</div>
                      <CrawlabilityBadge val={site.crawlability} />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>Confidence</div>
                      <span style={{ fontSize: 22, fontWeight: 700, color: site.confidence > 80 ? '#06d6a0' : '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>{site.confidence}%</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ flex: 1, padding: '8px 0', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 5, color: '#3b82f6', fontSize: 12, cursor: 'pointer' }}>
                    ⟳ Re-run Analysis
                  </button>
                  <button style={{ padding: '8px 14px', background: 'none', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>
                    Mark Scam
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Add Site Modal ── */
function AddSiteModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'form' | 'analyzing' | 'result'>('form')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  function submit() {
    if (!name || !url) return
    setStep('analyzing')
    setTimeout(() => setStep('result'), 2200)
  }

  if (step === 'analyzing') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
        <div style={{ background: '#0d1425', border: '1px solid #1a2540', borderRadius: 8, width: 400, padding: 32, textAlign: 'center' }}>
          <div className="pulse" style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '2px solid #3b82f6', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⟳</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 6 }}>Analyzing {name}...</div>
          <div style={{ fontSize: 12, color: '#475569' }}>Inspecting site capabilities and restrictions</div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' }}>
            {['Checking public access...', 'Detecting JavaScript requirements...', 'Inspecting robots.txt...', 'Testing search availability...'].map(l => (
              <div key={l} style={{ fontSize: 11, color: '#334155', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#3b82f6' }}>›</span> {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (step === 'result') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
        <div style={{ background: '#0d1425', border: '1px solid #1a2540', borderRadius: 8, width: 480, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>{name}</h2>
              <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{url}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>Analysis Complete</div>
          {[
            { icon: '✓', label: 'Public access', color: '#06d6a0' },
            { icon: '✓', label: 'Public job search', color: '#06d6a0' },
            { icon: '✓', label: 'Static HTML — no heavy JS required', color: '#06d6a0' },
            { icon: '⚠', label: 'Some JavaScript detected', color: '#f59e0b' },
            { icon: '✓', label: 'No significant bot protection', color: '#06d6a0' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ color: r.color, fontSize: 12 }}>{r.icon}</span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{r.label}</span>
            </div>
          ))}
          <div style={{ background: '#111c35', borderRadius: 6, padding: '12px 16px', margin: '16px 0', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>Classification</div>
              <Chip color="#06d6a0" bg="rgba(6,214,160,0.1)" border="rgba(6,214,160,0.2)">Crawlable</Chip>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>Confidence</div>
              <span style={{ fontSize: 20, fontWeight: 600, color: '#06d6a0', fontFamily: 'JetBrains Mono, monospace' }}>92%</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '8px 0', background: '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Save Site</button>
            <button onClick={onClose} style={{ padding: '8px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 13, cursor: 'pointer' }}>Discard</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#0d1425', border: '1px solid #1a2540', borderRadius: 8, width: 420, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>Add Job Site</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        {[
          { label: 'Site Name', value: name, set: setName, placeholder: 'e.g. LinkedIn' },
          { label: 'Base URL', value: url, set: setUrl, placeholder: 'https://www.example.com' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{f.label.toUpperCase()}</label>
            <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
              style={{ width: '100%', padding: '8px 12px', background: '#111c35', border: '1px solid #1a2540', borderRadius: 5, color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ))}
        <div style={{ padding: '10px 12px', background: '#111c35', borderRadius: 5, marginBottom: 20, border: '1px solid #1a2540', fontSize: 11, color: '#64748b' }}>
          The URL will be normalized, checked for duplicates, and the site will be automatically analyzed for crawlability.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={submit} style={{ flex: 1, padding: '9px 0', background: '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Add & Analyze →
          </button>
          <button onClick={onClose} style={{ padding: '9px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ── */
export default function JobSites({ filter, onNavigate }: { filter: string; onNavigate: (p: string) => void }) {
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = SITES.filter(s => {
    if (filter === 'sites-crawlable' && s.crawlability !== 'Crawlable') return false
    if (filter === 'sites-restricted' && s.crawlability !== 'Restricted') return false
    if (filter === 'sites-scam' && s.reputation !== 'Scam') return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.url.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const title = filter === 'sites-crawlable' ? 'Crawlable Sites' : filter === 'sites-restricted' ? 'Restricted Sites' : filter === 'sites-scam' ? 'Scam Sites' : 'All Job Sites'

  return (
    <div className="page-pad">
      {selectedSite && <SiteDetail site={selectedSite} onClose={() => setSelectedSite(null)} />}
      {showAdd && <AddSiteModal onClose={() => setShowAdd(false)} />}

      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em' }}>{title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
            {filtered.length} sites · {SITES.filter(s => s.crawlability === 'Crawlable').length} crawlable · {SITES.filter(s => s.crawlability === 'Restricted').length} restricted
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + Add Site
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sites..."
          style={{ flex: 1, minWidth: 160, maxWidth: 280, padding: '7px 12px', background: '#0d1425', border: '1px solid #1a2540', borderRadius: 5, color: '#e2e8f0', fontSize: 13, outline: 'none' }}
        />
        {(['sites-all', 'sites-crawlable', 'sites-restricted', 'sites-scam'] as const).map(f => (
          <button key={f} onClick={() => onNavigate(f)}
            style={{ padding: '7px 14px', background: filter === f ? 'rgba(59,130,246,0.15)' : 'none', border: `1px solid ${filter === f ? '#3b82f6' : '#1a2540'}`, borderRadius: 5, color: filter === f ? '#3b82f6' : '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
            {f === 'sites-all' ? 'All' : f === 'sites-crawlable' ? 'Crawlable' : f === 'sites-restricted' ? 'Restricted' : 'Scam'}
          </button>
        ))}
      </div>

      <div className="data-card table-wrap" style={{ borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
              {['Site', 'URL', 'Crawlability', 'Auth', 'Bot', 'Reputation', 'Jobs', 'Last Crawl', ''].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.name} className="tr-hover" style={{ borderBottom: i < filtered.length - 1 ? '1px solid #1a2540' : 'none', cursor: 'pointer' }} onClick={() => setSelectedSite(s)}>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.active ? '#06d6a0' : '#334155', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{s.url}</td>
                <td style={{ padding: '11px 14px' }}><CrawlabilityBadge val={s.crawlability} /></td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: s.auth === 'Required' ? '#f59e0b' : s.auth === 'None' ? '#06d6a0' : '#64748b' }}>{s.auth}</td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: s.botProtection === 'Detected' ? '#ef4444' : s.botProtection === 'Low' ? '#f59e0b' : '#06d6a0' }}>{s.botProtection}</td>
                <td style={{ padding: '11px 14px' }}><ReputationBadge val={s.reputation} /></td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{s.jobsTotal.toLocaleString()}</td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{s.lastCrawl}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 11, color: '#3b82f6' }}>View →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
