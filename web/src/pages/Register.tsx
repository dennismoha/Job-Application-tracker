import { useState } from 'react';

import { api } from '../api/client';
import type { User } from '../App';

export default function Register({
  onAuthenticated,
  onLogin,
}: {
  onAuthenticated: (user: User) => void;
  onLogin: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api<{ user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() || undefined, email, password }),
      });
      onAuthenticated(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account creation failed.');
    } finally {
      setLoading(false);
    }
  }

  const strengthScore =
    password.length === 0 ? 0 : password.length < 10 ? 1 : password.length < 14 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#06d6a0'];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070b14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
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
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Create your account</div>
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
            Get started
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
          {[
            {
              label: 'FULL NAME',
              value: name,
              setter: setName,
              type: 'text',
              placeholder: 'Your name',
            },
            {
              label: 'EMAIL_ONLY',
              value: email,
              setter: setEmail,
              type: 'email',
              placeholder: 'you@example.com',
            },
          ].map((field) => (
            <label key={field.label} style={{ display: 'block', marginBottom: 14 }}>
              <span
                className="mono"
                style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5 }}
              >
                {field.label}
              </span>
              <input
                type={field.type}
                required
                value={field.value}
                onChange={(event) => field.setter(event.target.value)}
                placeholder={field.placeholder}
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
          ))}
          <label style={{ display: 'block', marginBottom: 10 }}>
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
              placeholder="At least 10 characters"
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
            {password && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 3, background: '#1a2540', borderRadius: 2 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(strengthScore / 3) * 100}%`,
                      background: strengthColor[strengthScore],
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: strengthColor[strengthScore] }}
                >
                  {strengthLabel[strengthScore]}
                </span>
              </div>
            )}
          </label>
          <label style={{ display: 'block', marginBottom: 20 }}>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5 }}
            >
              CONFIRM PASSWORD
            </span>
            <input
              type="password"
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Re-enter password"
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
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#475569' }}>
            Already have an account?{' '}
            <span onClick={onLogin} style={{ color: '#3b82f6', cursor: 'pointer' }}>
              Sign in
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
