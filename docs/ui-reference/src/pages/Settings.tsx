import { useState } from 'react'
import { useToast } from '../components/Toast'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        {title}<div style={{ flex: 1, height: 1, background: '#1a2540' }} />
      </div>
      <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #1a2540', gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? '#3b82f6' : '#1a2540', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: value ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </div>
  )
}

export default function Settings() {
  const toast = useToast()
  const [autoSave, setAutoSave] = useState(true)
  const [dedup, setDedup]       = useState(true)
  const [classify, setClassify] = useState(true)
  const [notifNew, setNotifNew] = useState(true)
  const [notifCrawl, setNotifCrawl] = useState(true)
  const [notifFail, setNotifFail]   = useState(true)
  const [notifCV, setNotifCV]       = useState(false)
  const [darkMode, setDarkMode]     = useState(true)
  const [apiKey, setApiKey]         = useState('sk-•••••••••••••••••••••••••••••••••abc123')

  return (
    <div className="page-pad" style={{ maxWidth: 760 }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Settings</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>Platform preferences and configuration</p>
        </div>
      </div>

      {/* Profile */}
      <Section title="Profile">
        {[
          { label: 'Full Name', val: 'Alex Kim', type: 'text' },
          { label: 'Email', val: 'alex@example.com', type: 'email' },
        ].map(f => (
          <Row key={f.label} label={f.label}>
            <input defaultValue={f.val} type={f.type}
              style={{ padding: '6px 10px', background: '#111c35', border: '1px solid #1a2540', borderRadius: 5, color: '#e2e8f0', fontSize: 12, outline: 'none', width: 220 }} />
          </Row>
        ))}
        <div style={{ padding: '12px 20px' }}>
          <button onClick={() => toast.success('Profile saved.')} style={{ padding: '7px 16px', background: '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Save Profile</button>
        </div>
      </Section>

      {/* Security */}
      <Section title="Security">
        <Row label="Password" desc="Last changed 30 days ago">
          <button onClick={() => toast.info('Password reset email sent.')} style={{ padding: '6px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>Change</button>
        </Row>
        <Row label="Sessions" desc="1 active session">
          <button onClick={() => toast.warn('All other sessions signed out.')} style={{ padding: '6px 14px', background: 'none', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>Sign out others</button>
        </Row>
      </Section>

      {/* API */}
      <Section title="API Keys">
        <Row label="JobIntel API Key" desc="Use this key to authenticate the Chrome Extension">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input value={apiKey} readOnly style={{ padding: '6px 10px', background: '#111c35', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', outline: 'none', width: 240 }} />
            <button onClick={() => { navigator.clipboard.writeText(apiKey); toast.success('API key copied.') }} style={{ padding: '6px 10px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>Copy</button>
          </div>
        </Row>
        <Row label="Regenerate Key" desc="Existing key will be invalidated immediately">
          <button onClick={() => toast.warn('API key regenerated — update the extension.')} style={{ padding: '6px 14px', background: 'none', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 5, color: '#f59e0b', fontSize: 12, cursor: 'pointer' }}>Regenerate</button>
        </Row>
      </Section>

      {/* Crawl behaviour */}
      <Section title="Crawl Behaviour">
        <Row label="Auto-save discovered jobs" desc="Save new jobs automatically when a crawl completes">
          <Toggle value={autoSave} onChange={v => { setAutoSave(v); toast.info(`Auto-save ${v ? 'enabled' : 'disabled'}.`) }} />
        </Row>
        <Row label="Deduplication" desc="Merge new discoveries into existing canonical jobs">
          <Toggle value={dedup} onChange={v => { setDedup(v); toast.info(`Deduplication ${v ? 'enabled' : 'disabled'}.`) }} />
        </Row>
        <Row label="Auto-classify jobs" desc="Run skill and category classification on crawled jobs">
          <Toggle value={classify} onChange={v => { setClassify(v); toast.info(`Classification ${v ? 'enabled' : 'disabled'}.`) }} />
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        {[
          { label: 'New jobs discovered', desc: 'Notify when a crawl finds new canonical jobs', val: notifNew,   set: setNotifNew },
          { label: 'Crawl completed',     desc: 'Notify when any crawl session finishes',       val: notifCrawl, set: setNotifCrawl },
          { label: 'Crawl failed',        desc: 'Notify when a crawl encounters errors',         val: notifFail,  set: setNotifFail },
          { label: 'CV analysis done',    desc: 'Notify when a batch CV analysis completes',     val: notifCV,    set: setNotifCV },
        ].map(n => (
          <Row key={n.label} label={n.label} desc={n.desc}>
            <Toggle value={n.val} onChange={v => { n.set(v); toast.info(`${n.label}: ${v ? 'on' : 'off'}.`) }} />
          </Row>
        ))}
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <Row label="Dark mode" desc="Use dark theme across the platform">
          <Toggle value={darkMode} onChange={v => { setDarkMode(v); toast.info('Theme preference saved.') }} />
        </Row>
        <Row label="Density" desc="Information density of tables and lists">
          <div style={{ display: 'flex', gap: 6 }}>
            {['Compact', 'Default', 'Relaxed'].map((d, i) => (
              <button key={d} style={{ padding: '5px 10px', background: i === 1 ? 'rgba(59,130,246,0.15)' : 'none', border: `1px solid ${i === 1 ? '#3b82f6' : '#1a2540'}`, borderRadius: 4, color: i === 1 ? '#3b82f6' : '#64748b', fontSize: 11, cursor: 'pointer' }}>{d}</button>
            ))}
          </div>
        </Row>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <Row label="Export all data" desc="Download a JSON export of all jobs, sites, applications">
          <button onClick={() => toast.info('Export started — you will be notified when ready.')} style={{ padding: '6px 14px', background: 'none', border: '1px solid #1a2540', borderRadius: 5, color: '#64748b', fontSize: 12, cursor: 'pointer' }}>Export</button>
        </Row>
        <Row label="Delete account" desc="Permanently remove your account and all data">
          <button onClick={() => toast.error('Account deletion requires email confirmation.')} style={{ padding: '6px 14px', background: 'none', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 5, color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>Delete Account</button>
        </Row>
      </Section>
    </div>
  )
}
