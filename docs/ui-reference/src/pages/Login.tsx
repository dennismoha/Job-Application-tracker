import { useState } from 'react'

export default function Login({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Email and password are required.'); return }
    setError('')
    setLoading(true)
    setTimeout(() => { setLoading(false); onLogin() }, 1000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070b14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #3b82f6, #06d6a0)',
            borderRadius: 10, margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#070b14', fontFamily: 'JetBrains Mono, monospace',
          }}>J</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em' }}>JobIntel</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Job intelligence & application platform</div>
        </div>

        <form onSubmit={submit} style={{ background: '#0d1425', border: '1px solid #1a2540', borderRadius: 8, padding: 28 }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>Sign in</h2>

          {error && (
            <div style={{ padding: '9px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, fontSize: 12, color: '#ef4444', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 5 }}>EMAIL</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="alex@example.com" autoFocus
              style={{ width: '100%', padding: '9px 12px', background: '#111c35', border: '1px solid #1a2540', borderRadius: 5, color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>PASSWORD</label>
              <span style={{ fontSize: 11, color: '#3b82f6', cursor: 'pointer' }}>Forgot password?</span>
            </div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '9px 12px', background: '#111c35', border: '1px solid #1a2540', borderRadius: 5, color: '#e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <input type="checkbox" id="remember" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: '#3b82f6' }} />
            <label htmlFor="remember" style={{ fontSize: 12, color: '#64748b', cursor: 'pointer' }}>Remember this session</label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '10px 0', background: loading ? '#1d4ed8' : '#3b82f6', border: 'none', borderRadius: 5, color: '#fff', fontSize: 13, fontWeight: 500, cursor: loading ? 'default' : 'pointer', transition: 'background 0.15s' }}
          >
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#475569' }}>
            Don't have an account?{' '}
            <span onClick={onRegister} style={{ color: '#3b82f6', cursor: 'pointer' }}>Create one</span>
          </div>
        </form>

        {/* Demo hint */}
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>
          Demo: any email + password will work
        </div>
      </div>
    </div>
  )
}
