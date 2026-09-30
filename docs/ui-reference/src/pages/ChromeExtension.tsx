import { useState, useEffect, useRef } from 'react'

type Screen =
  | 'login' | 'home' | 'detecting'
  | 'no-job' | 'new-job' | 'existing-job'
  | 'unknown-site' | 'site-analysis' | 'site-result'
  | 'review-job' | 'save-success'
  | 'cv-select' | 'cv-upload' | 'cv-analyzing' | 'cv-results' | 'cv-generate' | 'cv-preview'
  | 'application' | 'app-history' | 'rejected'
  | 'scam-confirm' | 'job-details' | 'settings' | 'error' | 'offline'

type NavTab = 'home' | 'jobs' | 'applications' | 'cv' | 'settings'

const T = {
  bg0: '#070b14', bg1: '#0d1425', bg2: '#111c35',
  bd: '#1a2540', bd2: '#243050',
  t0: '#e2e8f0', t1: '#94a3b8', t2: '#64748b', t3: '#475569', t4: '#334155',
  blue: '#3b82f6', green: '#06d6a0', amber: '#f59e0b', red: '#ef4444', purple: '#8b5cf6',
  mono: 'JetBrains Mono, monospace', sans: 'Inter, sans-serif',
}

const BACK: Partial<Record<Screen, Screen>> = {
  'new-job': 'home', 'existing-job': 'home', 'no-job': 'home', 'unknown-site': 'no-job',
  'site-result': 'home', 'review-job': 'new-job', 'save-success': 'home',
  'cv-select': 'existing-job', 'cv-upload': 'cv-select', 'cv-analyzing': 'cv-select',
  'cv-results': 'cv-select', 'cv-generate': 'cv-results', 'cv-preview': 'cv-generate',
  'application': 'existing-job', 'app-history': 'existing-job',
  'rejected': 'home', 'scam-confirm': 'existing-job', 'job-details': 'existing-job',
  'settings': 'home', 'error': 'home', 'offline': 'home', 'site-analysis': 'no-job',
}

const TITLES: Partial<Record<Screen, string>> = {
  'login': '', 'home': '', 'detecting': 'Detecting…',
  'no-job': 'No Job Found', 'new-job': 'New Job', 'existing-job': 'Job Found',
  'unknown-site': 'Unknown Site', 'site-analysis': 'Analyzing Site', 'site-result': 'Site Registered',
  'review-job': 'Review & Save', 'save-success': 'Saved',
  'cv-select': 'CV Match', 'cv-upload': 'Upload CV', 'cv-analyzing': 'Analyzing CV',
  'cv-results': 'CV Results', 'cv-generate': 'Generate CV', 'cv-preview': 'CV Preview',
  'application': 'Application', 'app-history': 'History', 'rejected': 'Rejected',
  'scam-confirm': 'Flag Scam', 'job-details': 'Job Details', 'settings': 'Settings',
  'error': 'Error', 'offline': 'Offline',
}

const NO_NAV: Screen[] = ['login', 'detecting', 'site-analysis', 'cv-analyzing']

/* ─────────── primitives ─────────── */

function Btn({ children, variant = 'ghost', full, onClick, small, icon }: {
  children: React.ReactNode; variant?: 'primary' | 'blue' | 'ghost' | 'danger' | 'green' | 'purple'
  full?: boolean; onClick?: () => void; small?: boolean; icon?: string
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: T.blue, border: 'none', color: '#fff' },
    blue: { background: 'rgba(59,130,246,0.12)', border: `1px solid rgba(59,130,246,0.3)`, color: T.blue },
    ghost: { background: 'none', border: `1px solid ${T.bd}`, color: T.t2 },
    danger: { background: 'rgba(239,68,68,0.12)', border: `1px solid rgba(239,68,68,0.3)`, color: T.red },
    green: { background: 'rgba(6,214,160,0.12)', border: `1px solid rgba(6,214,160,0.3)`, color: T.green },
    purple: { background: 'rgba(139,92,246,0.12)', border: `1px solid rgba(139,92,246,0.3)`, color: T.purple },
  }
  return (
    <button onClick={onClick} style={{
      width: full ? '100%' : undefined,
      padding: small ? '4px 10px' : '7px 12px',
      borderRadius: 5, cursor: 'pointer', fontSize: small ? 10 : 12,
      fontFamily: T.sans, fontWeight: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      transition: 'opacity 0.12s',
      ...styles[variant],
    }}>
      {icon && <span style={{ fontSize: small ? 9 : 11 }}>{icon}</span>}
      {children}
    </button>
  )
}

function Chip({ color, bg, border, children }: { color: string; bg: string; border: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9, padding: '2px 6px', borderRadius: 3,
      border: `1px solid ${border}`, color, background: bg,
      fontFamily: T.mono, letterSpacing: '0.04em',
    }}>{children}</span>
  )
}

function Spin() {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%',
      border: `2px solid ${T.bd}`, borderTopColor: T.blue,
      animation: 'ext-spin 0.8s linear infinite',
    }} />
  )
}

function Bar({ pct, color = T.green, h = 3 }: { pct: number; color?: string; h?: number }) {
  return (
    <div style={{ height: h, background: T.bd, borderRadius: h }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: h, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, color: T.t3, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{children}</div>
}

function Inp({ placeholder, value, onChange, type = 'text' }: { placeholder?: string; value?: string; onChange?: (v: string) => void; type?: string }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      style={{
        width: '100%', padding: '7px 10px', background: T.bg2, border: `1px solid ${T.bd}`,
        borderRadius: 4, color: T.t0, fontSize: 12, outline: 'none',
        fontFamily: T.sans, boxSizing: 'border-box',
      }}
    />
  )
}

function Tog({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{
      width: 28, height: 16, borderRadius: 8, background: on ? T.green : T.bd,
      position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 14 : 2, width: 12, height: 12,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
      }} />
    </div>
  )
}

function Hr() {
  return <div style={{ height: 1, background: T.bd, margin: '0' }} />
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
      <div style={{ width: 52, fontSize: 9, color: T.t3, fontFamily: T.mono, textTransform: 'uppercase', paddingTop: 2, flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 12, color: T.t1 }}>{value}</div>
    </div>
  )
}

/* ─────────── toast overlay ─────────── */

function ExtToast({ msg, type, onDone }: { msg: string; type: 'success' | 'error' | 'info'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t) }, [onDone])
  const c = type === 'success' ? T.green : type === 'error' ? T.red : T.blue
  return (
    <div style={{
      position: 'absolute', top: 42, left: 8, right: 8, zIndex: 10,
      background: T.bg2, border: `1px solid ${c}44`, borderRadius: 5,
      padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6,
      animation: 'ext-fadein 0.15s ease',
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: T.t0 }}>{msg}</span>
    </div>
  )
}

/* ─────────── job header ─────────── */

function JobHead({ title, company, location, site, status }: { title: string; company: string; location: string; site?: string; status?: string }) {
  const statusColors: Record<string, { c: string; bg: string; bd: string }> = {
    'New': { c: T.green, bg: 'rgba(6,214,160,0.1)', bd: 'rgba(6,214,160,0.25)' },
    'Applied': { c: T.blue, bg: 'rgba(59,130,246,0.1)', bd: 'rgba(59,130,246,0.25)' },
    'Considering': { c: T.amber, bg: 'rgba(245,158,11,0.1)', bd: 'rgba(245,158,11,0.25)' },
    'Rejected': { c: T.red, bg: 'rgba(239,68,68,0.1)', bd: 'rgba(239,68,68,0.25)' },
    'Interviewing': { c: T.purple, bg: 'rgba(139,92,246,0.1)', bd: 'rgba(139,92,246,0.25)' },
  }
  const sc = status ? statusColors[status] : null
  return (
    <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${T.bd}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 7 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 6, background: 'linear-gradient(135deg, #1e40af, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>{company[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.t0, lineHeight: 1.2, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          <div style={{ fontSize: 11, color: T.t2 }}>{company} · {location}</div>
        </div>
        {sc && <Chip color={sc.c} bg={sc.bg} border={sc.bd}>{status}</Chip>}
      </div>
      {site && <div style={{ fontSize: 10, color: T.t4, fontFamily: T.mono }}>{site}</div>}
    </div>
  )
}

/* ─────────── screens ─────────── */

function SLogin({ go }: { go: (s: Screen) => void }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  return (
    <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #06d6a0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 16, fontWeight: 700, color: T.bg0, fontFamily: T.mono }}>J</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.t0 }}>Sign in to JobIntel</div>
        <div style={{ fontSize: 11, color: T.t2, marginTop: 3 }}>Extension v1.4.2</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div><Lbl>Email</Lbl><Inp placeholder="you@company.com" value={email} onChange={setEmail} /></div>
        <div><Lbl>Password</Lbl><Inp placeholder="••••••••" type="password" value={pass} onChange={setPass} /></div>
      </div>
      <Btn variant="primary" full onClick={() => go('home')}>Sign In</Btn>
      <div style={{ textAlign: 'center', fontSize: 11, color: T.t3 }}>
        <span style={{ color: T.blue, cursor: 'pointer' }}>Forgot password?</span>
      </div>
    </div>
  )
}

function SHome({ go }: { go: (s: Screen, tab?: NavTab) => void }) {
  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 12, color: T.t1, marginBottom: 14 }}>
        <span style={{ color: T.t0, fontWeight: 500 }}>Good morning, Alex</span> — on <span style={{ color: T.green, fontFamily: T.mono }}>greenhouse.io</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
        {[
          { label: 'Jobs Tracked', val: '12,481', color: T.blue },
          { label: 'Applied', val: '42', color: T.green },
          { label: 'Interviews', val: '8', color: T.purple },
          { label: 'CV Match', val: '78%', color: T.amber },
        ].map(stat => (
          <div key={stat.label} style={{ background: T.bg2, border: `1px solid ${T.bd}`, borderRadius: 6, padding: '8px 10px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: stat.color, fontFamily: T.mono, marginBottom: 2 }}>{stat.val}</div>
            <div style={{ fontSize: 10, color: T.t2 }}>{stat.label}</div>
          </div>
        ))}
      </div>
      <Lbl>Recent Activity</Lbl>
      {[
        { label: 'Stripe · Backend Engineer', time: '2h ago', dot: T.green },
        { label: 'Vercel · Staff Eng', time: '1d ago', dot: T.blue },
        { label: 'Linear · PM Role', time: '3d ago', dot: T.t4 },
      ].map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${T.bd}` }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: a.dot, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 11, color: T.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</div>
          <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono, flexShrink: 0 }}>{a.time}</div>
        </div>
      ))}
      <div style={{ marginTop: 12 }}>
        <Btn variant="blue" full onClick={() => go('detecting')} icon="⟳">Check Current Page</Btn>
      </div>
    </div>
  )
}

function SDetecting({ go }: { go: (s: Screen) => void }) {
  const steps = ['Detecting page type…', 'Querying platform API…', 'Matching job URL…', 'Job found in platform']
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (step >= steps.length - 1) { setTimeout(() => go('existing-job'), 600); return }
    const t = setTimeout(() => setStep(s => s + 1), 700)
    return () => clearTimeout(t)
  }, [step])
  return (
    <div style={{ padding: '28px 18px', textAlign: 'center' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
        {step < steps.length - 1 ? <Spin /> : <div style={{ fontSize: 20, color: T.green }}>✓</div>}
      </div>
      <div style={{ fontSize: 12, color: T.t0, marginBottom: 4, fontWeight: 500 }}>{steps[step]}</div>
      <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono, marginBottom: 20 }}>greenhouse.io/stripe/jobs/123456</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {steps.slice(0, step + 1).map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: i === step ? T.t1 : T.t4 }}>
            <span style={{ color: i < step ? T.green : i === step ? T.blue : T.t4 }}>{i < step ? '✓' : i === step ? '→' : '·'}</span>
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}

function SNoJob({ go }: { go: (s: Screen) => void }) {
  return (
    <div>
      <div style={{ padding: '12px 14px', background: T.bg0, borderBottom: `1px solid ${T.bd}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.amber }} />
          <span style={{ fontSize: 11, color: T.amber, fontFamily: T.mono }}>No job detected</span>
        </div>
        <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono }}>jobs.stripe.com/jobs/7891234</div>
      </div>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.5, marginBottom: 12 }}>
          This page doesn't match a known job URL pattern. You can still add it manually or register the site.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Btn variant="primary" full onClick={() => go('new-job')} icon="＋">Add Job Manually</Btn>
          <Btn variant="ghost" full onClick={() => go('unknown-site')} icon="◇">Register This Site</Btn>
        </div>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <Lbl>Quick Actions</Lbl>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="blue" onClick={() => go('site-analysis')} icon="▦">Analyze Site</Btn>
          <Btn variant="ghost" onClick={() => go('home')}>Home</Btn>
        </div>
      </div>
    </div>
  )
}

function SNewJob({ go }: { go: (s: Screen) => void }) {
  const [title, setTitle] = useState('Staff Engineer, Infrastructure')
  const [company, setCompany] = useState('Stripe')
  const [location, setLocation] = useState('Remote (US)')
  return (
    <div>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.amber }} />
          <span style={{ fontSize: 10, color: T.amber, fontFamily: T.mono }}>Extracted from page</span>
        </div>
      </div>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.bd}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div><Lbl>Job Title</Lbl><Inp value={title} onChange={setTitle} /></div>
        <div><Lbl>Company</Lbl><Inp value={company} onChange={setCompany} /></div>
        <div><Lbl>Location</Lbl><Inp value={location} onChange={setLocation} /></div>
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Btn variant="primary" full onClick={() => go('review-job')} icon="→">Review & Save</Btn>
        <Btn variant="ghost" full onClick={() => go('home')}>Cancel</Btn>
      </div>
    </div>
  )
}

function SExistingJob({ go, toast }: { go: (s: Screen) => void; toast: (m: string, t: 'success' | 'error' | 'info') => void }) {
  const [status, setStatus] = useState('Applied')
  const [menuOpen, setMenuOpen] = useState(false)
  const statuses = ['Considering', 'Applied', 'Assessment', 'Interviewing', 'Offer', 'Rejected']
  const sc: Record<string, { c: string; bg: string; bd: string }> = {
    'Considering': { c: T.amber, bg: 'rgba(245,158,11,0.1)', bd: 'rgba(245,158,11,0.25)' },
    'Applied': { c: T.blue, bg: 'rgba(59,130,246,0.1)', bd: 'rgba(59,130,246,0.25)' },
    'Assessment': { c: T.purple, bg: 'rgba(139,92,246,0.1)', bd: 'rgba(139,92,246,0.25)' },
    'Interviewing': { c: T.purple, bg: 'rgba(139,92,246,0.1)', bd: 'rgba(139,92,246,0.25)' },
    'Offer': { c: T.green, bg: 'rgba(6,214,160,0.1)', bd: 'rgba(6,214,160,0.25)' },
    'Rejected': { c: T.red, bg: 'rgba(239,68,68,0.1)', bd: 'rgba(239,68,68,0.25)' },
  }
  return (
    <div>
      <JobHead title="Senior Backend Engineer" company="Stripe" location="Remote" site="greenhouse.io/stripe/jobs/123456" status={status} />
      <div style={{ padding: '10px 14px', background: T.bg0, borderBottom: `1px solid ${T.bd}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontSize: 9, color: T.t3, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>CV Match · Backend CV v4</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.green, fontFamily: T.mono }}>78%</span>
        </div>
        <Bar pct={78} />
        <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['Python', 'PostgreSQL', 'AWS', 'Kafka'].map(s => <Chip key={s} color={T.green} bg="rgba(6,214,160,0.08)" border="rgba(6,214,160,0.2)">{s}</Chip>)}
          {['Go', 'gRPC'].map(s => <Chip key={s} color={T.red} bg="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.2)">{s} ✗</Chip>)}
        </div>
      </div>
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Status</Lbl>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {statuses.map(s => {
            const col = sc[s]
            return (
              <button key={s} onClick={() => { setStatus(s); toast(`Status → ${s}`, 'success') }} style={{
                padding: '2px 7px', borderRadius: 3, cursor: 'pointer', fontSize: 10,
                fontFamily: T.mono, background: status === s ? col.bg : 'none',
                border: `1px solid ${status === s ? col.bd : T.bd}`, color: status === s ? col.c : T.t3,
              }}>{s}</button>
            )
          })}
        </div>
      </div>
      <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="purple" full onClick={() => go('cv-select')} icon="▤">CV Match</Btn>
          <Btn variant="blue" full onClick={() => go('job-details')} icon="◈">Details</Btn>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="ghost" full onClick={() => go('application')} icon="◉">Application</Btn>
          <div style={{ position: 'relative' }}>
            <Btn variant="ghost" onClick={() => setMenuOpen(v => !v)} icon="⋮">More</Btn>
            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, bottom: '100%', marginBottom: 4, background: T.bg1, border: `1px solid ${T.bd}`, borderRadius: 5, overflow: 'hidden', zIndex: 20, minWidth: 140 }}>
                {[
                  { label: '🚩 Flag Scam', action: () => { setMenuOpen(false); go('scam-confirm') } },
                  { label: '✕ Reject', action: () => { setMenuOpen(false); go('rejected') } },
                  { label: '↗ Open in Platform', action: () => { setMenuOpen(false); toast('Opening platform…', 'info') } },
                ].map(item => (
                  <div key={item.label} onClick={item.action} style={{ padding: '8px 12px', fontSize: 11, color: T.t1, cursor: 'pointer', borderBottom: `1px solid ${T.bd}` }}>
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SUnknownSite({ go }: { go: (s: Screen) => void }) {
  return (
    <div>
      <div style={{ padding: '12px 14px', background: T.bg0, borderBottom: `1px solid ${T.bd}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.purple }} />
          <span style={{ fontSize: 11, color: T.purple, fontFamily: T.mono }}>Unknown site</span>
        </div>
        <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono }}>jobs.newboard.io/companies/acme</div>
      </div>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.5, marginBottom: 10 }}>
          This site isn't registered. Add it to enable crawling and automatic job detection.
        </div>
        <Row label="Site" value="newboard.io" />
        <Row label="Job" value="Backend Engineer" />
        <Row label="Company" value="Acme Corp" />
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Btn variant="primary" full onClick={() => go('site-analysis')} icon="◇">Register Site & Add Job</Btn>
        <Btn variant="ghost" full onClick={() => go('new-job')} icon="＋">Add Job Only</Btn>
        <Btn variant="ghost" full onClick={() => go('no-job')}>Dismiss</Btn>
      </div>
    </div>
  )
}

function SSiteAnalysis({ go }: { go: (s: Screen) => void }) {
  const steps = ['Fetching robots.txt…', 'Detecting ATS platform…', 'Testing crawl paths…', 'Analyzing rate limits…', 'Registration complete']
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (step >= steps.length - 1) { setTimeout(() => go('site-result'), 600); return }
    const t = setTimeout(() => setStep(s => s + 1), 800)
    return () => clearTimeout(t)
  }, [step])
  const pct = Math.round((step / (steps.length - 1)) * 100)
  return (
    <div style={{ padding: '28px 18px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        {step < steps.length - 1 ? <div style={{ display: 'flex', justifyContent: 'center' }}><Spin /></div>
          : <div style={{ fontSize: 22, color: T.green }}>✓</div>}
        <div style={{ fontSize: 12, color: T.t0, fontWeight: 500, marginTop: 10, marginBottom: 3 }}>{steps[step]}</div>
        <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono }}>newboard.io</div>
      </div>
      <Bar pct={pct} h={4} />
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {steps.slice(0, step + 1).map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, color: i === step ? T.t1 : T.t4 }}>
            <span style={{ color: i < step ? T.green : T.blue }}>{i < step ? '✓' : '→'}</span>{s}
          </div>
        ))}
      </div>
    </div>
  )
}

function SSiteResult({ go, toast }: { go: (s: Screen) => void; toast: (m: string, t: 'success' | 'error' | 'info') => void }) {
  return (
    <div>
      <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${T.bd}`, textAlign: 'center' }}>
        <div style={{ fontSize: 20, color: T.green, marginBottom: 6 }}>✓</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.t0, marginBottom: 2 }}>Site Registered</div>
        <div style={{ fontSize: 11, color: T.t2 }}>newboard.io · Custom ATS</div>
      </div>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.bd}` }}>
        {[
          { label: 'Crawlable', val: 'Yes', c: T.green },
          { label: 'Rate limit', val: '30 req/min', c: T.t1 },
          { label: 'Platform', val: 'Custom ATS', c: T.t1 },
          { label: 'Jobs found', val: '247', c: T.blue },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: T.t2 }}>{r.label}</span>
            <span style={{ fontSize: 11, color: r.c, fontFamily: T.mono }}>{r.val}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Btn variant="green" full onClick={() => { toast('Crawl scheduled', 'success'); go('home') }} icon="⟳">Schedule Crawl</Btn>
        <Btn variant="ghost" full onClick={() => go('home')}>Done</Btn>
      </div>
    </div>
  )
}

function SReviewJob({ go, toast }: { go: (s: Screen) => void; toast: (m: string, t: 'success' | 'error' | 'info') => void }) {
  return (
    <div>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Extracted Data</Lbl>
        <Row label="Title" value="Staff Engineer, Infra" />
        <Row label="Company" value="Stripe" />
        <Row label="Location" value="Remote (US)" />
        <Row label="Salary" value="$220k–$280k" />
        <Row label="Type" value="Full-time" />
        <Row label="Source" value="greenhouse.io" />
      </div>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Tags</Lbl>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['Python', 'Kubernetes', 'Go', 'PostgreSQL', 'Distributed Systems'].map(t => (
            <Chip key={t} color={T.blue} bg="rgba(59,130,246,0.08)" border="rgba(59,130,246,0.2)">{t}</Chip>
          ))}
        </div>
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Btn variant="primary" full onClick={() => { toast('Job saved ✓', 'success'); go('save-success') }} icon="✓">Save to Platform</Btn>
        <Btn variant="ghost" full onClick={() => go('new-job')} icon="‹">Edit Details</Btn>
      </div>
    </div>
  )
}

function SSaveSuccess({ go }: { go: (s: Screen) => void }) {
  return (
    <div style={{ padding: '28px 18px', textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(6,214,160,0.12)', border: `2px solid ${T.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 18, color: T.green }}>✓</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.t0, marginBottom: 4 }}>Job saved to platform</div>
      <div style={{ fontSize: 11, color: T.t2, marginBottom: 4 }}>Staff Engineer, Infra · Stripe</div>
      <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono, marginBottom: 20 }}>Source: Chrome Extension · just now</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn variant="blue" full onClick={() => go('existing-job')} icon="→">View Job</Btn>
        <Btn variant="ghost" full onClick={() => go('home')}>Done</Btn>
      </div>
    </div>
  )
}

function SCVSelect({ go }: { go: (s: Screen) => void }) {
  const cvs = [
    { name: 'Backend CV v4', match: 78, updated: '2d ago' },
    { name: 'Fullstack CV v2', match: 61, updated: '1w ago' },
    { name: 'Engineering Lead', match: 54, updated: '3w ago' },
  ]
  return (
    <div>
      <div style={{ padding: '10px 14px 6px', borderBottom: `1px solid ${T.bd}` }}>
        <div style={{ fontSize: 12, color: T.t2, marginBottom: 8 }}>Select a CV to match against this job</div>
      </div>
      <div style={{ padding: '6px 0' }}>
        {cvs.map(cv => (
          <div key={cv.name} onClick={() => go('cv-results')} style={{ padding: '10px 14px', borderBottom: `1px solid ${T.bd}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 32, background: T.bg2, border: `1px solid ${T.bd}`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>▤</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: T.t0, marginBottom: 2 }}>{cv.name}</div>
              <Bar pct={cv.match} color={cv.match > 70 ? T.green : cv.match > 55 ? T.amber : T.red} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: cv.match > 70 ? T.green : cv.match > 55 ? T.amber : T.red, fontFamily: T.mono, flexShrink: 0 }}>{cv.match}%</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 14px' }}>
        <Btn variant="ghost" full onClick={() => go('cv-upload')} icon="↑">Upload New CV</Btn>
      </div>
    </div>
  )
}

function SCVUpload({ go, toast }: { go: (s: Screen) => void; toast: (m: string, t: 'success' | 'error' | 'info') => void }) {
  const [drag, setDrag] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pct, setPct] = useState(0)
  function startUpload() {
    setUploading(true)
    let p = 0
    const iv = setInterval(() => { p += 12; setPct(p); if (p >= 100) { clearInterval(iv); setTimeout(() => go('cv-analyzing'), 400) } }, 200)
  }
  return (
    <div style={{ padding: '14px' }}>
      {uploading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 12, color: T.t1, marginBottom: 10 }}>Uploading…</div>
          <Bar pct={pct} h={4} color={T.blue} />
          <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono, marginTop: 6 }}>{pct}%</div>
        </div>
      ) : (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); startUpload() }}
            onClick={startUpload}
            style={{
              border: `2px dashed ${drag ? T.blue : T.bd}`, borderRadius: 6,
              padding: '28px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 10,
              background: drag ? 'rgba(59,130,246,0.05)' : 'transparent',
            }}
          >
            <div style={{ fontSize: 22, opacity: 0.4, marginBottom: 8 }}>↑</div>
            <div style={{ fontSize: 12, color: T.t2, marginBottom: 3 }}>Drop PDF or DOCX here</div>
            <div style={{ fontSize: 10, color: T.t3 }}>or click to select</div>
          </div>
          <Btn variant="ghost" full onClick={() => go('cv-select')}>Cancel</Btn>
        </>
      )}
    </div>
  )
}

function SCVAnalyzing({ go }: { go: (s: Screen) => void }) {
  const steps = ['Parsing document…', 'Extracting skills…', 'Matching requirements…', 'Scoring gaps…', 'Analysis complete']
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (step >= steps.length - 1) { setTimeout(() => go('cv-results'), 600); return }
    const t = setTimeout(() => setStep(s => s + 1), 750)
    return () => clearTimeout(t)
  }, [step])
  return (
    <div style={{ padding: '28px 18px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        {step < steps.length - 1 ? <Spin /> : <div style={{ fontSize: 22, color: T.green }}>✓</div>}
      </div>
      <div style={{ fontSize: 12, color: T.t0, fontWeight: 500, marginBottom: 3 }}>{steps[step]}</div>
      <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono, marginBottom: 18 }}>Backend CV v4.pdf</div>
      <Bar pct={Math.round((step / (steps.length - 1)) * 100)} h={3} />
    </div>
  )
}

function SCVResults({ go }: { go: (s: Screen) => void }) {
  return (
    <div>
      <div style={{ padding: '10px 14px', background: T.bg0, borderBottom: `1px solid ${T.bd}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: T.t1 }}>Backend CV v4 · match score</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: T.green, fontFamily: T.mono }}>78%</span>
        </div>
        <Bar pct={78} h={5} />
      </div>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Matched Skills</Lbl>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {['Python', 'PostgreSQL', 'AWS', 'Kafka', 'Docker', 'Kubernetes'].map(s => (
            <Chip key={s} color={T.green} bg="rgba(6,214,160,0.08)" border="rgba(6,214,160,0.2)">{s}</Chip>
          ))}
        </div>
        <Lbl>Missing Skills</Lbl>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['Go', 'gRPC', 'Rust'].map(s => (
            <Chip key={s} color={T.red} bg="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.2)">{s} ✗</Chip>
          ))}
        </div>
      </div>
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Gap Analysis</Lbl>
        {[
          { label: 'Technical Match', pct: 82, c: T.green },
          { label: 'Experience Level', pct: 90, c: T.green },
          { label: 'Domain Fit', pct: 71, c: T.amber },
          { label: 'Keywords', pct: 65, c: T.amber },
        ].map(r => (
          <div key={r.label} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 10, color: T.t2 }}>{r.label}</span>
              <span style={{ fontSize: 10, color: r.c, fontFamily: T.mono }}>{r.pct}%</span>
            </div>
            <Bar pct={r.pct} color={r.c} h={2} />
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 14px', display: 'flex', gap: 6 }}>
        <Btn variant="purple" full onClick={() => go('cv-generate')} icon="✦">Generate Tailored</Btn>
        <Btn variant="ghost" full onClick={() => go('existing-job')}>Done</Btn>
      </div>
    </div>
  )
}

function SCVGenerate({ go }: { go: (s: Screen) => void }) {
  const [tone, setTone] = useState<'professional' | 'casual' | 'technical'>('professional')
  const [incCover, setIncCover] = useState(true)
  const [emphasis, setEmphasis] = useState<string[]>(['Backend', 'Cloud'])
  return (
    <div>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Tone</Lbl>
        <div style={{ display: 'flex', gap: 5 }}>
          {(['professional', 'casual', 'technical'] as const).map(t => (
            <button key={t} onClick={() => setTone(t)} style={{
              padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11,
              background: tone === t ? 'rgba(59,130,246,0.15)' : 'none',
              border: `1px solid ${tone === t ? T.blue : T.bd}`,
              color: tone === t ? T.blue : T.t3, fontFamily: T.sans,
            }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Emphasis</Lbl>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['Backend', 'Cloud', 'Leadership', 'Scale', 'Security'].map(e => (
            <button key={e} onClick={() => setEmphasis(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])} style={{
              padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontSize: 10, fontFamily: T.mono,
              background: emphasis.includes(e) ? 'rgba(139,92,246,0.12)' : 'none',
              border: `1px solid ${emphasis.includes(e) ? T.purple : T.bd}`,
              color: emphasis.includes(e) ? T.purple : T.t3,
            }}>{e}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.bd}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: T.t1 }}>Include Cover Letter</span>
        <Tog on={incCover} onToggle={() => setIncCover(v => !v)} />
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Btn variant="purple" full onClick={() => go('cv-preview')} icon="✦">Generate Now</Btn>
        <Btn variant="ghost" full onClick={() => go('cv-results')}>Back to Results</Btn>
      </div>
    </div>
  )
}

function SCVPreview({ go, toast }: { go: (s: Screen) => void; toast: (m: string, t: 'success' | 'error' | 'info') => void }) {
  return (
    <div>
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${T.bd}`, display: 'flex', gap: 6 }}>
        <Btn variant="green" onClick={() => toast('Downloaded ✓', 'success')} icon="↓">Download PDF</Btn>
        <Btn variant="blue" onClick={() => toast('Copied to clipboard', 'info')} icon="⊕">Copy Link</Btn>
      </div>
      {/* CV document mock */}
      <div style={{ margin: '10px 14px', background: '#fff', borderRadius: 4, padding: '12px 14px', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: '2px solid #1e40af' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Alex Kim</div>
            <div style={{ fontSize: 9, color: '#475569' }}>Senior Backend Engineer · alex@example.com</div>
          </div>
        </div>
        {['Summary', 'Experience', 'Skills', 'Education'].map(section => (
          <div key={section} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{section}</div>
            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, marginBottom: 3, width: '95%' }} />
            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, marginBottom: 3, width: '80%' }} />
            {section === 'Experience' && <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, width: '88%' }} />}
          </div>
        ))}
        <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>Tailored for Stripe · Senior Backend Engineer</div>
      </div>
      <div style={{ padding: '0 14px 10px' }}>
        <Btn variant="ghost" full onClick={() => go('cv-generate')}>Regenerate</Btn>
      </div>
    </div>
  )
}

function SApplication({ go, toast }: { go: (s: Screen) => void; toast: (m: string, t: 'success' | 'error' | 'info') => void }) {
  const [note, setNote] = useState('')
  return (
    <div>
      <div style={{ padding: '10px 14px', background: T.bg0, borderBottom: `1px solid ${T.bd}` }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip color={T.blue} bg="rgba(59,130,246,0.1)" border="rgba(59,130,246,0.25)">Applied</Chip>
          <Chip color={T.t3} bg="rgba(100,116,139,0.08)" border="rgba(100,116,139,0.15)">Sep 10, 2026</Chip>
          <Chip color={T.t3} bg="rgba(100,116,139,0.08)" border="rgba(100,116,139,0.15)">Greenhouse ATS</Chip>
        </div>
      </div>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Timeline</Lbl>
        {[
          { event: 'Applied', date: 'Sep 10', c: T.blue },
          { event: 'Recruiter viewed', date: 'Sep 12', c: T.t2 },
          { event: 'Assessment sent', date: 'Sep 14', c: T.amber },
        ].map(ev => (
          <div key={ev.event} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: ev.c, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: T.t1, flex: 1 }}>{ev.event}</span>
            <span style={{ fontSize: 10, color: T.t3, fontFamily: T.mono }}>{ev.date}</span>
          </div>
        ))}
        <Btn variant="ghost" small onClick={() => go('app-history')} icon="→">Full History</Btn>
      </div>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Notes</Lbl>
        <textarea
          value={note} onChange={e => setNote(e.target.value)}
          placeholder="Recruiter: Sarah J. · Deadline: Sep 30"
          rows={3}
          style={{ width: '100%', padding: '7px 9px', background: T.bg2, border: `1px solid ${T.bd}`, borderRadius: 4, color: T.t0, fontSize: 11, resize: 'none', outline: 'none', fontFamily: T.sans, boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ padding: '8px 14px' }}>
        <Btn variant="green" full onClick={() => toast('Notes saved', 'success')} icon="✓">Save Notes</Btn>
      </div>
    </div>
  )
}

function SAppHistory({ go }: { go: (s: Screen) => void }) {
  const events = [
    { event: 'Applied via Greenhouse', date: 'Sep 10, 2026', c: T.blue },
    { event: 'Recruiter viewed profile', date: 'Sep 12, 2026', c: T.t2 },
    { event: 'Technical assessment sent', date: 'Sep 14, 2026', c: T.amber },
    { event: 'Assessment completed', date: 'Sep 16, 2026', c: T.amber },
    { event: '1st interview scheduled', date: 'Sep 20, 2026', c: T.purple },
    { event: '1st interview completed', date: 'Sep 22, 2026', c: T.purple },
    { event: '2nd interview pending', date: 'Sep 30, 2026', c: T.t3 },
  ]
  return (
    <div style={{ padding: '10px 14px' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 5, top: 0, bottom: 0, width: 1, background: T.bd }} />
        {events.map((ev, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, paddingLeft: 18, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 2, top: 5, width: 7, height: 7, borderRadius: '50%', background: ev.c, border: `1px solid ${T.bg0}` }} />
            <div>
              <div style={{ fontSize: 11, color: T.t0, marginBottom: 1 }}>{ev.event}</div>
              <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono }}>{ev.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SRejected({ go, toast }: { go: (s: Screen) => void; toast: (m: string, t: 'success' | 'error' | 'info') => void }) {
  return (
    <div style={{ padding: '20px 18px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 10 }}>✕</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.red, marginBottom: 4 }}>Not Moving Forward</div>
      <div style={{ fontSize: 11, color: T.t2, marginBottom: 16, lineHeight: 1.5 }}>
        Stripe · Senior Backend Engineer has been marked as rejected. You can archive or keep tracking for reference.
      </div>
      <div style={{ background: T.bg2, border: `1px solid ${T.bd}`, borderRadius: 6, padding: '10px 12px', textAlign: 'left', marginBottom: 14 }}>
        <Lbl>Rejection Reason</Lbl>
        <select style={{ width: '100%', background: 'none', border: 'none', color: T.t1, fontSize: 12, outline: 'none', cursor: 'pointer' }}>
          <option>No reason given</option>
          <option>Overqualified</option>
          <option>Chose another candidate</option>
          <option>Role cancelled</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Btn variant="ghost" full onClick={() => { toast('Job archived', 'info'); go('home') }} icon="◻">Archive Job</Btn>
        <Btn variant="danger" full onClick={() => { toast('Marked rejected', 'error'); go('home') }} icon="✕">Confirm Rejected</Btn>
      </div>
    </div>
  )
}

function SScamConfirm({ go, toast }: { go: (s: Screen) => void; toast: (m: string, t: 'success' | 'error' | 'info') => void }) {
  const [reason, setReason] = useState('Suspicious contact methods')
  return (
    <div style={{ padding: '14px 18px' }}>
      <div style={{ background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: T.red, fontWeight: 600, marginBottom: 3 }}>🚩 Flag as Scam</div>
        <div style={{ fontSize: 11, color: T.t2, lineHeight: 1.5 }}>This will flag the job and optionally report the site. Your report helps the community.</div>
      </div>
      <Lbl>Reason</Lbl>
      <select
        value={reason} onChange={e => setReason(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', background: T.bg2, border: `1px solid ${T.bd}`, borderRadius: 4, color: T.t0, fontSize: 12, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
      >
        {['Suspicious contact methods', 'Fake company', 'Payment required', 'Duplicate posting', 'Other'].map(r => <option key={r}>{r}</option>)}
      </select>
      <div style={{ marginBottom: 10 }}>
        <Lbl>Also flag site?</Lbl>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="danger" small>Yes, flag site</Btn>
          <Btn variant="ghost" small>Job only</Btn>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Btn variant="danger" full onClick={() => { toast('Scam reported — thank you', 'error'); go('home') }} icon="🚩">Report Scam</Btn>
        <Btn variant="ghost" full onClick={() => go('existing-job')}>Cancel</Btn>
      </div>
    </div>
  )
}

function SJobDetails({ go }: { go: (s: Screen) => void }) {
  const [open, setOpen] = useState<string[]>(['Description'])
  function toggle(s: string) { setOpen(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]) }
  const sections = [
    { title: 'Description', content: 'Build and scale distributed systems processing millions of payments daily. Work on core infrastructure spanning 40+ microservices.' },
    { title: 'Requirements', content: '7+ yrs backend, Python or Go, PostgreSQL, distributed systems design, strong CS fundamentals.' },
    { title: 'Benefits', content: 'Competitive equity, $10k L&D, remote-first, unlimited PTO, premium healthcare.' },
  ]
  return (
    <div>
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip color={T.blue} bg="rgba(59,130,246,0.08)" border="rgba(59,130,246,0.2)">Full-time</Chip>
          <Chip color={T.green} bg="rgba(6,214,160,0.08)" border="rgba(6,214,160,0.2)">Remote (US)</Chip>
          <Chip color={T.amber} bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.2)">$220k–$280k</Chip>
        </div>
      </div>
      <div>
        {sections.map(s => (
          <div key={s.title} style={{ borderBottom: `1px solid ${T.bd}` }}>
            <div onClick={() => toggle(s.title)} style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: 12, color: T.t0, fontWeight: 500 }}>{s.title}</span>
              <span style={{ fontSize: 10, color: T.t3 }}>{open.includes(s.title) ? '▾' : '▸'}</span>
            </div>
            {open.includes(s.title) && (
              <div style={{ padding: '0 14px 10px', fontSize: 11, color: T.t2, lineHeight: 1.6 }}>{s.content}</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Found on 3 sites</Lbl>
        {[
          { site: 'greenhouse.io/stripe', date: 'Sep 10' },
          { site: 'linkedin.com/jobs', date: 'Sep 11' },
          { site: 'stripe.com/jobs', date: 'Sep 11' },
        ].map(r => (
          <div key={r.site} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: T.blue, fontFamily: T.mono }}>{r.site}</span>
            <span style={{ fontSize: 10, color: T.t3, fontFamily: T.mono }}>{r.date}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SSettings({ go }: { go: (s: Screen) => void }) {
  const [togs, setTogs] = useState({ autoDetect: true, notifications: true, cvHints: true, scamFilter: true, darkMode: true, sync: false })
  function tog(k: keyof typeof togs) { setTogs(prev => ({ ...prev, [k]: !prev[k] })) }
  return (
    <div>
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Account</Lbl>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>AK</div>
          <div>
            <div style={{ fontSize: 12, color: T.t0, fontWeight: 500 }}>Alex Kim</div>
            <div style={{ fontSize: 10, color: T.t3 }}>alex@example.com</div>
          </div>
          <Btn variant="ghost" small onClick={() => go('login')}>Sign out</Btn>
        </div>
      </div>
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Detection</Lbl>
        {[
          { label: 'Auto-detect jobs', key: 'autoDetect' },
          { label: 'Scam filter', key: 'scamFilter' },
        ].map(item => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: T.t1 }}>{item.label}</span>
            <Tog on={togs[item.key as keyof typeof togs]} onToggle={() => tog(item.key as keyof typeof togs)} />
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${T.bd}` }}>
        <Lbl>Behaviour</Lbl>
        {[
          { label: 'Notifications', key: 'notifications' },
          { label: 'CV match hints', key: 'cvHints' },
          { label: 'Auto-sync', key: 'sync' },
        ].map(item => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: T.t1 }}>{item.label}</span>
            <Tog on={togs[item.key as keyof typeof togs]} onToggle={() => tog(item.key as keyof typeof togs)} />
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 14px' }}>
        <div style={{ fontSize: 10, color: T.t4, fontFamily: T.mono, textAlign: 'center' }}>JobIntel Extension v1.4.2 · build 2026.09</div>
      </div>
    </div>
  )
}

function SError({ go }: { go: (s: Screen) => void }) {
  return (
    <div style={{ padding: '28px 18px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, color: T.red, marginBottom: 10 }}>⚠</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.t0, marginBottom: 4 }}>Something went wrong</div>
      <div style={{ fontSize: 11, color: T.t2, lineHeight: 1.5, marginBottom: 16 }}>
        Failed to connect to the JobIntel API. Check your connection or try again.
      </div>
      <div style={{ background: T.bg2, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 5, padding: '8px 12px', marginBottom: 14, textAlign: 'left' }}>
        <div style={{ fontSize: 10, color: T.red, fontFamily: T.mono }}>ERR_CONNECTION_TIMEOUT</div>
        <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono }}>api.jobintel.io/v2/jobs/lookup</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn variant="blue" full onClick={() => go('detecting')} icon="⟳">Retry</Btn>
        <Btn variant="ghost" full onClick={() => go('home')}>Home</Btn>
      </div>
    </div>
  )
}

function SOffline({ go }: { go: (s: Screen) => void }) {
  return (
    <div style={{ padding: '28px 18px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, opacity: 0.4, marginBottom: 10 }}>⊘</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.t0, marginBottom: 4 }}>You're offline</div>
      <div style={{ fontSize: 11, color: T.t2, lineHeight: 1.5, marginBottom: 16 }}>
        JobIntel requires an internet connection. Some cached data may be available.
      </div>
      <Btn variant="ghost" full onClick={() => go('detecting')} icon="⟳">Try reconnecting</Btn>
    </div>
  )
}

/* ─────────── popup shell ─────────── */

function PopupHeader({ screen, onBack, onSettings }: { screen: Screen; onBack?: () => void; onSettings: () => void }) {
  const title = TITLES[screen] ?? ''
  const showBack = screen in BACK && screen !== 'home' && screen !== 'login'
  return (
    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.bd}`, background: T.bg0, display: 'flex', alignItems: 'center', gap: 8, height: 38, boxSizing: 'border-box', flexShrink: 0 }}>
      {showBack ? (
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.t2, cursor: 'pointer', fontSize: 13, padding: '0 2px', display: 'flex', alignItems: 'center' }}>‹</button>
      ) : (
        <div style={{ width: 20, height: 20, borderRadius: 4, background: 'linear-gradient(135deg, #3b82f6, #06d6a0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: T.bg0, fontFamily: T.mono, flexShrink: 0 }}>J</div>
      )}
      <span style={{ flex: 1, fontSize: screen === 'home' || screen === 'login' ? 12 : 11, fontWeight: 600, color: screen === 'home' || screen === 'login' ? T.t0 : T.t1 }}>
        {screen === 'home' || screen === 'login' ? 'JobIntel' : title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.green }} />
        <span style={{ fontSize: 9, color: T.green, fontFamily: T.mono }}>live</span>
      </div>
      {screen !== 'login' && (
        <button onClick={onSettings} style={{ background: 'none', border: 'none', color: T.t3, cursor: 'pointer', fontSize: 12, padding: '0 2px' }}>⚙</button>
      )}
      {screen !== 'login' && (
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff' }}>AK</div>
      )}
    </div>
  )
}

function BottomNav({ tab, setTab, go }: { tab: NavTab; setTab: (t: NavTab) => void; go: (s: Screen) => void }) {
  const tabs: { id: NavTab; icon: string; label: string; screen: Screen }[] = [
    { id: 'home', icon: '⬡', label: 'Home', screen: 'home' },
    { id: 'jobs', icon: '◈', label: 'Jobs', screen: 'existing-job' },
    { id: 'applications', icon: '◉', label: 'Apps', screen: 'application' },
    { id: 'cv', icon: '▤', label: 'CV', screen: 'cv-select' },
    { id: 'settings', icon: '⚙', label: 'More', screen: 'settings' },
  ]
  return (
    <div style={{ borderTop: `1px solid ${T.bd}`, background: T.bg0, display: 'flex', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => { setTab(t.id); go(t.screen) }} style={{
          flex: 1, background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '6px 0', gap: 2,
          color: tab === t.id ? T.blue : T.t3,
          borderTop: `1px solid ${tab === t.id ? T.blue : 'transparent'}`,
          marginTop: -1,
        }}>
          <span style={{ fontSize: 11 }}>{t.icon}</span>
          <span style={{ fontSize: 9, fontFamily: T.mono }}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

function ExtensionPopup({ initialScreen }: { initialScreen: Screen }) {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [tab, setTab] = useState<NavTab>('home')
  const [toastData, setToastData] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => { setScreen(initialScreen) }, [initialScreen])

  function go(s: Screen, t?: NavTab) { setScreen(s); if (t) setTab(t) }
  function back() { const prev = BACK[screen]; if (prev) setScreen(prev) }
  function toast(msg: string, type: 'success' | 'error' | 'info') { setToastData({ msg, type }) }
  function clearToast() { setToastData(null) }

  const showNav = !NO_NAV.includes(screen)
  const bodyHeight = showNav ? 582 - 38 - 44 : 582 - 38

  return (
    <div style={{ width: 380, height: 582, background: T.bg1, border: `1px solid ${T.bd}`, borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', position: 'relative', fontFamily: T.sans }}>
      <PopupHeader screen={screen} onBack={back} onSettings={() => go('settings')} />
      {toastData && <ExtToast msg={toastData.msg} type={toastData.type} onDone={clearToast} />}
      <div style={{ flex: 1, height: bodyHeight, overflowY: 'auto', overflowX: 'hidden' }}>
        {screen === 'login'        && <SLogin go={go} />}
        {screen === 'home'         && <SHome go={go} />}
        {screen === 'detecting'    && <SDetecting go={go} />}
        {screen === 'no-job'       && <SNoJob go={go} />}
        {screen === 'new-job'      && <SNewJob go={go} />}
        {screen === 'existing-job' && <SExistingJob go={go} toast={toast} />}
        {screen === 'unknown-site' && <SUnknownSite go={go} />}
        {screen === 'site-analysis'&& <SSiteAnalysis go={go} />}
        {screen === 'site-result'  && <SSiteResult go={go} toast={toast} />}
        {screen === 'review-job'   && <SReviewJob go={go} toast={toast} />}
        {screen === 'save-success' && <SSaveSuccess go={go} />}
        {screen === 'cv-select'    && <SCVSelect go={go} />}
        {screen === 'cv-upload'    && <SCVUpload go={go} toast={toast} />}
        {screen === 'cv-analyzing' && <SCVAnalyzing go={go} />}
        {screen === 'cv-results'   && <SCVResults go={go} />}
        {screen === 'cv-generate'  && <SCVGenerate go={go} />}
        {screen === 'cv-preview'   && <SCVPreview go={go} toast={toast} />}
        {screen === 'application'  && <SApplication go={go} toast={toast} />}
        {screen === 'app-history'  && <SAppHistory go={go} />}
        {screen === 'rejected'     && <SRejected go={go} toast={toast} />}
        {screen === 'scam-confirm' && <SScamConfirm go={go} toast={toast} />}
        {screen === 'job-details'  && <SJobDetails go={go} />}
        {screen === 'settings'     && <SSettings go={go} />}
        {screen === 'error'        && <SError go={go} />}
        {screen === 'offline'      && <SOffline go={go} />}
      </div>
      {showNav && <BottomNav tab={tab} setTab={setTab} go={go} />}
    </div>
  )
}

/* ─────────── scenario grid ─────────── */

const SCENARIOS: { group: string; items: { label: string; screen: Screen; desc: string }[] }[] = [
  {
    group: 'Auth',
    items: [
      { label: 'Login', screen: 'login', desc: 'Sign in screen' },
    ],
  },
  {
    group: 'Detection',
    items: [
      { label: 'Home', screen: 'home', desc: 'Dashboard overview' },
      { label: 'Detecting', screen: 'detecting', desc: 'Auto-advances to job' },
      { label: 'No Job', screen: 'no-job', desc: 'Page not a job' },
    ],
  },
  {
    group: 'Job Flows',
    items: [
      { label: 'New Job', screen: 'new-job', desc: 'Extract & add new' },
      { label: 'Existing Job', screen: 'existing-job', desc: 'Already in platform' },
      { label: 'Review & Save', screen: 'review-job', desc: 'Confirm before saving' },
      { label: 'Saved ✓', screen: 'save-success', desc: 'Job saved confirmation' },
      { label: 'Job Details', screen: 'job-details', desc: 'Description, requirements' },
      { label: 'Rejected', screen: 'rejected', desc: 'Mark not moving forward' },
      { label: 'Flag Scam', screen: 'scam-confirm', desc: 'Report suspicious job' },
    ],
  },
  {
    group: 'Site Flows',
    items: [
      { label: 'Unknown Site', screen: 'unknown-site', desc: 'Site not registered' },
      { label: 'Analyzing', screen: 'site-analysis', desc: 'Crawl analysis (animated)' },
      { label: 'Site Result', screen: 'site-result', desc: 'Registration success' },
    ],
  },
  {
    group: 'CV Flows',
    items: [
      { label: 'CV Select', screen: 'cv-select', desc: 'Pick a CV to match' },
      { label: 'CV Upload', screen: 'cv-upload', desc: 'Upload new document' },
      { label: 'CV Analyzing', screen: 'cv-analyzing', desc: 'Parse & score (animated)' },
      { label: 'CV Results', screen: 'cv-results', desc: '78% match, gap analysis' },
      { label: 'CV Generate', screen: 'cv-generate', desc: 'Tailored CV options' },
      { label: 'CV Preview', screen: 'cv-preview', desc: 'Document preview' },
    ],
  },
  {
    group: 'Application',
    items: [
      { label: 'Application', screen: 'application', desc: 'Status, notes, timeline' },
      { label: 'History', screen: 'app-history', desc: 'Full event timeline' },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Settings', screen: 'settings', desc: 'Config & toggles' },
      { label: 'Error', screen: 'error', desc: 'API failure state' },
      { label: 'Offline', screen: 'offline', desc: 'No connection' },
    ],
  },
]

/* ─────────── flow diagram ─────────── */

function FlowDiagram({ go }: { go: (s: Screen) => void }) {
  const node = (label: string, screen: Screen, color = T.blue) => (
    <div onClick={() => go(screen)} style={{
      padding: '4px 10px', borderRadius: 4, border: `1px solid ${color}44`, background: `${color}11`,
      color, fontSize: 10, fontFamily: T.mono, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>{label}</div>
  )
  const arrow = (dir: 'r' | 'd' = 'r') => (
    <div style={{ color: T.t4, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: dir === 'd' ? '0 0 0 14px' : '0 2px' }}>
      {dir === 'r' ? '→' : '↓'}
    </div>
  )
  return (
    <div style={{ background: T.bg1, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>UX Flow — click to navigate</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          {node('Login', 'login', T.t2)} {arrow()} {node('Home', 'home')} {arrow()} {node('Detecting', 'detecting', T.amber)} {arrow()} {node('Existing Job', 'existing-job', T.green)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, paddingLeft: 24 }}>
          {arrow()} {node('No Job', 'no-job', T.amber)} {arrow()} {node('New Job', 'new-job')} {arrow()} {node('Review', 'review-job')} {arrow()} {node('Saved ✓', 'save-success', T.green)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, paddingLeft: 24 }}>
          {arrow()} {node('Unknown Site', 'unknown-site', T.purple)} {arrow()} {node('Analyzing', 'site-analysis', T.purple)} {arrow()} {node('Site Result', 'site-result', T.green)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, paddingLeft: 24 }}>
          {arrow()} {node('CV Select', 'cv-select')} {arrow()} {node('CV Results', 'cv-results', T.green)} {arrow()} {node('Generate', 'cv-generate', T.purple)} {arrow()} {node('Preview', 'cv-preview', T.purple)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, paddingLeft: 24 }}>
          {arrow()} {node('Application', 'application')} {arrow()} {node('History', 'app-history')}
          <span style={{ fontSize: 9, color: T.t4, fontFamily: T.mono, marginLeft: 4 }}>/ {node('Rejected', 'rejected', T.red)}</span>
          <span style={{ fontSize: 9, color: T.t4, fontFamily: T.mono, marginLeft: 4 }}>/ {node('Flag Scam', 'scam-confirm', T.red)}</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────── page ─────────── */

const URL_MAP: Partial<Record<Screen, string>> = {
  'login': 'app.jobintel.io',
  'home': 'greenhouse.io/stripe/jobs/123456',
  'detecting': 'greenhouse.io/stripe/jobs/123456',
  'no-job': 'jobs.stripe.com/jobs/789',
  'new-job': 'jobs.stripe.com/jobs/789',
  'existing-job': 'greenhouse.io/stripe/jobs/123456',
  'unknown-site': 'jobs.newboard.io/acme/backend',
  'site-analysis': 'jobs.newboard.io/acme/backend',
  'site-result': 'jobs.newboard.io/acme/backend',
  'review-job': 'jobs.stripe.com/jobs/789',
  'save-success': 'greenhouse.io/stripe/jobs/123456',
}

export default function ChromeExtension() {
  const [activeScreen, setActiveScreen] = useState<Screen>('existing-job')
  const popupRef = useRef<number>(0)

  function selectScreen(s: Screen) {
    setActiveScreen(s)
    popupRef.current++
  }

  const url = URL_MAP[activeScreen] ?? 'greenhouse.io/stripe/jobs/123456'

  return (
    <div className="page-pad">
      <style>{`
        @keyframes ext-spin { to { transform: rotate(360deg) } }
        @keyframes ext-fadein { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: T.t0, letterSpacing: '-0.02em' }}>Chrome Extension</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.t3 }}>
            Interactive simulator · 25 screens · click any scenario to preview
          </p>
        </div>
        <button style={{ padding: '8px 16px', background: T.blue, border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: T.sans }}>
          ↓ Install Extension
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 28, alignItems: 'start' }}>
        {/* Left: scenario grid + flow diagram */}
        <div style={{ minWidth: 0 }}>
          {/* Scenario grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            {SCENARIOS.map(group => (
              <div key={group.group}>
                <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {group.group}
                  <div style={{ flex: 1, height: 1, background: T.bd }} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {group.items.map(item => (
                    <button
                      key={item.screen}
                      onClick={() => selectScreen(item.screen)}
                      title={item.desc}
                      style={{
                        padding: '5px 12px',
                        background: activeScreen === item.screen ? 'rgba(59,130,246,0.15)' : T.bg1,
                        border: `1px solid ${activeScreen === item.screen ? T.blue : T.bd}`,
                        borderRadius: 5,
                        color: activeScreen === item.screen ? T.blue : T.t2,
                        fontSize: 11,
                        cursor: 'pointer',
                        fontFamily: T.mono,
                        transition: 'all 0.12s',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <FlowDiagram go={selectScreen} />

          {/* How it works */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 10, color: T.t3, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              How it works <div style={{ flex: 1, height: 1, background: T.bd }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {[
                { step: '01', title: 'Visit any job page', desc: 'Detects job URLs automatically as you browse known and unknown sites.' },
                { step: '02', title: 'Platform lookup', desc: 'Checks whether the job or site is already tracked in JobIntel in real time.' },
                { step: '03', title: 'Act without leaving', desc: 'Update status, run CV analysis, save the job — right inside the popup.' },
                { step: '04', title: 'Instant sync', desc: 'All changes appear in the platform immediately, tagged with source.' },
              ].map(f => (
                <div key={f.step} className="data-card" style={{ borderRadius: 6, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: T.t4, fontFamily: T.mono, marginBottom: 5 }}>{f.step}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1', marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: T.t2, lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: browser chrome + popup */}
        <div style={{ position: 'sticky', top: 16, flexShrink: 0 }}>
          {/* Browser chrome */}
          <div style={{ background: '#1e2737', borderRadius: 10, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', width: 420 }}>
            <div style={{ background: '#252f43', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${T.bd}` }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {[T.red, T.amber, T.green].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
              </div>
              <div style={{ flex: 1, background: '#151e30', borderRadius: 4, padding: '3px 10px', fontSize: 10, color: T.t3, fontFamily: T.mono, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{url}</div>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: 'linear-gradient(135deg, #3b82f6, #06d6a0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: T.bg0, fontFamily: T.mono, cursor: 'pointer', flexShrink: 0 }}>J</div>
            </div>
            {/* Page mock */}
            <div style={{ background: '#0f1520', padding: 16, position: 'relative', minHeight: 100 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  {[180, 120, '90%', '80%', '85%', '70%'].map((w, i) => (
                    <div key={i} style={{ width: w, height: i < 2 ? 14 : 9, background: '#141e30', borderRadius: 3, marginBottom: i === 1 ? 14 : 5 }} />
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <div style={{ padding: '5px 14px', background: '#1d4ed8', borderRadius: 3, fontSize: 10, color: '#fff' }}>Apply Now</div>
                    <div style={{ padding: '5px 14px', background: '#1a2540', borderRadius: 3, fontSize: 10, color: T.t2 }}>Save</div>
                  </div>
                </div>
                <div style={{ width: 100, flexShrink: 0 }}>
                  <div style={{ width: '100%', height: 60, background: '#141e30', borderRadius: 5, marginBottom: 8 }} />
                  <div style={{ width: '70%', height: 8, background: '#141e30', borderRadius: 3, marginBottom: 5 }} />
                  <div style={{ width: '55%', height: 8, background: '#141e30', borderRadius: 3 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Popup below browser chrome */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingRight: 0 }}>
            <ExtensionPopup key={`${activeScreen}-${popupRef.current}`} initialScreen={activeScreen} />
          </div>
        </div>
      </div>
    </div>
  )
}
