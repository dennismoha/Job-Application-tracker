import { useEffect, useMemo, useState } from 'react';

import { api } from '../api/client';
import { SiteWorkspacePanel } from '../components/SiteWorkspacePanel';
import { useToast } from '../components/Toast';
import type { SearchProfileSummary } from '../types/jobs';
import type { Page } from '../types/navigation';

interface Props {
  filter: 'all' | 'crawlable' | 'restricted' | 'risk';
  activeProfileId?: string;
  profiles: SearchProfileSummary[];
  onNavigate: (page: Page) => void;
  onChanged: () => void;
}
interface Source {
  id: string;
  name: string;
  baseUrl: string;
  careersUrl?: string | null;
  sourceType: string;
  collectionCapability: string;
  accessState?: string;
  systemRiskLevel?: string;
  active: boolean;
  systemOwned?: boolean;
  emailAlertsAvailable?: boolean;
  lastAuditedAt?: string | null;
  health?: { status: string } | null;
  schedule?: { nextRunAt?: string | null; lastSuccessfulRunAt?: string | null } | null;
  _count?: { listings: number; subscriptions: number; organizationLinks?: number };
}
interface SourceAnalysis {
  recommendedCapability: string;
  confidence: string;
  atsProvider?: string;
  hasApi: boolean;
  hasRss: boolean;
  hasJobPosting: boolean;
  requiresLogin: boolean;
  challengeDetected: boolean;
  emailAlertsAvailable: boolean;
  accessState: string;
}

function human(value?: string | null): string {
  return (value ?? 'UNKNOWN')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function badge(value?: string | null): React.CSSProperties {
  const upper = (value ?? 'UNKNOWN').toUpperCase();
  const color = ['HEALTHY', 'OPEN', 'CRAWLABLE', 'GREEN'].includes(upper)
    ? '#06d6a0'
    : ['RED', 'UNHEALTHY', 'BLOCKED', 'CHALLENGED'].includes(upper)
      ? '#ef4444'
      : ['YELLOW', 'ORANGE', 'DEGRADED', 'RESTRICTED', 'MANUAL_ONLY', 'EMAIL_ONLY'].includes(upper)
        ? '#f59e0b'
        : '#64748b';
  return {
    fontSize: 9,
    padding: '2px 7px',
    borderRadius: 3,
    border: `1px solid ${color}33`,
    color,
    background: `${color}12`,
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  };
}
function fmt(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

function AddSourceModal({
  onClose,
  onSaved,
  initialName = '',
  initialUrl = '',
}: {
  onClose(): void;
  onSaved(): void;
  initialName?: string;
  initialUrl?: string;
}) {
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialUrl);
  const [sourceType, setSourceType] = useState('JOB_BOARD');
  const [analysis, setAnalysis] = useState<SourceAnalysis | null>(null);
  const [verification, setVerification] = useState<any | null>(null);
  const [existingSource, setExistingSource] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function analyze() {
    if (!url) return;
    setBusy(true);
    try {
      const [v, r, a] = await Promise.all([
        api<{ verification: any }>('/api/sources/verify', {
          method: 'POST',
          body: JSON.stringify({ url }),
        }),
        api<any>('/api/sources/resolve', { method: 'POST', body: JSON.stringify({ url }) }),
        api<{ analysis: SourceAnalysis }>('/api/sources/analyze', {
          method: 'POST',
          body: JSON.stringify({ url }),
        }),
      ]);
      setVerification(v.verification);
      setExistingSource(r.source ?? null);
      setAnalysis(a.analysis);
      if (r.suggestedBaseUrl) setUrl(r.suggestedBaseUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Job Source check failed.');
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!name || !url || existingSource) return;
    setBusy(true);
    try {
      await api('/api/sources', {
        method: 'POST',
        body: JSON.stringify({
          name,
          baseUrl: url,
          careersUrl: url,
          sourceType,
          collectionCapability: analysis?.recommendedCapability,
          defaultIntervalMinutes: 1440,
          auditNow: Boolean(analysis),
        }),
      });
      toast.success('Job Source added.');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Job Source could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(7,11,20,.88)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 'min(620px,100%)',
          background: '#0d1425',
          border: '1px solid #243050',
          borderRadius: 8,
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 15 }}>Add Job Source</h3>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 12 }}>
              A Job Source is where jobs are published: LinkedIn, an employer careers page, ATS,
              recruiter or newsletter.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 0, color: '#64748b', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <label>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 9, color: '#64748b', marginBottom: 5 }}
            >
              NAME
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="LinkedIn"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: 9,
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 5,
                color: '#e2e8f0',
              }}
            />
          </label>
          <label>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 9, color: '#64748b', marginBottom: 5 }}
            >
              URL
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setAnalysis(null);
                setVerification(null);
                setExistingSource(null);
              }}
              placeholder="https://linkedin.com/jobs"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: 9,
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 5,
                color: '#e2e8f0',
              }}
            />
          </label>
          <label>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 9, color: '#64748b', marginBottom: 5 }}
            >
              SOURCE TYPE — WHAT IS IT?
            </span>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              style={{
                width: '100%',
                padding: 9,
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 5,
                color: '#94a3b8',
              }}
            >
              <option value="JOB_BOARD">Job Board</option>
              <option value="COMPANY_CAREERS">Company Careers</option>
              <option value="ORGANIZATION_WEBSITE">Organization Website</option>
              <option value="ATS">ATS</option>
              <option value="RECRUITER">Recruiter</option>
              <option value="NEWSLETTER">Newsletter</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
        </div>
        {verification && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: '#111c35',
              border: '1px solid #1a2540',
              borderRadius: 6,
            }}
          >
            <div className="mono" style={{ fontSize: 9, color: '#475569' }}>
              URL VERIFICATION
            </div>
            <div
              style={{
                marginTop: 4,
                color: verification.exists
                  ? '#06d6a0'
                  : verification.statusCode === 404 || verification.statusCode === 410
                    ? '#ef4444'
                    : '#f59e0b',
                fontSize: 11,
              }}
            >
              {verification.message}
            </div>
            {verification.redirected && (
              <div className="mono" style={{ marginTop: 5, fontSize: 9, color: '#64748b' }}>
                Final: {verification.finalUrl}
              </div>
            )}
            {existingSource && (
              <div style={{ marginTop: 7, color: '#f59e0b', fontSize: 11 }}>
                Already exists as <strong>{existingSource.name}</strong>. Use the existing Job
                Source instead of creating a duplicate.
              </div>
            )}
          </div>
        )}
        {analysis && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              background: '#111c35',
              border: '1px solid #1a2540',
              borderRadius: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div className="mono" style={{ fontSize: 9, color: '#475569' }}>
                  COLLECTION CAPABILITY — WHAT CAN JOBINTEL DO?
                </div>
                <strong style={{ display: 'block', color: '#e2e8f0', marginTop: 4 }}>
                  {human(analysis.recommendedCapability)}
                </strong>
              </div>
              <span style={badge(analysis.confidence)}>{analysis.confidence}</span>
            </div>
            <div style={{ marginTop: 8, color: '#64748b', fontSize: 10 }}>
              ATS: {analysis.atsProvider ?? 'not detected'} · Login:{' '}
              {analysis.requiresLogin ? 'yes' : 'no'} · Challenge:{' '}
              {analysis.challengeDetected ? 'observed' : 'no'} · Email alerts:{' '}
              {analysis.emailAlertsAvailable ? 'yes' : 'no'}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            onClick={() => void analyze()}
            disabled={!url || busy}
            style={{
              padding: '8px 12px',
              background: 'none',
              border: '1px solid #1a2540',
              borderRadius: 5,
              color: '#60a5fa',
              cursor: 'pointer',
            }}
          >
            {busy ? 'Checking…' : 'Analyze'}
          </button>
          <button
            onClick={() => void save()}
            disabled={!name || !url || busy || Boolean(existingSource)}
            style={{
              padding: '8px 14px',
              background: '#3b82f6',
              border: 0,
              borderRadius: 5,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Save Job Source
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobSites({
  filter,
  activeProfileId = '',
  profiles,
  onNavigate,
  onChanged,
}: Props) {
  const [sources, setSources] = useState<Source[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [pendingUrl, setPendingUrl] = useState('');
  const [profileId, setProfileId] = useState(activeProfileId || profiles[0]?.id || '');
  async function load() {
    const r = await api<{ sources: Source[] }>(
      `/api/sources${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`,
    );
    setSources(r.sources);
  }
  useEffect(() => {
    void load();
  }, [search]);
  useEffect(() => {
    if (activeProfileId) setProfileId(activeProfileId);
  }, [activeProfileId]);
  useEffect(() => {
    const id = sessionStorage.getItem('jobintel-open-site');
    if (id) {
      sessionStorage.removeItem('jobintel-open-site');
      setSelectedId(id);
    }
    const url = sessionStorage.getItem('jobintel-add-source-url');
    if (url) {
      setPendingUrl(url);
      setPendingName(sessionStorage.getItem('jobintel-add-source-name') ?? '');
      sessionStorage.removeItem('jobintel-add-source-url');
      sessionStorage.removeItem('jobintel-add-source-name');
      setAddOpen(true);
    }
  }, []);
  const filtered = useMemo(
    () =>
      sources.filter((s) => {
        if (filter === 'crawlable' && s.collectionCapability !== 'CRAWLABLE') return false;
        if (filter === 'restricted' && s.collectionCapability !== 'RESTRICTED') return false;
        if (filter === 'risk' && !['ORANGE', 'RED'].includes(s.systemRiskLevel ?? '')) return false;
        return true;
      }),
    [sources, filter],
  );
  const title =
    filter === 'crawlable'
      ? 'Crawlable Job Sources'
      : filter === 'restricted'
        ? 'Restricted Job Sources'
        : filter === 'risk'
          ? 'Risk / Scam Job Sources'
          : 'All Job Sources';
  return (
    <div style={{ padding: '28px 32px' }}>
      {selectedId && (
        <SiteWorkspacePanel
          sourceId={selectedId}
          onClose={() => {
            setSelectedId(null);
            void load();
            onChanged();
          }}
        />
      )}
      {addOpen && (
        <AddSourceModal
          initialName={pendingName}
          initialUrl={pendingUrl}
          onClose={() => {
            setAddOpen(false);
            setPendingName('');
            setPendingUrl('');
          }}
          onSaved={() => {
            setPendingName('');
            setPendingUrl('');
            void load();
            onChanged();
          }}
        />
      )}
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: '#e2e8f0' }}>{title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
            {filtered.length} Job Sources · source type describes what it is; collection capability
            describes how it can be monitored.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            style={{
              padding: '7px 10px',
              background: '#0d1425',
              border: '1px solid #1a2540',
              borderRadius: 5,
              color: '#64748b',
            }}
          >
            <option value="">No active profile</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setAddOpen(true)}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              border: 0,
              borderRadius: 5,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            + Add Job Source
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Job Sources or domains…"
          style={{
            flex: 1,
            maxWidth: 360,
            padding: '7px 12px',
            background: '#0d1425',
            border: '1px solid #1a2540',
            borderRadius: 5,
            color: '#e2e8f0',
          }}
        />
        <button
          onClick={() => onNavigate('crawl-configs')}
          style={{
            padding: '7px 14px',
            background: 'none',
            border: '1px solid #1a2540',
            borderRadius: 5,
            color: '#64748b',
            cursor: 'pointer',
          }}
        >
          View crawling →
        </button>
      </div>
      <div className="data-card table-wrap" style={{ borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
          <thead>
            <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
              {[
                'Job Source',
                'Source Type',
                'Collection Capability',
                'Health',
                'Jobs',
                'Organizations',
                'Last Success',
                'Risk',
              ].map((h) => (
                <th
                  key={h}
                  className="mono"
                  style={{
                    padding: '9px 16px',
                    textAlign: 'left',
                    color: '#475569',
                    fontSize: 9,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr
                key={s.id}
                className="tr-hover"
                onClick={() => setSelectedId(s.id)}
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid #1a2540' : 'none',
                  cursor: 'pointer',
                }}
              >
                <td style={{ padding: '10px 16px' }}>
                  <strong style={{ color: '#e2e8f0', fontSize: 12 }}>{s.name}</strong>
                  {s.systemOwned && (
                    <span className="mono" style={{ fontSize: 8, color: '#8b5cf6', marginLeft: 6 }}>
                      SYSTEM
                    </span>
                  )}
                  <div className="mono" style={{ marginTop: 3, color: '#334155', fontSize: 9 }}>
                    {s.careersUrl ?? s.baseUrl}
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={badge(s.sourceType)}>{human(s.sourceType)}</span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={badge(s.collectionCapability)}>{human(s.collectionCapability)}</span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={badge(s.health?.status)}>{human(s.health?.status)}</span>
                </td>
                <td
                  className="mono"
                  style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 11 }}
                >
                  {s._count?.listings ?? 0}
                </td>
                <td
                  className="mono"
                  style={{ padding: '10px 16px', color: '#64748b', fontSize: 11 }}
                >
                  {s._count?.organizationLinks ?? 0}
                </td>
                <td
                  className="mono"
                  style={{ padding: '10px 16px', color: '#475569', fontSize: 10 }}
                >
                  {fmt(s.schedule?.lastSuccessfulRunAt)}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={badge(s.systemRiskLevel)}>{human(s.systemRiskLevel)}</span>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#475569' }}>
                  No Job Sources match this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
