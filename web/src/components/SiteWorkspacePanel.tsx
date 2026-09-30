import { useEffect, useMemo, useState } from 'react';

import { api } from '../api/client';
import type { JobListingSummary, SourceSummary } from '../types/jobs';

type Tab =
  | 'overview'
  | 'jobs'
  | 'applications'
  | 'organizations'
  | 'crawlers'
  | 'runs'
  | 'health'
  | 'settings';

interface WorkspaceApplication {
  id: string;
  stage: string;
  appliedAt: string;
  lastActivityAt: string;
  job: { id: string; title: string; company?: { name: string } | null };
  sourceListing?: { source?: { id?: string; name: string } | null } | null;
  foundSource?: { id: string; name: string } | null;
  appliedSource?: { id: string; name: string } | null;
}
interface WorkspaceListing extends JobListingSummary {
  acquisitionRunId?: string | null;
  acquisitionMethod?: string;
  job: {
    id: string;
    title: string;
    status: string;
    freshnessStatus: string;
    company?: { name: string } | null;
    applications: Array<{ id: string; stage: string; appliedAt: string }>;
  };
}
interface OrganizationLink {
  id: string;
  isOfficial: boolean;
  verified: boolean;
  lastSeenAt: string;
  company: { id: string; name: string; country?: string | null; city?: string | null };
}
interface CrawlerConfig {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  intervalMinutes: number;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  pausedUntil?: string | null;
  keywords: string[];
  locations: string[];
  categories: string[];
  subjects: string[];
  maximumPages: number;
  maximumRequests: number;
  requestDelayMs: number;
  consecutiveFailures: number;
  circuitState: string;
  _count?: { runs: number };
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
  quarantined: number;
  errorMessage?: string | null;
  crawlerConfig?: { id: string; name: string } | null;
}
interface WorkspaceResponse {
  source: SourceSummary & {
    baseUrl?: string;
    careersUrl?: string | null;
    sourceType?: string;
    collectionCapability?: string;
    active?: boolean;
    systemOwned?: boolean;
    health?: { status: string; reason?: string | null } | null;
    _count?: { listings?: number; runs?: number; organizationLinks?: number };
  };
  listings: WorkspaceListing[];
  applications: WorkspaceApplication[];
  applicationStageCounts: Record<string, number>;
  foundStageCounts: Record<string, number>;
  appliedStageCounts: Record<string, number>;
  configs: CrawlerConfig[];
  runs: Run[];
  organizations: OrganizationLink[];
  attribution: { foundApplications: number; appliedVia: number };
}
function human(value?: string | null) {
  return (value ?? 'UNKNOWN')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
function csv(value: string) {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}
function badge(value?: string | null): React.CSSProperties {
  const u = (value ?? 'UNKNOWN').toUpperCase();
  const c = ['CRAWLABLE', 'HEALTHY', 'COMPLETED', 'GREEN'].includes(u)
    ? '#06d6a0'
    : ['FAILED', 'RED', 'SCAM', 'UNHEALTHY'].includes(u)
      ? '#ef4444'
      : ['RESTRICTED', 'CHALLENGED', 'DEGRADED', 'YELLOW', 'ORANGE'].includes(u)
        ? '#f59e0b'
        : '#64748b';
  return {
    fontSize: 9,
    padding: '2px 7px',
    borderRadius: 3,
    border: `1px solid ${c}33`,
    color: c,
    background: `${c}12`,
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase',
  };
}

export function SiteWorkspacePanel({ sourceId, onClose }: { sourceId: string; onClose(): void }) {
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [message, setMessage] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CrawlerConfig | null>(null);
  const [name, setName] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState('1440');
  const [keywords, setKeywords] = useState('');
  const [locations, setLocations] = useState('');
  const [subjects, setSubjects] = useState('');
  const [maximumPages, setMaximumPages] = useState('5');
  const [maximumRequests, setMaximumRequests] = useState('20');
  const [sourceName, setSourceName] = useState('');
  const [sourceBaseUrl, setSourceBaseUrl] = useState('');
  const [sourceType, setSourceType] = useState('OTHER');
  const [collectionCapability, setCollectionCapability] = useState('UNKNOWN');
  const [sourceBusy, setSourceBusy] = useState(false);
  async function load() {
    const next = await api<WorkspaceResponse>(`/api/sources/${sourceId}/workspace`);
    setData(next);
    setSourceName(next.source.name);
    setSourceBaseUrl(next.source.baseUrl ?? '');
    setSourceType(next.source.sourceType ?? 'OTHER');
    setCollectionCapability(next.source.collectionCapability ?? 'UNKNOWN');
  }
  useEffect(() => {
    void load();
  }, [sourceId]);
  const appliedJobs = useMemo(() => data?.applications ?? [], [data]);
  const sourceStats = useMemo(() => {
    const listings = data?.listings ?? [];
    return {
      jobs: new Set(listings.map((listing) => listing.job.id)).size,
      crawlerJobs: new Set(
        listings
          .filter((listing) => listing.acquisitionMethod === 'CRAWLER')
          .map((listing) => listing.job.id),
      ).size,
      universalJobs: new Set(
        listings
          .filter((listing) => listing.acquisitionMethod === 'UNIVERSAL_SEARCH')
          .map((listing) => listing.job.id),
      ).size,
      listings: listings.length,
    };
  }, [data]);
  const canCrawl = ['CRAWLABLE', 'SEARCH_ONLY'].includes(data?.source.collectionCapability ?? '');
  function openConfig(config?: CrawlerConfig) {
    setEditingConfig(config ?? null);
    setName(config?.name ?? '');
    setIntervalMinutes(String(config?.intervalMinutes ?? 1440));
    setKeywords(config?.keywords.join(', ') ?? '');
    setLocations(config?.locations.join(', ') ?? '');
    setSubjects(config?.subjects.join(', ') ?? '');
    setMaximumPages(String(config?.maximumPages ?? 5));
    setMaximumRequests(String(config?.maximumRequests ?? 20));
    setShowConfig(true);
  }
  async function saveConfig() {
    if (!data || !name.trim()) return;
    const body = {
      name: name.trim(),
      intervalMinutes: Number(intervalMinutes),
      keywords: csv(keywords),
      locations: csv(locations),
      subjects: csv(subjects),
      categories: editingConfig?.categories ?? [],
      maximumPages: Number(maximumPages),
      maximumRequests: Number(maximumRequests),
      requestDelayMs: editingConfig?.requestDelayMs ?? 2000,
      enabled: editingConfig?.enabled ?? true,
    };
    try {
      if (editingConfig)
        await api(`/api/scheduler/configs/${editingConfig.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      else
        await api(`/api/scheduler/sources/${data.source.id}/configs`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      setShowConfig(false);
      setMessage(editingConfig ? 'Crawler updated.' : 'Crawler created.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Crawler could not be saved.');
    }
  }
  async function runConfig(config: CrawlerConfig) {
    await api(`/api/scheduler/configs/${config.id}/run`, { method: 'POST' });
    setMessage(`${config.name} queued.`);
    await load();
  }
  async function togglePause(config: CrawlerConfig) {
    if (config.pausedUntil)
      await api(`/api/scheduler/configs/${config.id}/resume`, { method: 'POST' });
    else
      await api(`/api/scheduler/configs/${config.id}/pause`, {
        method: 'POST',
        body: JSON.stringify({ minutes: 1440 }),
      });
    await load();
  }
  async function removeConfig(config: CrawlerConfig) {
    if (!window.confirm(`Delete crawler configuration “${config.name}”?`)) return;
    await api(`/api/scheduler/configs/${config.id}`, { method: 'DELETE' });
    await load();
  }
  async function openRun(run: Run) {
    const r = await api<{ run: any }>(`/api/scheduler/runs/${run.id}`);
    setSelectedRun(r.run);
  }
  async function saveSource() {
    if (!data || data.source.systemOwned) return;
    setSourceBusy(true);
    try {
      await api(`/api/sources/${sourceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: sourceName.trim(),
          baseUrl: sourceBaseUrl.trim(),
          sourceType,
          collectionCapability,
        }),
      });
      setMessage('Job Source updated.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Job Source could not be updated.');
    } finally {
      setSourceBusy(false);
    }
  }
  async function deleteSource() {
    if (
      !data ||
      data.source.systemOwned ||
      !window.confirm(
        `Delete Job Source “${data.source.name}”? Historical sources are archived instead of destroying job/application history.`,
      )
    )
      return;
    setSourceBusy(true);
    try {
      const result = await api<{ deleted: boolean; archived: boolean; reason?: string }>(
        `/api/sources/${sourceId}`,
        { method: 'DELETE' },
      );
      window.alert(
        result.archived ? `Job Source archived. ${result.reason ?? ''}` : 'Job Source deleted.',
      );
      onClose();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Job Source could not be deleted.');
    } finally {
      setSourceBusy(false);
    }
  }
  if (!data)
    return (
      <div className="modal-backdrop">
        <section className="modal-card">
          <p>Loading Job Source workspace…</p>
        </section>
      </div>
    );
  const tabs: Array<[Tab, string]> = [
    ['overview', 'Overview'],
    ['jobs', `Jobs (${data.listings.length})`],
    ['applications', `Applications (${data.applications.length})`],
    ['organizations', `Organizations (${data.organizations.length})`],
    ['crawlers', `Crawlers (${data.configs.length})`],
    ['runs', `Runs (${data.runs.length})`],
    ['health', 'Health'],
    ['settings', 'Settings'],
  ];
  return (
    <div className="modal-backdrop site-workspace-backdrop">
      <section className="modal-card site-workspace-card">
        <header className="site-workspace-header">
          <div>
            <p className="eyebrow">Job Source workspace</p>
            <h2>{data.source.name}</h2>
            <p>{data.source.baseUrl}</p>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        {message && <p className="status-message">{message}</p>}
        <div className="site-workspace-tabs">
          {tabs.map(([k, l]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
        {tab === 'overview' && (
          <div className="site-overview-grid">
            <article className="metric-card">
              <span>Canonical jobs</span>
              <strong>{sourceStats.jobs}</strong>
              <small>{sourceStats.listings} listings</small>
            </article>
            <article className="metric-card">
              <span>Found through crawling</span>
              <strong>{sourceStats.crawlerJobs}</strong>
            </article>
            <article className="metric-card">
              <span>Found through Universal Search</span>
              <strong>{sourceStats.universalJobs}</strong>
            </article>
            <article className="metric-card">
              <span>Applications from discoveries</span>
              <strong>{data.attribution.foundApplications}</strong>
            </article>
            <article className="metric-card">
              <span>Applications submitted here</span>
              <strong>{data.attribution.appliedVia}</strong>
            </article>
            <article className="metric-card">
              <span>Organizations</span>
              <strong>{data.organizations.length}</strong>
            </article>
            <section className="panel-card">
              <h3>Outcomes · jobs found via this source</h3>
              {Object.entries(data.foundStageCounts).map(([stage, count]) => (
                <div
                  key={stage}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderTop: '1px solid #1a2540',
                    fontSize: 10,
                  }}
                >
                  <span>{human(stage)}</span>
                  <strong>{count}</strong>
                </div>
              ))}
              {!Object.keys(data.foundStageCounts).length && (
                <p className="muted">No applications from discoveries on this Job Source yet.</p>
              )}
            </section>
            <section className="panel-card">
              <h3>Outcomes · applications submitted here</h3>
              {Object.entries(data.appliedStageCounts).map(([stage, count]) => (
                <div
                  key={stage}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderTop: '1px solid #1a2540',
                    fontSize: 10,
                  }}
                >
                  <span>{human(stage)}</span>
                  <strong>{count}</strong>
                </div>
              ))}
              {!Object.keys(data.appliedStageCounts).length && (
                <p className="muted">No applications were submitted through this Job Source yet.</p>
              )}
            </section>
            <section className="panel-card">
              <h3>Source classification</h3>
              <p>
                Source type: <strong>{human(data.source.sourceType)}</strong>
              </p>
              <p>
                Collection capability: <strong>{human(data.source.collectionCapability)}</strong>
              </p>
              <p>
                Health: <strong>{human(data.source.health?.status)}</strong>
              </p>
              <p className="muted">
                Source type answers what this source is. Collection capability answers how JobIntel
                can monitor it.
              </p>
            </section>
          </div>
        )}
        {tab === 'jobs' && (
          <div className="source-table">
            <div className="source-table-row header">
              <span>Job</span>
              <span>Acquisition</span>
              <span>Freshness</span>
              <span>Application</span>
              <span>Status</span>
            </div>
            {data.listings.map((l) => (
              <div className="source-table-row" key={l.id}>
                <span>
                  <strong>{l.job.title}</strong>
                  <small>{l.job.company?.name ?? 'Organization unknown'}</small>
                </span>
                <span>
                  <span style={badge(l.acquisitionMethod)}>{human(l.acquisitionMethod)}</span>
                </span>
                <span>{human(l.job.freshnessStatus)}</span>
                <span>
                  {l.job.applications[0]?.stage
                    ? human(l.job.applications[0].stage)
                    : 'Not applied'}
                </span>
                <span>{human(l.job.status)}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'applications' && (
          <div className="source-table">
            <div className="source-table-row header">
              <span>Job</span>
              <span>Stage</span>
              <span>Applied</span>
              <span>Found via</span>
              <span>Applied via</span>
            </div>
            {appliedJobs.map((a) => (
              <div className="source-table-row" key={a.id}>
                <span>
                  <strong>{a.job.title}</strong>
                  <small>{a.job.company?.name ?? 'Organization unknown'}</small>
                </span>
                <span>{human(a.stage)}</span>
                <span>{new Date(a.appliedAt).toLocaleDateString()}</span>
                <span>
                  {a.foundSource?.name ?? a.sourceListing?.source?.name ?? 'Unclassified'}
                </span>
                <span>
                  {a.appliedSource?.name ?? a.sourceListing?.source?.name ?? 'Unclassified'}
                </span>
              </div>
            ))}
          </div>
        )}
        {tab === 'organizations' && (
          <div className="source-table">
            <div className="source-table-row header">
              <span>Organization</span>
              <span>Location</span>
              <span>Relationship</span>
              <span>Verified</span>
              <span>Last seen</span>
            </div>
            {data.organizations.map((link) => (
              <div className="source-table-row" key={link.id}>
                <span>
                  <strong>{link.company.name}</strong>
                </span>
                <span>
                  {[link.company.city, link.company.country].filter(Boolean).join(', ') || '—'}
                </span>
                <span>{link.isOfficial ? 'Official source' : 'Publishes here'}</span>
                <span>{link.verified ? 'Yes' : 'No'}</span>
                <span>{new Date(link.lastSeenAt).toLocaleDateString()}</span>
              </div>
            ))}
            {!data.organizations.length && (
              <p className="muted">No organizations have been linked to this source yet.</p>
            )}
          </div>
        )}
        {tab === 'crawlers' && (
          <section className="panel-card">
            <div className="section-title-row">
              <div>
                <h3>Crawler configurations</h3>
                <p className="muted">
                  Crawlers belong to the Job Source. A crawlable source can have several
                  role/location configurations.
                </p>
              </div>
              <button className="primary" disabled={!canCrawl} onClick={() => openConfig()}>
                + New crawler
              </button>
            </div>
            {!canCrawl && (
              <p className="status-message">
                This Job Source is {human(data.source.collectionCapability)}. Direct crawler
                configurations are unavailable; use the supported acquisition methods instead.
              </p>
            )}
            {data.configs.map((config) => (
              <article className="crawler-config-card" key={config.id}>
                <div>
                  <strong>{config.name}</strong>
                  <small>
                    {config.enabled ? 'Enabled' : 'Disabled'} · every {config.intervalMinutes} min ·{' '}
                    {human(config.circuitState)}
                  </small>
                  <p>
                    {config.keywords.length
                      ? `Keywords: ${config.keywords.join(', ')}`
                      : 'No keyword restriction'}
                    {config.locations.length ? ` · Locations: ${config.locations.join(', ')}` : ''}
                  </p>
                </div>
                <div className="table-actions">
                  <button onClick={() => void runConfig(config)}>Run now</button>
                  <button onClick={() => void togglePause(config)}>
                    {config.pausedUntil ? 'Resume' : 'Pause'}
                  </button>
                  <button onClick={() => openConfig(config)}>Edit</button>
                  <button onClick={() => void removeConfig(config)}>Delete</button>
                </div>
              </article>
            ))}
            {!data.configs.length && (
              <p className="muted">No crawler configurations for this Job Source.</p>
            )}
          </section>
        )}
        {tab === 'runs' && (
          <div className="source-table">
            <div className="source-table-row header">
              <span>Crawler</span>
              <span>Status</span>
              <span>Listings</span>
              <span>New jobs</span>
              <span>Started</span>
            </div>
            {data.runs.map((run) => (
              <button
                className="source-table-row source-run-button"
                key={run.id}
                onClick={() => void openRun(run)}
              >
                <span>{run.crawlerConfig?.name ?? 'Default source run'}</span>
                <span>{human(run.status)}</span>
                <span>{run.listingsFound}</span>
                <span>{run.newJobs}</span>
                <span>{new Date(run.startedAt ?? run.createdAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
        {tab === 'health' && (
          <section className="panel-card">
            <h3>Job Source health</h3>
            <p>
              Status: <strong>{human(data.source.health?.status)}</strong>
            </p>
            <p>{data.source.health?.reason ?? 'No current health warning.'}</p>
            <p className="muted">
              Failed, challenged and rate-limited runs remain visible in Runs.
            </p>
          </section>
        )}
        {tab === 'settings' && (
          <section className="panel-card">
            <div className="section-title-row">
              <div>
                <h3>Edit Job Source</h3>
                <p className="muted">
                  Names do not have to be unique. The normalized source domain does.
                </p>
              </div>
              {data.source.systemOwned && <span style={badge('SYSTEM')}>Protected</span>}
            </div>
            <label>
              Name
              <input
                disabled={data.source.systemOwned}
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
            </label>
            <label>
              Base URL
              <input
                disabled={data.source.systemOwned}
                type="url"
                value={sourceBaseUrl}
                onChange={(e) => setSourceBaseUrl(e.target.value)}
              />
            </label>
            <div className="two-column-page">
              <label>
                Source type
                <select
                  disabled={data.source.systemOwned}
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
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
              <label>
                Collection capability
                <select
                  disabled={data.source.systemOwned}
                  value={collectionCapability}
                  onChange={(e) => setCollectionCapability(e.target.value)}
                >
                  <option>CRAWLABLE</option>
                  <option>RESTRICTED</option>
                  <option>MANUAL_ONLY</option>
                  <option>EMAIL_ONLY</option>
                  <option>SEARCH_ONLY</option>
                  <option>UNKNOWN</option>
                  <option>DISABLED</option>
                </select>
              </label>
            </div>
            <div className="action-row">
              <button
                className="primary"
                disabled={
                  data.source.systemOwned ||
                  sourceBusy ||
                  !sourceName.trim() ||
                  !sourceBaseUrl.trim()
                }
                onClick={() => void saveSource()}
              >
                {sourceBusy ? 'Saving…' : 'Save source changes'}
              </button>
              <button
                disabled={data.source.systemOwned || sourceBusy}
                onClick={() => void deleteSource()}
                style={{ color: '#ef4444' }}
              >
                Delete Job Source
              </button>
            </div>
            <p className="muted">
              If jobs, crawl runs, organizations or applications already reference this source,
              Delete safely archives it instead of destroying history.
            </p>
          </section>
        )}
        {showConfig && (
          <div className="nested-modal">
            <div className="panel-card">
              <div className="section-title-row">
                <h3>{editingConfig ? 'Edit crawler' : 'New crawler'}</h3>
                <button onClick={() => setShowConfig(false)}>Close</button>
              </div>
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <div className="two-column-page">
                <label>
                  Interval minutes
                  <input
                    type="number"
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(e.target.value)}
                  />
                </label>
                <label>
                  Maximum pages
                  <input
                    type="number"
                    value={maximumPages}
                    onChange={(e) => setMaximumPages(e.target.value)}
                  />
                </label>
                <label>
                  Maximum requests
                  <input
                    type="number"
                    value={maximumRequests}
                    onChange={(e) => setMaximumRequests(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Keywords / roles
                <input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
              </label>
              <label>
                Subjects
                <input value={subjects} onChange={(e) => setSubjects(e.target.value)} />
              </label>
              <label>
                Locations
                <input value={locations} onChange={(e) => setLocations(e.target.value)} />
              </label>
              <div className="action-row">
                <button className="primary" onClick={() => void saveConfig()}>
                  Save crawler
                </button>
                <button onClick={() => setShowConfig(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {selectedRun && (
          <div className="nested-modal">
            <div className="panel-card run-detail-card">
              <div className="section-title-row">
                <div>
                  <h3>{selectedRun.crawlerConfig?.name ?? 'Crawl run'}</h3>
                  <p className="muted">{selectedRun.id}</p>
                </div>
                <button onClick={() => setSelectedRun(null)}>Close</button>
              </div>
              <dl className="job-facts">
                <div>
                  <dt>Status</dt>
                  <dd>{human(selectedRun.status)}</dd>
                </div>
                <div>
                  <dt>Listings</dt>
                  <dd>{selectedRun.listingsFound}</dd>
                </div>
                <div>
                  <dt>New jobs</dt>
                  <dd>{selectedRun.newJobs}</dd>
                </div>
                <div>
                  <dt>Duplicates</dt>
                  <dd>{selectedRun.duplicates}</dd>
                </div>
              </dl>
              <h3>Jobs from this run</h3>
              {selectedRun.listings?.map((listing: any) => (
                <div className="source-row" key={listing.id}>
                  <div>
                    <strong>{listing.job.title}</strong>
                    <small>
                      {listing.job.company?.name ?? 'Organization unknown'} ·{' '}
                      {listing.job.applications?.[0]?.stage ?? 'Not applied'}
                    </small>
                  </div>
                </div>
              ))}
              {!selectedRun.listings?.length && (
                <p className="muted">No listings were attached to this run.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
