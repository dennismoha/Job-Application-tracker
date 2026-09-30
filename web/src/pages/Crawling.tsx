import { useEffect, useMemo, useState } from 'react';

import { api } from '../api/client';
import { useToast } from '../components/Toast';

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
  errorMessage?: string | null;
  crawlerConfig?: { id: string; name: string } | null;
  source?: { id: string; name: string; collectionCapability?: string } | null;
}
interface Config {
  id: string;
  name: string;
  enabled: boolean;
  intervalMinutes: number;
  nextRunAt?: string | null;
  pausedUntil?: string | null;
  keywords: string[];
  locations: string[];
  subjects: string[];
  maximumPages: number;
  maximumRequests: number;
  consecutiveFailures: number;
  circuitState: string;
  _count?: { runs: number };
  source: {
    id: string;
    name: string;
    sourceType: string;
    collectionCapability: string;
    active: boolean;
    health?: { status: string } | null;
  };
}

function human(value?: string | null) {
  return (value ?? 'UNKNOWN')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
function when(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}
function duration(run: Run) {
  if (!run.startedAt) return '—';
  const end = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
  const sec = Math.max(0, Math.floor((end - new Date(run.startedAt).getTime()) / 1000));
  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
}
function badge(status?: string | null): React.CSSProperties {
  const u = (status ?? 'UNKNOWN').toUpperCase();
  const c = ['COMPLETED', 'HEALTHY', 'CRAWLABLE'].includes(u)
    ? '#06d6a0'
    : ['FAILED', 'CHALLENGED', 'RATE_LIMITED', 'UNHEALTHY'].includes(u)
      ? '#ef4444'
      : ['RUNNING', 'QUEUED'].includes(u)
        ? '#3b82f6'
        : '#f59e0b';
  return {
    fontSize: 9,
    padding: '2px 7px',
    borderRadius: 3,
    color: c,
    background: `${c}12`,
    border: `1px solid ${c}33`,
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase',
  };
}

export default function Crawling({
  filter,
  onOpenRun,
}: {
  filter: string;
  onOpenRun: (runId: string) => void;
}) {
  const toast = useToast();
  const [runs, setRuns] = useState<Run[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const [runResponse, configResponse] = await Promise.all([
        api<{ runs: Run[] }>('/api/scheduler/runs?limit=200'),
        api<{ configs: Config[] }>('/api/scheduler/configs'),
      ]);
      setRuns(runResponse.runs);
      setConfigs(configResponse.configs);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [filter]);
  const mode =
    filter === 'crawl-configs'
      ? 'configs'
      : filter === 'crawl-sessions'
        ? 'sessions'
        : filter === 'crawl-failed'
          ? 'failed'
          : 'history';
  const visibleRuns = useMemo(
    () =>
      runs.filter((run) =>
        mode === 'sessions'
          ? ['RUNNING', 'QUEUED'].includes(run.status)
          : mode === 'failed'
            ? ['FAILED', 'CHALLENGED', 'RATE_LIMITED'].includes(run.status)
            : !['RUNNING', 'QUEUED'].includes(run.status),
      ),
    [runs, mode],
  );
  const grouped = useMemo(() => {
    const map = new Map<string, { source: Config['source']; configs: Config[] }>();
    for (const config of configs) {
      const row = map.get(config.source.id) ?? { source: config.source, configs: [] };
      row.configs.push(config);
      map.set(config.source.id, row);
    }
    return [...map.values()];
  }, [configs]);
  const stats = {
    active: runs.filter((r) => ['RUNNING', 'QUEUED'].includes(r.status)).length,
    completed: runs.filter((r) => r.status === 'COMPLETED').length,
    problems: runs.filter((r) => ['FAILED', 'CHALLENGED', 'RATE_LIMITED'].includes(r.status))
      .length,
    newJobs: runs.reduce((sum, r) => sum + (r.newJobs ?? 0), 0),
  };
  async function runConfig(config: Config) {
    try {
      await api(`/api/scheduler/configs/${config.id}/run`, { method: 'POST' });
      toast.success(`${config.name} queued.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Crawler could not be queued.');
    }
  }
  async function toggle(config: Config) {
    try {
      if (config.pausedUntil)
        await api(`/api/scheduler/configs/${config.id}/resume`, { method: 'POST' });
      else
        await api(`/api/scheduler/configs/${config.id}/pause`, {
          method: 'POST',
          body: JSON.stringify({ minutes: 1440 }),
        });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Crawler could not be updated.');
    }
  }
  return (
    <div className="page-pad">
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: '#e2e8f0' }}>
            {mode === 'configs'
              ? 'Crawler Configurations'
              : mode === 'sessions'
                ? 'Active Sessions'
                : mode === 'failed'
                  ? 'Failed Crawls'
                  : 'Crawl History'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
            Crawlers belong to Job Sources. Each crawl run records the listings and canonical jobs
            it produced.
          </p>
        </div>
        <button
          onClick={() => void load()}
          style={{
            padding: '8px 14px',
            background: 'none',
            border: '1px solid #1a2540',
            borderRadius: 5,
            color: '#64748b',
            cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>
      <div className="stats-grid-4">
        {[
          ['ACTIVE', stats.active, '#3b82f6'],
          ['COMPLETED', stats.completed, '#06d6a0'],
          ['PROBLEMS', stats.problems, stats.problems ? '#ef4444' : '#64748b'],
          ['NEW JOBS', stats.newJobs, '#e2e8f0'],
        ].map(([label, value, color]) => (
          <div
            key={String(label)}
            className="data-card"
            style={{ padding: '14px 18px', borderRadius: 6 }}
          >
            <small className="mono" style={{ color: '#475569' }}>
              {label}
            </small>
            <strong
              className="num-highlight"
              style={{ display: 'block', fontSize: 24, color: String(color) }}
            >
              {value}
            </strong>
          </div>
        ))}
      </div>
      {mode === 'configs' ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {grouped.map((group) => (
            <section
              key={group.source.id}
              className="data-card"
              style={{ borderRadius: 6, overflow: 'hidden' }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #1a2540',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ color: '#e2e8f0', fontSize: 12 }}>{group.source.name}</strong>
                  <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
                    {human(group.source.sourceType)} · {human(group.source.collectionCapability)} ·{' '}
                    {human(group.source.health?.status)}
                  </div>
                </div>
                <span className="mono" style={{ fontSize: 9, color: '#64748b' }}>
                  {group.configs.length} crawler{group.configs.length === 1 ? '' : 's'}
                </span>
              </div>
              {group.configs.map((config) => (
                <div
                  key={config.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(180px,1.5fr) 100px 120px 130px 100px 170px',
                    gap: 10,
                    padding: '10px 14px',
                    borderBottom: '1px solid #1a2540',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ color: '#cbd5e1', fontSize: 11 }}>{config.name}</strong>
                    <div style={{ fontSize: 9, color: '#475569', marginTop: 3 }}>
                      {config.keywords.length ? config.keywords.join(', ') : 'All roles'}
                      {config.locations.length ? ` · ${config.locations.join(', ')}` : ''}
                    </div>
                  </div>
                  <span
                    style={badge(
                      config.enabled ? (config.pausedUntil ? 'PAUSED' : 'CRAWLABLE') : 'DISABLED',
                    )}
                  >
                    {config.enabled ? (config.pausedUntil ? 'Paused' : 'Enabled') : 'Disabled'}
                  </span>
                  <span className="mono" style={{ fontSize: 9, color: '#64748b' }}>
                    {config.intervalMinutes} min
                  </span>
                  <span className="mono" style={{ fontSize: 9, color: '#475569' }}>
                    {when(config.nextRunAt)}
                  </span>
                  <span className="mono" style={{ fontSize: 9, color: '#64748b' }}>
                    {config._count?.runs ?? 0} runs
                  </span>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button
                      onClick={() => void runConfig(config)}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(59,130,246,.1)',
                        border: '1px solid rgba(59,130,246,.25)',
                        borderRadius: 4,
                        color: '#60a5fa',
                        cursor: 'pointer',
                      }}
                    >
                      Run
                    </button>
                    <button
                      onClick={() => void toggle(config)}
                      style={{
                        padding: '4px 8px',
                        background: 'none',
                        border: '1px solid #1a2540',
                        borderRadius: 4,
                        color: '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {config.pausedUntil ? 'Resume' : 'Pause'}
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))}
          {!loading && !grouped.length && (
            <div
              className="data-card"
              style={{ padding: 40, textAlign: 'center', color: '#475569' }}
            >
              No crawler configurations yet. Create them inside a crawlable Job Source.
            </div>
          )}
        </div>
      ) : (
        <div className="data-card table-wrap" style={{ borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead>
              <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
                {[
                  'Job Source',
                  'Crawler',
                  'Type',
                  'Status',
                  'Started',
                  'Duration',
                  'Listings',
                  'New',
                  'Duplicates',
                  'Error',
                ].map((h) => (
                  <th
                    key={h}
                    className="mono"
                    style={{
                      padding: '9px 14px',
                      textAlign: 'left',
                      fontSize: 9,
                      color: '#475569',
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
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#475569' }}>
                    Loading crawl activity…
                  </td>
                </tr>
              ) : (
                visibleRuns.map((run, index) => (
                  <tr
                    key={run.id}
                    className="tr-hover"
                    onClick={() => onOpenRun(run.id)}
                    style={{
                      borderBottom: index < visibleRuns.length - 1 ? '1px solid #1a2540' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#e2e8f0' }}>
                      {run.source?.name ?? 'Unclassified Source'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 10, color: '#94a3b8' }}>
                      {run.crawlerConfig?.name ?? 'Default run'}
                    </td>
                    <td
                      className="mono"
                      style={{ padding: '10px 14px', fontSize: 9, color: '#64748b' }}
                    >
                      {human(run.runType)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={badge(run.status)}>{human(run.status)}</span>
                    </td>
                    <td
                      className="mono"
                      style={{ padding: '10px 14px', fontSize: 9, color: '#475569' }}
                    >
                      {when(run.startedAt ?? run.createdAt)}
                    </td>
                    <td
                      className="mono"
                      style={{ padding: '10px 14px', fontSize: 9, color: '#64748b' }}
                    >
                      {duration(run)}
                    </td>
                    <td
                      className="mono"
                      style={{ padding: '10px 14px', fontSize: 10, color: '#94a3b8' }}
                    >
                      {run.listingsFound ?? 0}
                    </td>
                    <td
                      className="mono"
                      style={{ padding: '10px 14px', fontSize: 10, color: '#06d6a0' }}
                    >
                      +{run.newJobs ?? 0}
                    </td>
                    <td
                      className="mono"
                      style={{ padding: '10px 14px', fontSize: 10, color: '#8b5cf6' }}
                    >
                      {run.duplicates ?? 0}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 9,
                        color: '#ef4444',
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {run.errorMessage ?? '—'}
                    </td>
                  </tr>
                ))
              )}
              {!loading && !visibleRuns.length && (
                <tr>
                  <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#475569' }}>
                    No crawl runs match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
