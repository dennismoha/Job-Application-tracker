import { useState } from 'react'

interface Job {
  id: number
  title: string
  company: string
  location: string
  remote: boolean
  employment: string
  salary?: string
  posted: string
  firstSeen: string
  lastFetched: string
  skills: string[]
  categories: string[]
  experience: string
  status: 'Active' | 'Expired' | 'Scam'
  appStatus: 'Not Applied' | 'Considering' | 'Applied' | 'Rejected' | 'Interviewing' | 'Assessment' | 'Offer' | 'Withdrawn'
  listings: { site: string; url: string; posted: string; firstSeen: string }[]
  visited: boolean
  favorite: boolean
  tags: string[]
  description: string
}

const JOBS: Job[] = [
  {
    id: 1,
    title: 'Senior Backend Engineer',
    company: 'Stripe',
    location: 'Remote',
    remote: true,
    employment: 'Full-time',
    salary: '$180k–$240k',
    posted: 'Sep 24, 2026',
    firstSeen: 'Sep 24, 2026',
    lastFetched: 'Sep 25, 2026 14:02',
    skills: ['Go', 'Python', 'PostgreSQL', 'Redis', 'gRPC', 'AWS'],
    categories: ['Backend Engineering', 'Infrastructure'],
    experience: 'Senior',
    status: 'Active',
    appStatus: 'Considering',
    listings: [
      { site: 'LinkedIn', url: 'linkedin.com/jobs/123', posted: 'Sep 24', firstSeen: 'Sep 24' },
      { site: 'Greenhouse ATS', url: 'boards.greenhouse.io/stripe/456', posted: 'Sep 23', firstSeen: 'Sep 24' },
      { site: 'Indeed', url: 'indeed.com/viewjob?jk=abc', posted: 'Sep 24', firstSeen: 'Sep 25' },
    ],
    visited: true,
    favorite: true,
    tags: ['High Priority', 'Remote', 'Great Company'],
    description: 'Stripe is looking for a Senior Backend Engineer to join our Payments Infrastructure team. You will design and build highly available, scalable payment processing systems that handle millions of transactions daily.\n\nYou will work on Stripe\'s core payment APIs, helping merchants accept and manage online payments. This is a high-impact role where you\'ll be designing systems that process billions of dollars.',
  },
  {
    id: 2,
    title: 'Staff Software Engineer',
    company: 'Vercel',
    location: 'San Francisco, CA',
    remote: true,
    employment: 'Full-time',
    salary: '$200k–$280k',
    posted: 'Sep 24, 2026',
    firstSeen: 'Sep 24, 2026',
    lastFetched: 'Sep 25, 2026 13:30',
    skills: ['TypeScript', 'Node.js', 'Next.js', 'Rust', 'Edge Computing'],
    categories: ['Software Engineering', 'Frontend Platform'],
    experience: 'Staff',
    status: 'Active',
    appStatus: 'Not Applied',
    listings: [
      { site: 'LinkedIn', url: 'linkedin.com/jobs/456', posted: 'Sep 24', firstSeen: 'Sep 24' },
      { site: 'Wellfound', url: 'wellfound.com/jobs/789', posted: 'Sep 23', firstSeen: 'Sep 24' },
    ],
    visited: false,
    favorite: false,
    tags: [],
    description: 'As a Staff Engineer at Vercel, you will lead technical direction for the Developer Experience team. You will architect and build the infrastructure that powers Next.js deployments across the globe.',
  },
  {
    id: 3,
    title: 'Platform Engineer',
    company: 'Cloudflare',
    location: 'Remote',
    remote: true,
    employment: 'Full-time',
    salary: '$160k–$220k',
    posted: 'Sep 23, 2026',
    firstSeen: 'Sep 23, 2026',
    lastFetched: 'Sep 25, 2026 12:00',
    skills: ['Rust', 'Go', 'Kubernetes', 'WASM', 'Distributed Systems'],
    categories: ['Platform Engineering', 'Infrastructure'],
    experience: 'Senior',
    status: 'Active',
    appStatus: 'Not Applied',
    listings: [
      { site: 'LinkedIn', url: 'linkedin.com/jobs/789', posted: 'Sep 23', firstSeen: 'Sep 23' },
      { site: 'Indeed', url: 'indeed.com/jobs/xxx', posted: 'Sep 22', firstSeen: 'Sep 23' },
      { site: 'Greenhouse ATS', url: 'boards.greenhouse.io/cloudflare/111', posted: 'Sep 22', firstSeen: 'Sep 24' },
      { site: 'Company Careers', url: 'cloudflare.com/careers/222', posted: 'Sep 22', firstSeen: 'Sep 23' },
    ],
    visited: true,
    favorite: true,
    tags: ['Interesting', 'Remote'],
    description: 'Cloudflare is building the future of the internet. As a Platform Engineer, you will work on the systems that power our global network of 300+ data centers.',
  },
  {
    id: 4,
    title: 'Senior DevOps Engineer',
    company: 'GitHub',
    location: 'Remote',
    remote: true,
    employment: 'Full-time',
    salary: '$170k–$230k',
    posted: 'Sep 23, 2026',
    firstSeen: 'Sep 23, 2026',
    lastFetched: 'Sep 25, 2026 11:00',
    skills: ['Kubernetes', 'Terraform', 'Python', 'Go', 'AWS', 'GCP'],
    categories: ['DevOps', 'Infrastructure'],
    experience: 'Senior',
    status: 'Active',
    appStatus: 'Not Applied',
    listings: [
      { site: 'LinkedIn', url: 'linkedin.com/jobs/901', posted: 'Sep 23', firstSeen: 'Sep 23' },
      { site: 'Indeed', url: 'indeed.com/jobs/yyy', posted: 'Sep 23', firstSeen: 'Sep 24' },
    ],
    visited: false,
    favorite: false,
    tags: [],
    description: 'Join GitHub\'s Infrastructure team and help build the systems that millions of developers depend on every day.',
  },
  {
    id: 5,
    title: 'Backend Engineer, Payments',
    company: 'Linear',
    location: 'Remote',
    remote: true,
    employment: 'Full-time',
    salary: '$140k–$200k',
    posted: 'Sep 22, 2026',
    firstSeen: 'Sep 23, 2026',
    lastFetched: 'Sep 25, 2026 10:00',
    skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis'],
    categories: ['Backend Engineering'],
    experience: 'Mid',
    status: 'Active',
    appStatus: 'Applied',
    listings: [
      { site: 'Wellfound', url: 'wellfound.com/jobs/linear-123', posted: 'Sep 22', firstSeen: 'Sep 23' },
    ],
    visited: true,
    favorite: false,
    tags: ['Applied'],
    description: 'Linear is looking for a Backend Engineer to join the product team.',
  },
]

function AppStatusBadge({ status }: { status: Job['appStatus'] }) {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    'Not Applied': { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.15)' },
    'Considering': { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
    'Applied': { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.15)' },
    'Rejected': { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' },
    'Interviewing': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.15)' },
    'Assessment': { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
    'Offer': { color: '#06d6a0', bg: 'rgba(6,214,160,0.08)', border: 'rgba(6,214,160,0.15)' },
    'Withdrawn': { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.15)' },
  }
  const s = map[status] || map['Not Applied']
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: `1px solid ${s.border}`, color: s.color, background: s.bg, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {status}
    </span>
  )
}

function JobDetailPanel({ job, onClose }: { job: Job; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'details' | 'listings' | 'analysis'>('details')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 100 }}>
      <div style={{ width: 560, height: '100%', background: '#0d1425', borderLeft: '1px solid #1a2540', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a2540', position: 'sticky', top: 0, background: '#0d1425', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 4, lineHeight: 1.2 }}>{job.title}</div>
              <div style={{ fontSize: 14, color: '#94a3b8' }}>{job.company}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <AppStatusBadge status={job.appStatus} />
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: '1px solid rgba(6,214,160,0.2)', color: '#06d6a0', background: 'rgba(6,214,160,0.08)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
              {job.status}
            </span>
            {job.favorite && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', fontFamily: 'JetBrains Mono, monospace' }}>★ Favorite</span>}
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['☆ Favorite', '⚑ Mark Applied', '⊕ Analyze CV', '⋯ More'].map(a => (
              <button key={a} style={{ padding: '4px 10px', background: 'none', border: '1px solid #1a2540', borderRadius: 4, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1a2540', padding: '0 24px' }}>
          {(['details', 'listings', 'analysis'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 0',
                marginRight: 24,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab ? '#3b82f6' : 'transparent'}`,
                color: activeTab === tab ? '#e2e8f0' : '#64748b',
                fontSize: 12,
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontWeight: activeTab === tab ? 500 : 400,
              }}
            >
              {tab === 'listings' ? `Listings (${job.listings.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {activeTab === 'details' && (
            <div>
              {/* Meta grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Location', value: job.location },
                  { label: 'Employment', value: job.employment },
                  { label: 'Salary', value: job.salary || 'Not disclosed' },
                  { label: 'Experience', value: job.experience },
                  { label: 'Posted', value: job.posted },
                  { label: 'First Seen', value: job.firstSeen },
                  { label: 'Last Fetched', value: job.lastFetched },
                  { label: 'Sites', value: `${job.listings.length} site${job.listings.length > 1 ? 's' : ''}` },
                ].map(m => (
                  <div key={m.label} style={{ background: '#111c35', borderRadius: 5, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {job.skills.map(s => (
                    <span key={s} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd', fontFamily: 'JetBrains Mono, monospace' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Categories</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {job.categories.map(c => (
                    <span key={c} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#c4b5fd', fontFamily: 'JetBrains Mono, monospace' }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {job.tags.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Tags</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {job.tags.map(t => (
                      <span key={t} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#111c35', border: '1px solid #1a2540', color: '#64748b' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Description</div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {job.description}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'listings' && (
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                Found on <strong style={{ color: '#e2e8f0' }}>{job.listings.length}</strong> site{job.listings.length > 1 ? 's' : ''}. Each listing is a separate occurrence of the same canonical job.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {job.listings.map((l, i) => (
                  <div key={i} style={{ background: '#111c35', borderRadius: 6, padding: '14px 16px', border: '1px solid #1a2540' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{l.site}</span>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: '1px solid rgba(6,214,160,0.2)', color: '#06d6a0', background: 'rgba(6,214,160,0.08)', fontFamily: 'JetBrains Mono, monospace' }}>Active</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>{l.url}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Posted</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{l.posted}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>First Seen</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{l.firstSeen}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                      <button style={{ padding: '4px 10px', background: 'none', border: '1px solid #1a2540', borderRadius: 4, color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>
                        Open →
                      </button>
                      <button style={{ padding: '4px 10px', background: 'none', border: '1px solid #1a2540', borderRadius: 4, color: '#64748b', fontSize: 11, cursor: 'pointer' }}>
                        Delete Listing
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div>
              <div style={{ background: '#111c35', borderRadius: 6, padding: '14px 16px', marginBottom: 16, border: '1px solid #1a2540' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', marginBottom: 10 }}>CV Match — Backend Engineering CV v4</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Overall fit</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#06d6a0', fontFamily: 'JetBrains Mono, monospace' }}>78%</span>
                  </div>
                  <div style={{ height: 4, background: '#1a2540', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: '78%', background: '#06d6a0', borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#06d6a0', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>Matching</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {['Python', 'PostgreSQL', 'AWS', 'Redis'].map(s => (
                        <span key={s} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.2)', color: '#06d6a0', fontFamily: 'JetBrains Mono, monospace' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#ef4444', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>Gap</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {['Go', 'gRPC'].map(s => (
                        <span key={s} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button style={{ width: '100%', padding: '10px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, color: '#3b82f6', fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>
                ⊕ Run Full CV Analysis
              </button>
              <button style={{ width: '100%', padding: '10px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 6, color: '#8b5cf6', fontSize: 13, cursor: 'pointer' }}>
                ✦ Generate Tailored CV
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Jobs({ filter }: { filter: string }) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [search, setSearch] = useState('')

  const filtered = JOBS.filter(j => {
    if (filter === 'jobs-favorites' && !j.favorite) return false
    if (filter === 'jobs-scam' && j.status !== 'Scam') return false
    if (filter === 'jobs-expired' && j.status !== 'Expired') return false
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.company.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const title = filter === 'jobs-new' ? 'New Jobs Today' : filter === 'jobs-favorites' ? 'Favorites' : filter === 'jobs-scam' ? 'Scam Jobs' : filter === 'jobs-expired' ? 'Expired Jobs' : 'All Jobs'

  return (
    <div style={{ padding: '28px 32px' }}>
      {selectedJob && <JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em' }}>{title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
            {filtered.length} jobs · {JOBS.filter(j => j.remote).length} remote · {JOBS.filter(j => j.listings.length > 1).length} multi-site
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '7px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
            ☑ Select All
          </button>
          <button style={{ padding: '7px 14px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 5, color: '#3b82f6', fontSize: 12, cursor: 'pointer' }}>
            ⊕ Batch CV Analysis
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search jobs, companies..."
          style={{ flex: 1, maxWidth: 320, padding: '7px 12px', background: '#0d1425', border: '1px solid #1a2540', borderRadius: 5, color: '#e2e8f0', fontSize: 13, outline: 'none' }}
        />
        {['All', 'Remote', 'Senior', 'Applied'].map(f => (
          <button key={f} style={{ padding: '7px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
            {f}
          </button>
        ))}
      </div>

      <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
              {['', 'Title', 'Company', 'Location', 'Salary', 'Skills', 'Sites', 'Posted', 'Status', 'Application'].map(h => (
                <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((j, i) => (
              <tr
                key={j.id}
                className="tr-hover"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid #1a2540' : 'none', cursor: 'pointer' }}
                onClick={() => setSelectedJob(j)}
              >
                <td style={{ padding: '10px 8px 10px 16px' }}>
                  <input type="checkbox" onClick={e => e.stopPropagation()} style={{ accentColor: '#3b82f6' }} />
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {j.favorite && <span style={{ color: '#f59e0b', fontSize: 11 }}>★</span>}
                    {!j.visited && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />}
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{j.title}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 16px', fontSize: 13, color: '#94a3b8' }}>{j.company}</td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>
                  {j.remote ? <span style={{ color: '#06d6a0', fontSize: 11 }}>Remote</span> : j.location}
                </td>
                <td style={{ padding: '10px 16px', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{j.salary || '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {j.skills.slice(0, 3).map(s => (
                      <span key={s} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#111c35', border: '1px solid #1a2540', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{s}</span>
                    ))}
                    {j.skills.length > 3 && <span style={{ fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>+{j.skills.length - 3}</span>}
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: 11, color: j.listings.length > 1 ? '#3b82f6' : '#475569', fontFamily: 'JetBrains Mono, monospace' }}>
                    {j.listings.length}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{j.posted.split(',')[0]}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: '1px solid rgba(6,214,160,0.2)', color: '#06d6a0', background: 'rgba(6,214,160,0.08)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                    {j.status}
                  </span>
                </td>
                <td style={{ padding: '10px 16px' }}><AppStatusBadge status={j.appStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
