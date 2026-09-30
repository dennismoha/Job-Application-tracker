import { useEffect, useState } from 'react';

import { api } from '../api/client';
import { useToast } from '../components/Toast';
import ExtensionFlowDemo from './ExtensionFlowDemo';

interface TokenRecord {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  token?: string;
}

function fmt(date?: string | null) {
  return date ? new Date(date).toLocaleString() : 'Never';
}

export default function ChromeExtension({ activeProfileId }: { activeProfileId: string }) {
  const toast = useToast();
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [newToken, setNewToken] = useState('');
  const [name, setName] = useState('My browser');
  const [busy, setBusy] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  async function load() {
    try {
      const r = await api<{ tokens: TokenRecord[] }>('/api/browser-companion/tokens');
      setTokens(r.tokens);
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not load Browser Companion tokens.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function create() {
    setBusy(true);
    try {
      const r = await api<{ token: TokenRecord & { token: string } }>(
        '/api/browser-companion/tokens',
        {
          method: 'POST',
          body: JSON.stringify({ name: name.trim() || 'My browser', expiresInDays: 180 }),
        },
      );
      setNewToken(r.token.token);
      toast.success('Browser token created. Copy it now; only the hash is stored.');
      await load();
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not create token.');
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    try {
      await api(`/api/browser-companion/tokens/${id}`, { method: 'DELETE' });
      toast.success('Browser token revoked.');
      await load();
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not revoke token.');
    }
  }
  return (
    <div style={{ padding: '26px 30px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: '#e2e8f0', fontWeight: 600 }}>
            Browser Extension
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
            Capture the page you are already viewing, detect jobs, compare CVs and continue the
            application workflow without losing context.
          </p>
        </div>
        <button
          onClick={() => setShowDemo((v) => !v)}
          style={{
            padding: '7px 11px',
            background: '#111c35',
            border: '1px solid #1a2540',
            borderRadius: 4,
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          {showDemo ? 'Hide' : 'Open'} interactive flow preview
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.2fr) minmax(300px,.8fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="data-card" style={{ borderRadius: 6, padding: 16 }}>
          <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 10 }}>
            WHAT THE EXTENSION DOES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
            {[
              ['1', 'Detect', 'Checks whether the open tab is a specific vacancy page.'],
              ['2', 'Extract', 'Reads structured JobPosting data and visible job content.'],
              ['3', 'Compare', 'Compares the vacancy with a CV from any search profile.'],
              ['4', 'Act', 'Save, apply, improve CV, or keep the job + CV preparation for later.'],
            ].map(([n, title, desc]) => (
              <div
                key={n}
                style={{
                  padding: 11,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                }}
              >
                <div className="mono" style={{ fontSize: 9, color: '#3b82f6' }}>
                  STEP {n}
                </div>
                <strong
                  style={{ display: 'block', fontSize: 11, color: '#e2e8f0', margin: '5px 0 3px' }}
                >
                  {title}
                </strong>
                <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.45 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: '#64748b' }}>
            Active search context:{' '}
            <strong style={{ color: '#94a3b8' }}>
              {activeProfileId ? 'selected profile' : 'all profiles'}
            </strong>
            . The extension can still choose a different CV explicitly.
          </div>
        </div>
        <div
          className="data-card"
          style={{
            borderRadius: 6,
            padding: 16,
            background: 'linear-gradient(135deg,#0d1425,rgba(59,130,246,.04))',
          }}
        >
          <div className="mono" style={{ fontSize: 9, color: '#475569' }}>
            CURRENT BEHAVIOUR IS PRESERVED
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, marginTop: 8 }}>
            Save job, Save + applied, notes, current-page context and deduplication all remain. CV
            intelligence is an additional layer, not a replacement.
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
            {['SAVE', 'APPLIED', 'NOTES', 'CV MATCH', 'IMPROVE CV', 'SAVE FOR LATER'].map((tag) => (
              <span
                key={tag}
                className="mono"
                style={{
                  fontSize: 8,
                  color: '#60a5fa',
                  border: '1px solid rgba(59,130,246,.2)',
                  padding: '3px 6px',
                  borderRadius: 3,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
        <div
          style={{
            padding: '11px 14px',
            borderBottom: '1px solid #1a2540',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div className="mono" style={{ fontSize: 9, color: '#475569' }}>
              CONNECTION TOKENS
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
              Use a separate revocable token for each browser. Your normal login password is never
              stored in the extension.
            </div>
          </div>
        </div>
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chrome on laptop"
            style={{
              padding: '8px 10px',
              background: '#111c35',
              border: '1px solid #1a2540',
              borderRadius: 4,
              color: '#e2e8f0',
            }}
          />
          <button
            disabled={busy}
            onClick={() => void create()}
            style={{
              padding: '8px 12px',
              background: '#3b82f6',
              border: 0,
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Generate token
          </button>
        </div>
        {newToken && (
          <div
            style={{
              margin: '0 14px 14px',
              padding: 12,
              background: 'rgba(6,214,160,.04)',
              border: '1px solid rgba(6,214,160,.2)',
              borderRadius: 5,
            }}
          >
            <div className="mono" style={{ fontSize: 9, color: '#06d6a0', marginBottom: 6 }}>
              COPY THIS TOKEN NOW
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <input
                readOnly
                value={newToken}
                style={{
                  flex: 1,
                  background: '#080d1c',
                  border: '1px solid #1a2540',
                  color: '#94a3b8',
                  padding: '7px 9px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                }}
              />
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(newToken);
                  toast.success('Token copied.');
                }}
                style={{
                  background: '#111c35',
                  border: '1px solid #243050',
                  color: '#94a3b8',
                  borderRadius: 4,
                }}
              >
                Copy
              </button>
            </div>
          </div>
        )}
        <div>
          {tokens.length === 0 ? (
            <div style={{ padding: 14, color: '#475569', fontSize: 11 }}>
              No browsers connected yet.
            </div>
          ) : (
            tokens.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(180px,1fr) 140px 160px 80px',
                  gap: 12,
                  padding: '10px 14px',
                  borderTop: '1px solid #1a2540',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>{t.name}</div>
                  <div className="mono" style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>
                    {t.tokenPrefix}…
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 9, color: '#64748b' }}>
                  Last used
                  <br />
                  {fmt(t.lastUsedAt)}
                </div>
                <div className="mono" style={{ fontSize: 9, color: '#64748b' }}>
                  Expires
                  <br />
                  {fmt(t.expiresAt)}
                </div>
                <button
                  disabled={Boolean(t.revokedAt)}
                  onClick={() => void revoke(t.id)}
                  style={{
                    padding: '5px 7px',
                    background: 'none',
                    border: '1px solid rgba(239,68,68,.22)',
                    color: t.revokedAt ? '#475569' : '#ef4444',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  {t.revokedAt ? 'Revoked' : 'Revoke'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="data-card" style={{ borderRadius: 6, padding: 15, marginBottom: 16 }}>
        <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 10 }}>
          LIVE EXTENSION FLOW
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7,minmax(90px,1fr))',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {[
            'Open page',
            'Detect job',
            'Extract role',
            'Choose CV',
            'Compare gaps',
            'Improve / save',
            'Apply + track',
          ].map((item, index) => (
            <div key={item} style={{ display: 'contents' }}>
              <div
                style={{
                  padding: '9px 7px',
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 4,
                  textAlign: 'center',
                  fontSize: 9,
                  color: index === 6 ? '#06d6a0' : '#94a3b8',
                }}
              >
                {item}
              </div>
              {index < 6 && <span style={{ color: '#334155', textAlign: 'center' }}>→</span>}
            </div>
          ))}
        </div>
      </div>
      {showDemo && (
        <div className="data-card" style={{ borderRadius: 8, padding: 16, overflow: 'auto' }}>
          <div style={{ marginBottom: 10 }}>
            <strong style={{ fontSize: 12, color: '#e2e8f0' }}>
              Interactive extension-state preview from the uploaded UI
            </strong>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
              This visual simulator demonstrates the states the actual Chrome/Firefox companion
              drives against the live Browser Companion API.
            </div>
          </div>
          <ExtensionFlowDemo />
        </div>
      )}
    </div>
  );
}
