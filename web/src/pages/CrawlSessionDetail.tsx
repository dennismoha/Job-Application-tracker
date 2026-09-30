import { useEffect, useState } from 'react';

import { api } from '../api/client';
import { Breadcrumbs } from '../components/UI';

interface Run {
  id: string;
  status: string;
  runType: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  scheduledFor?: string | null;
  pagesRequested: number;
  listingsFound: number;
  newListings: number;
  updatedListings: number;
  unchangedListings: number;
  newJobs: number;
  duplicates: number;
  quarantined: number;
  httpStatus?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: unknown;
  source?: { id: string; name: string; collectionCapability?: string } | null;
}
function human(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function when(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}
export default function CrawlSessionDetail({
  runId,
  onBack,
}: {
  runId: string | null;
  onBack: () => void;
}) {
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const response = await api<{ runs: Run[] }>('/api/scheduler/runs?limit=200');
        setRun(response.runs.find((item) => item.id === runId) ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [runId]);
  return (
    <div className="page-pad">
      <Breadcrumbs items={[{ label: 'Crawling', onClick: onBack }, { label: 'Session detail' }]} />
      {loading ? (
        <div style={{ color: '#475569' }}>Loading session…</div>
      ) : !run ? (
        <div
          className="data-card"
          style={{ padding: 40, borderRadius: 6, textAlign: 'center', color: '#475569' }}
        >
          This crawl session is no longer in the recent run window.
        </div>
      ) : (
        <>
          <div className="page-header">
            <div>
              <h1 style={{ margin: 0, fontSize: 20, color: '#e2e8f0' }}>
                {run.source?.name ?? 'Unclassified Source'}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
                {human(run.runType)} · {run.id}
              </p>
            </div>
            <span
              style={{
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 3,
                border: '1px solid #1a2540',
                color: ['FAILED', 'CHALLENGED', 'RATE_LIMITED'].includes(run.status)
                  ? '#ef4444'
                  : run.status === 'COMPLETED'
                    ? '#06d6a0'
                    : '#3b82f6',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {human(run.status)}
            </span>
          </div>
          <div className="stats-grid-4">
            {[
              ['Listings', run.listingsFound],
              ['New jobs', run.newJobs],
              ['Duplicates', run.duplicates],
              ['Quarantined', run.quarantined],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="data-card"
                style={{ padding: '16px 20px', borderRadius: 6 }}
              >
                <small className="mono" style={{ color: '#475569' }}>
                  {String(label).toUpperCase()}
                </small>
                <strong
                  className="num-highlight"
                  style={{ display: 'block', fontSize: 25, color: '#e2e8f0' }}
                >
                  {String(value ?? 0)}
                </strong>
              </div>
            ))}
          </div>
          <div className="grid-2col">
            <section className="data-card" style={{ padding: 18, borderRadius: 6 }}>
              <h3 className="mono" style={{ margin: '0 0 14px', fontSize: 11, color: '#94a3b8' }}>
                TIMING
              </h3>
              {[
                ['Scheduled', when(run.scheduledFor)],
                ['Created', when(run.createdAt)],
                ['Started', when(run.startedAt)],
                ['Finished', when(run.finishedAt)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '7px 0',
                    borderBottom: '1px solid #1a2540',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
                  <span className="mono" style={{ fontSize: 10, color: '#94a3b8' }}>
                    {value}
                  </span>
                </div>
              ))}
            </section>
            <section className="data-card" style={{ padding: 18, borderRadius: 6 }}>
              <h3 className="mono" style={{ margin: '0 0 14px', fontSize: 11, color: '#94a3b8' }}>
                OUTPUT
              </h3>
              {[
                ['Pages requested', run.pagesRequested],
                ['New listings', run.newListings],
                ['Updated listings', run.updatedListings],
                ['Unchanged listings', run.unchangedListings],
                ['HTTP status', run.httpStatus ?? '—'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '7px 0',
                    borderBottom: '1px solid #1a2540',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
                  <span className="mono" style={{ fontSize: 10, color: '#94a3b8' }}>
                    {String(value ?? 0)}
                  </span>
                </div>
              ))}
            </section>
          </div>
          {run.errorMessage && (
            <section
              style={{
                background: 'rgba(239,68,68,.08)',
                border: '1px solid rgba(239,68,68,.25)',
                borderRadius: 6,
                padding: 16,
              }}
            >
              <strong style={{ color: '#ef4444', fontSize: 12 }}>
                {run.errorCode ?? 'Run error'}
              </strong>
              <p style={{ color: '#fca5a5', fontSize: 12, lineHeight: 1.55, marginBottom: 0 }}>
                {run.errorMessage}
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
