import { useState } from 'react'

export default function Register({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [loading, setLoading]         = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())          e.name     = 'Name is required.'
    if (!email.includes('@'))  e.email    = 'Enter a valid email.'
    if (password.length < 8)   e.password = 'Password must be at least 8 characters.'
    if (password !== confirm)  e.confirm  = 'Passwords do not match.'
    return e
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    setTimeout(() => { setLoading(false); onRegister() }, 1200)
  }

  const strengthScore = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const strengthLabel = ['', 'Weak', 'Good', 'Strong']
  const strengthColor = ['', '#ef4444', '#f59e0b', '#06d6a0']

  return (
    <div style={{ minHeight: '100vh', background: '#070b14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #3b82f6, #06d6a0)',
            borderRadius: 10, margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#070b14', fontFamily: 'JetBrains Mono, monospace',
          }}>J</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em' }}>JobIntel</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Create your account</div>
        </div>

        <form onSubmit={submit} style={{ background: '#0d1425', border: '1px solid #1a2540', borderRadius: 8, padding: 28 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>Get started</h2>

          {[
            { label: 'FULL NAME', key: 'name',  val: name,  set: setName,  type: 'text',     ph: 'Alex Kim' },
            { label: 'EMAIL',     key: 'email', val: email, set: setEmail, type: 'email',    ph: 'alex@example.com' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>{f.label}</label>
              <input
                type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                style={{ width: '100%', padding: '9px 12px', background: '#111c35', border: `1px solid ${errors[f.key] ? 'rgba(239,68,68,0.5)' : '#1a2540'}`, borderRadius: 5, color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
              {errors[f.key] && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors[f.key]}</div>}
            </div>
          ))}

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>PASSWORD</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
              style={{ width: '100%', padding: '9px 12px', background: '#111c35', border: `1px solid ${errors.password ? 'rgba(239,68,68,0.5)' : '#1a2540'}`, borderRadius: 5, color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
            {password && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 3, background: '#1a2540', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${(strengthScore / 3) * 100}%`, background: strengthColor[strengthScore], borderRadius: 2, transition: 'width 0.2s' }} />
                </div>
                <span style={{ fontSize: 10, color: strengthColor[strengthScore], fontFamily: 'JetBrains Mono, monospace' }}>{strengthLabel[strengthScore]}</span>
              </div>
            )}
            {errors.password && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.password}</div>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>CONFIRM PASSWORD</label>
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password"
              style={{ width: '100%', padding: '9px 12px', background: '#111c35', border: `1px solid ${errors.confirm ? 'rgba(239,68,68,0.5)' : '#1a2540'}`, borderRadius: 5, color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
            {errors.confirm && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.confirm}</div>}
          </div>

          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: '10px 0', background: loading ? '#1d4ed8' : '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, fontWeight: 500, cursor: loading ? 'default' : 'pointer' }}
          >
            {loading ? 'Creating account...' : 'Create account →'}
          </button>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#475569' }}>
            Already have an account?{' '}
            <span onClick={onLogin} style={{ color: '#3b82f6', cursor: 'pointer' }}>Sign in</span>
          </div>
        </form>
      </div>
    </div>
  )
}
