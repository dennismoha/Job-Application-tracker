import { EmptyState } from '../../components/UI';
import type { DiscoveryData } from './interface';
import { human } from './helpers';

interface EmailTabProps extends Pick<DiscoveryData, 'emails' | 'loading' | 'refresh'> {
  onExtract: (id: string) => Promise<void>;
  onAcknowledge: (id: string, label: 'RECENT' | 'OLD' | 'MIXED') => Promise<void>;
}

/** Lists received job-alert emails and exposes extraction, freshness labels, and refresh. */
export function EmailTab({ emails, loading, refresh, onExtract, onAcknowledge }: EmailTabProps) {
  return (
<div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #1a2540',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong style={{ color: '#e2e8f0', fontSize: 13 }}>Email discoveries</strong>
            <div style={{ color: '#475569', fontSize: 10, marginTop: 3 }}>
              Alert emails received through n8n. Structured jobs are ingested immediately;
              ambiguous messages can use the optional AI extractor.
            </div>
          </div>
          <button
            onClick={() => void refresh()}
            style={{
              border: '1px solid #1a2540',
              background: '#111c35',
              color: '#64748b',
              borderRadius: 4,
              padding: '6px 9px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <div style={{ padding: 30, color: '#475569', fontSize: 11 }}>Loading email alerts…</div>
        ) : emails.length === 0 ? (
          <EmptyState
            icon="✉"
            title="No email alerts received yet"
            desc="Connect your job-alert inbox through the n8n webhook. Incoming alerts will appear here with freshness and extraction status."
          />
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #1a2540',
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) 110px 110px 230px',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ fontSize: 12, color: '#cbd5e1' }}>
                  {email.subject ?? '(no subject)'}
                </strong>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
                  {email.sender ?? 'Unknown sender'} · {email.source?.name ?? 'Email Alerts'} ·{' '}
                  {new Date(email.receivedAt).toLocaleString()}
                </div>
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 9,
                  color:
                    email.freshness === 'RECENT'
                      ? '#06d6a0'
                      : email.freshness === 'OLD'
                        ? '#f59e0b'
                        : '#8b5cf6',
                }}
              >
                {human(email.freshness)}
              </span>
              <span className="mono" style={{ fontSize: 10, color: '#94a3b8' }}>
                {email.jobCount} job{email.jobCount === 1 ? '' : 's'}
              </span>
              <div
                style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', flexWrap: 'wrap' }}
              >
                {email.jobCount === 0 && (
                  <button
                    onClick={() => void onExtract(email.id)}
                    style={{
                      padding: '5px 8px',
                      background: 'rgba(139,92,246,.12)',
                      border: '1px solid rgba(139,92,246,.25)',
                      color: '#a78bfa',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 10,
                    }}
                  >
                    Extract with AI
                  </button>
                )}
                <button
                  onClick={() => void onAcknowledge(email.id, 'RECENT')}
                  style={{
                    padding: '5px 8px',
                    background: 'none',
                    border: '1px solid #1a2540',
                    color: '#06d6a0',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 10,
                  }}
                >
                  Recent
                </button>
                <button
                  onClick={() => void onAcknowledge(email.id, 'OLD')}
                  style={{
                    padding: '5px 8px',
                    background: 'none',
                    border: '1px solid #1a2540',
                    color: '#f59e0b',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 10,
                  }}
                >
                  Old
                </button>
              </div>
            </div>
          ))
        )}
      </div>
  );
}
