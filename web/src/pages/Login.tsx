import { useState } from 'react';

import { api } from '../api/client';
import type { User } from '../App';

export default function Login({
  onAuthenticated,
  onRegister,
}: {
  onAuthenticated: (user: User) => void;
  onRegister: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (remember) localStorage.setItem('jobintel-last-email', email);
      else localStorage.removeItem('jobintel-last-email');
      onAuthenticated(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="public-auth-page"
      style={{
        minHeight: 'calc(100vh - 76px)',
        background: '#070b14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 44,
              height: 44,
              background: 'linear-gradient(135deg, #3b82f6, #06d6a0)',
              borderRadius: 10,
              margin: '0 auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 700,
              color: '#070b14',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            J
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#e2e8f0' }}>JobIntel</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
            Job intelligence & application platform
          </div>
        </div>

        <form
          onSubmit={submit}
          style={{
            background: '#0d1425',
            border: '1px solid #1a2540',
            borderRadius: 8,
            padding: 28,
          }}
        >
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>
            Sign in
          </h2>
          {error && (
            <div
              style={{
                padding: '9px 12px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 5,
                fontSize: 12,
                color: '#ef4444',
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}
          <label style={{ display: 'block', marginBottom: 14 }}>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5 }}
            >
              EMAIL
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoFocus
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '9px 12px',
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 5,
                color: '#e2e8f0',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5 }}
            >
              PASSWORD
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••"
              style={{
                width: '100%',
                padding: '9px 12px',
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 5,
                color: '#e2e8f0',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
              fontSize: 12,
              color: '#64748b',
            }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              style={{ accentColor: '#3b82f6' }}
            />{' '}
            Remember this email on this device
          </label>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 0',
              background: '#3b82f6',
              opacity: loading ? 0.65 : 1,
              border: 'none',
              borderRadius: 5,
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#475569' }}>
            Don't have an account?{' '}
            <span onClick={onRegister} style={{ color: '#3b82f6', cursor: 'pointer' }}>
              Create one
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
