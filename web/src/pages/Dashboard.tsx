import { useEffect, useMemo, useState } from 'react';

import { api } from '../api/client';
import { SmartNotificationsPanel } from '../components/SmartNotificationsPanel';
import type { JobSummary } from '../types/jobs';

interface Props {
  activeProfileId?: string;
  onNavigate: (page: string) => void;
}
interface Overview {
  jobs: number;
  listings: number;
  duplicateListings: number;
  freshJobs: number;
  oldJobs: number;
  expiredJobs: number;
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
  noResponses: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
}
interface Run {
  id: string;
  status: string;
  runType: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  listingsFound: number;
  newJobs: number;
  duplicates: number;
  source?: { name: string } | null;
  errorMessage?: string | null;
}
interface Source {
  id: string;
  collectionCapability?: string;
  health?: { status: string } | null;
}
interface ApplicationSummary {
  id: string;
  stage: string;
  lastActivityAt: string;
}

function StatCard({
  label,
  value,
  sub,
  color = '#e2e8f0',
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="data-card" style={{ padding: '16px 20px', borderRadius: 6 }}>
      <div
        className="mono"
        style={{
          fontSize: 11,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        className="num-highlight"
        style={{ fontSize: 28, fontWeight: 600, color, lineHeight: 1 }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span
        className="mono"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {title}
      </span>
      {typeof count === 'number' && (
        <span className="mono" style={{ fontSize: 10, color: '#334155' }}>
          ({count})
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: '#1a2540' }} />
      {action}
    </div>
  );
}

function human(value: string): string {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function shortDate(value?: string | null): string {
  return value
    ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '—';
}
function duration(run: Run): string {
  if (!run.startedAt) return '—';
  const end = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
  const sec = Math.max(0, Math.floor((end - new Date(run.startedAt).getTime()) / 1000));
  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

export default function Dashboard({ activeProfileId = '', onNavigate }: Props) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [unvisitedCount, setUnvisitedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const profile = activeProfileId ? `&profileId=${encodeURIComponent(activeProfileId)}` : '';
      try {
        const applicationQuery = activeProfileId
          ? `?profileId=${encodeURIComponent(activeProfileId)}`
          : '';
        const [
          overviewResponse,
          jobsResponse,
          runsResponse,
          sourcesResponse,
          unvisitedResponse,
          savedResponse,
          applicationResponse,
        ] = await Promise.all([
          api<Overview>(`/api/reports/overview?days=30${profile}`),
          api<{ jobs: JobSummary[] }>(`/api/jobs?limit=8&addedWithinDays=7${profile}`),
          api<{ runs: Run[] }>('/api/scheduler/runs?limit=16'),
          api<{ sources: Source[] }>('/api/sources'),
          api<{ pagination: { total: number } }>(`/api/jobs?limit=1&visited=false${profile}`),
          api<{ pagination: { total: number } }>(`/api/jobs?limit=1&disposition=SAVED${profile}`),
          api<{ applications: ApplicationSummary[] }>(`/api/applications${applicationQuery}`),
        ]);
        setOverview(overviewResponse);
        setJobs(jobsResponse.jobs);
        setRuns(runsResponse.runs);
        setSources(sourcesResponse.sources);
        setUnvisitedCount(unvisitedResponse.pagination.total);
        setSavedCount(savedResponse.pagination.total);
        setApplications(applicationResponse.applications);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeProfileId]);

  const activeRuns = runs.filter((run) => ['QUEUED', 'RUNNING'].includes(run.status));
  const recentRuns = runs.filter((run) => !['QUEUED', 'RUNNING'].includes(run.status)).slice(0, 6);
  const totalFound = runs.reduce((sum, run) => sum + (run.listingsFound ?? 0), 0);
  const totalNew = runs.reduce((sum, run) => sum + (run.newJobs ?? 0), 0);
  const totalDuplicates = runs.reduce((sum, run) => sum + (run.duplicates ?? 0), 0);
  const pipeline = useMemo(
    () => [
      { label: 'Fetched', count: totalFound, color: '#3b82f6' },
      { label: 'Normalized', count: totalFound, color: '#3b82f6' },
      { label: 'Duplicates', count: totalDuplicates, color: '#8b5cf6' },
      { label: 'New Jobs', count: totalNew, color: '#06d6a0' },
      { label: 'Canonical', count: overview?.jobs ?? 0, color: '#06d6a0' },
      { label: 'Listings', count: overview?.listings ?? 0, color: '#06d6a0' },
    ],
    [totalFound, totalDuplicates, totalNew, overview],
  );

  const crawlable = sources.filter((source) => source.collectionCapability === 'CRAWLABLE').length;
  const restricted = sources.filter(
    (source) => source.collectionCapability === 'RESTRICTED',
  ).length;
  const followUpCount = applications.filter(
    (application) =>
      !['REJECTED', 'WITHDRAWN', 'DECLINED', 'CLOSED', 'ACCEPTED'].includes(application.stage) &&
      Date.now() - new Date(application.lastActivityAt).getTime() >= 7 * 86_400_000,
  ).length;
  const sourceIssues = sources.filter((source) =>
    ['DEGRADED', 'UNHEALTHY', 'CHALLENGED'].includes(source.health?.status ?? ''),
  ).length;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Dashboard</h1>
          <span className="mono" style={{ fontSize: 11, color: '#334155' }}>
            {new Date().toLocaleString()}
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
          {activeProfileId
            ? 'Current search profile overview'
            : 'System overview — jobs, crawlers and applications'}
        </p>
      </div>

      <div
        className="data-card"
        style={{
          borderRadius: 6,
          padding: '11px 14px',
          marginBottom: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
          gap: 8,
        }}
      >
        {[
          ['Review queue', unvisitedCount, 'Unvisited jobs', 'jobs-all', '#60a5fa'],
          ['Saved shortlist', savedCount, 'Jobs kept for later', 'jobs-favorites', '#8b5cf6'],
          ['Follow up', followUpCount, 'Inactive applications 7+ days', 'apps-all', '#f59e0b'],
          [
            'Source issues',
            sourceIssues,
            'Degraded / challenged sources',
            'sites-all',
            sourceIssues ? '#ef4444' : '#06d6a0',
          ],
        ].map(([label, value, detail, page, color]) => (
          <button
            key={String(label)}
            onClick={() => onNavigate(String(page))}
            style={{
              textAlign: 'left',
              padding: '9px 11px',
              background: '#0a1020',
              border: '1px solid #1a2540',
              borderRadius: 5,
              cursor: 'pointer',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 9,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '.07em',
              }}
            >
              {String(label)}
            </div>
            <div
              className="mono"
              style={{ color: String(color), fontSize: 18, fontWeight: 700, marginTop: 4 }}
            >
              {String(value)}
            </div>
            <div style={{ color: '#475569', fontSize: 9, marginTop: 2 }}>{String(detail)}</div>
          </button>
        ))}
      </div>

      <SmartNotificationsPanel onNavigate={onNavigate} />

      <div className="stats-grid-4">
        <StatCard
          label="Jobs in period"
          value={loading ? '…' : (overview?.jobs ?? 0).toLocaleString()}
          sub={`${overview?.freshJobs ?? 0} fresh · ${overview?.oldJobs ?? 0} old`}
        />
        <StatCard
          label="Listings"
          value={loading ? '…' : (overview?.listings ?? 0).toLocaleString()}
          sub={`${overview?.duplicateListings ?? 0} duplicate listings`}
        />
        <StatCard
          label="Job Sources"
          value={sources.length.toLocaleString()}
          sub={`${crawlable} crawlable · ${restricted} restricted`}
        />
        <StatCard
          label="Applications"
          value={loading ? '…' : (overview?.applications ?? 0).toLocaleString()}
          sub={`${overview?.interviews ?? 0} interviewing · ${overview?.offers ?? 0} offers`}
          color="#06d6a0"
        />
      </div>

      <div className="grid-2col">
        <div>
          <SectionHeader
            title="Active Crawlers"
            count={activeRuns.length}
            action={
              <button
                onClick={() => onNavigate('crawl-sessions')}
                style={{
                  fontSize: 11,
                  color: '#3b82f6',
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                }}
              >
                View →
              </button>
            }
          />
          <div
            className="data-card"
            style={{ borderRadius: 6, overflow: 'hidden', minHeight: 160 }}
          >
            {activeRuns.length === 0 && (
              <div style={{ padding: 38, textAlign: 'center', color: '#475569', fontSize: 12 }}>
                No crawler is running right now. Scheduled sources will appear here when they start.
              </div>
            )}
            {activeRuns.map((run, index) => (
              <div
                key={run.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: index < activeRuns.length - 1 ? '1px solid #1a2540' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#cbd5e1' }}>
                      {run.source?.name ?? 'Unclassified Source'}
                    </span>
                    <span style={{ fontSize: 11, color: '#475569', marginLeft: 8 }}>
                      {human(run.runType)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span
                      className="pulse"
                      style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }}
                    />
                    <span className="mono" style={{ fontSize: 11, color: '#3b82f6' }}>
                      {human(run.status)}
                    </span>
                  </div>
                </div>
                <div
                  style={{ height: 3, background: '#111c35', borderRadius: 2, overflow: 'hidden' }}
                >
                  <div
                    className="progress-animated"
                    style={{
                      height: '100%',
                      width: run.status === 'QUEUED' ? '12%' : '62%',
                      background: '#3b82f6',
                    }}
                  />
                </div>
                <div className="mono" style={{ marginTop: 4, fontSize: 10, color: '#334155' }}>
                  {run.listingsFound ?? 0} listings · {run.newJobs ?? 0} new
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader title="Current Pipeline" />
          <div
            className="data-card"
            style={{ borderRadius: 6, padding: '16px 20px', minHeight: 160 }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {pipeline.map((item, index) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div
                      className="mono"
                      style={{ fontSize: 9, color: '#475569', marginBottom: 5 }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        margin: 'auto',
                        borderRadius: 4,
                        background: `${item.color}18`,
                        border: `1px solid ${item.color}30`,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <span
                        className="mono"
                        style={{ fontSize: 12, fontWeight: 600, color: item.color }}
                      >
                        {item.count > 999 ? `${(item.count / 1000).toFixed(1)}k` : item.count}
                      </span>
                    </div>
                  </div>
                  {index < pipeline.length - 1 && <span style={{ color: '#243050' }}>→</span>}
                </div>
              ))}
            </div>
            <div
              className="mono"
              style={{
                marginTop: 14,
                fontSize: 10,
                color: '#334155',
                borderTop: '1px solid #1a2540',
                paddingTop: 10,
              }}
            >
              {totalFound.toLocaleString()} observed → {totalNew.toLocaleString()} new ·{' '}
              {totalDuplicates.toLocaleString()} matched existing
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <SectionHeader
          title="Recent Crawl Sessions"
          count={recentRuns.length}
          action={
            <button
              onClick={() => onNavigate('crawl-history')}
              style={{
                fontSize: 11,
                color: '#3b82f6',
                background: 'none',
                border: 0,
                cursor: 'pointer',
              }}
            >
              History →
            </button>
          }
        />
        <div className="data-card table-wrap" style={{ borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
                {[
                  'Job Source',
                  'Run Type',
                  'Started',
                  'Duration',
                  'Listings',
                  'New Jobs',
                  'Status',
                ].map((heading) => (
                  <th
                    key={heading}
                    className="mono"
                    style={{
                      padding: '8px 16px',
                      textAlign: 'left',
                      fontSize: 10,
                      color: '#475569',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run, index) => (
                <tr
                  key={run.id}
                  className="tr-hover"
                  style={{
                    borderBottom: index < recentRuns.length - 1 ? '1px solid #1a2540' : 'none',
                  }}
                >
                  <td
                    style={{
                      padding: '10px 16px',
                      fontSize: 13,
                      color: '#cbd5e1',
                      fontWeight: 500,
                    }}
                  >
                    {run.source?.name ?? 'Unclassified Source'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>
                    {human(run.runType)}
                  </td>
                  <td
                    className="mono"
                    style={{ padding: '10px 16px', fontSize: 11, color: '#64748b' }}
                  >
                    {run.startedAt ? new Date(run.startedAt).toLocaleTimeString() : '—'}
                  </td>
                  <td
                    className="mono"
                    style={{ padding: '10px 16px', fontSize: 11, color: '#64748b' }}
                  >
                    {duration(run)}
                  </td>
                  <td
                    className="mono"
                    style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}
                  >
                    {run.listingsFound ?? 0}
                  </td>
                  <td
                    className="mono"
                    style={{ padding: '10px 16px', fontSize: 12, color: '#06d6a0' }}
                  >
                    +{run.newJobs ?? 0}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span
                      className={`status-${['FAILED', 'CHALLENGED', 'RATE_LIMITED'].includes(run.status) ? 'error' : run.status === 'COMPLETED' ? 'active' : 'running'}`}
                      style={{
                        fontSize: 9,
                        padding: '2px 7px',
                        borderRadius: 3,
                        border: '1px solid',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {human(run.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {recentRuns.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{ padding: 32, textAlign: 'center', color: '#475569', fontSize: 12 }}
                  >
                    No completed crawl sessions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <SectionHeader
          title="New Jobs"
          count={jobs.length}
          action={
            <button
              onClick={() => onNavigate('jobs-new')}
              style={{
                fontSize: 11,
                color: '#3b82f6',
                background: 'none',
                border: 0,
                cursor: 'pointer',
              }}
            >
              View all →
            </button>
          }
        />
        <div className="data-card table-wrap" style={{ borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
                {['Title', 'Organization', 'Job Sources', 'Freshness', 'Posted', 'Added'].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="mono"
                      style={{
                        padding: '8px 16px',
                        textAlign: 'left',
                        fontSize: 10,
                        color: '#475569',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, index) => (
                <tr
                  key={job.id}
                  className="tr-hover"
                  onClick={() => {
                    sessionStorage.setItem('jobintel-open-job', job.id);
                    onNavigate('jobs-all');
                  }}
                  style={{
                    borderBottom: index < jobs.length - 1 ? '1px solid #1a2540' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <td
                    style={{
                      padding: '10px 16px',
                      fontSize: 13,
                      color: '#e2e8f0',
                      fontWeight: 500,
                    }}
                  >
                    {job.title}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#94a3b8' }}>
                    {job.company?.name ?? 'Unknown'}
                  </td>
                  <td
                    className="mono"
                    style={{
                      padding: '10px 16px',
                      fontSize: 11,
                      color: job.listings.length > 1 ? '#3b82f6' : '#475569',
                    }}
                  >
                    {job.listings.length} listing{job.listings.length === 1 ? '' : 's'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 9,
                        padding: '2px 7px',
                        borderRadius: 3,
                        color: ['NEW', 'RECENT'].includes(job.freshnessStatus)
                          ? '#06d6a0'
                          : '#f59e0b',
                        background: ['NEW', 'RECENT'].includes(job.freshnessStatus)
                          ? 'rgba(6,214,160,0.1)'
                          : 'rgba(245,158,11,0.1)',
                      }}
                    >
                      {human(job.freshnessStatus)}
                    </span>
                  </td>
                  <td
                    className="mono"
                    style={{ padding: '10px 16px', fontSize: 11, color: '#475569' }}
                  >
                    {shortDate(job.earliestPostedAt)}
                  </td>
                  <td
                    className="mono"
                    style={{ padding: '10px 16px', fontSize: 11, color: '#475569' }}
                  >
                    {shortDate(job.firstSeenAt)}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: 32, textAlign: 'center', color: '#475569', fontSize: 12 }}
                  >
                    No jobs have entered this view yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
