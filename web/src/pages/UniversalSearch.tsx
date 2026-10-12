import { FormEvent, useEffect, useMemo, useState } from 'react';

import { api } from '../api/client';
import { EmptyState } from '../components/UI';
import { useToast } from '../components/Toast';
import type { SearchProfileSummary, SourceSummary } from '../types/jobs';
import type { Page } from '../types/navigation';

interface SearchResult {
  title?: string;
  link?: string;
  url?: string;
  snippet?: string;
  domain?: string;
}
interface IngestionSummary {
  newJobs?: number;
  duplicates?: number;
  quarantined?: number;
  newListings?: number;
  updatedListings?: number;
}
interface SearchResponse {
  query: string;
  results: SearchResult[];
  domains: string[];
  knownSources: Array<{ id: string; name: string; baseUrl?: string }>;
  ingestion:
    | IngestionSummary
    | Array<{ status?: string; jobId?: string; sourceUrl?: string; message?: string }>;
}
interface EmailItem {
  id: string;
  subject?: string | null;
  sender?: string | null;
  receivedAt: string;
  processedAt?: string | null;
  freshness: string;
  jobCount: number;
  recentFolderAssigned?: boolean;
  oldFolderAssigned?: boolean;
  source?: { id: string; name: string } | null;
}
interface Batch {
  id: string;
  name: string;
  description?: string | null;
  items: Array<{ id: string; enabled: boolean; source: SourceSummary }>;
}

type Tab = 'web' | 'email' | 'batches' | 'browser';

function human(value: string): string {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ingestionValue(response: SearchResponse | null, key: keyof IngestionSummary): number {
  if (!response || Array.isArray(response.ingestion)) return 0;
  return response.ingestion[key] ?? 0;
}

function sourceRoot(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return value;
  }
}

export default function UniversalSearch({
  activeProfileId,
  profiles,
  onNavigate,
}: {
  activeProfileId: string;
  profiles: SearchProfileSummary[];
  onNavigate: (page: Page) => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('web');
  const [keywords, setKeywords] = useState('');
  const [skills, setSkills] = useState('');
  const [location, setLocation] = useState('');
  const [experience, setExperience] = useState('Any');
  const [countryCode, setCountryCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [batchName, setBatchName] = useState('Manual source batch');
  const [batchDescription, setBatchDescription] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  const query = useMemo(
    () =>
      [experience !== 'Any' ? experience : '', keywords, skills, location]
        .filter(Boolean)
        .join(' ')
        .trim(),
    [experience, keywords, skills, location],
  );

  async function loadDiscovery() {
    setDiscoveryLoading(true);
    try {
      const [emailResponse, batchResponse, sourceResponse] = await Promise.all([
        api<{ emails: EmailItem[] }>('/api/email-ingestions'),
        api<{ batches: Batch[] }>('/api/source-batches'),
        api<{ sources: SourceSummary[] }>('/api/sources'),
      ]);
      setEmails(emailResponse.emails);
      setBatches(batchResponse.batches);
      setSources(sourceResponse.sources);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Discovery tools could not be loaded.');
    } finally {
      setDiscoveryLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== 'web') void loadDiscovery();
  }, [tab]);

  function useProfile() {
    if (!activeProfile) {
      toast.warn('Choose an active search profile first.');
      return;
    }
    const categoryNames = activeProfile.categories?.map((category) => category.name) ?? [];
    setKeywords(activeProfile.keywords.join(' '));
    setSkills(categoryNames.join(' '));
    setLocation(activeProfile.locations.join(' ') || activeProfile.countries.join(' '));
    const firstCountry = activeProfile.countries[0];
    if (firstCountry?.length === 2) setCountryCode(firstCountry.toUpperCase());
    toast.success(`Search filled from ${activeProfile.name}.`);
  }

  async function runSearch() {
    if (query.length < 3) {
      toast.warn('Add a role, skill or location before searching.');
      return;
    }
    setSearching(true);
    setError('');
    try {
      const result = await api<SearchResponse>('/api/search', {
        method: 'POST',
        body: JSON.stringify({
          query,
          ...(activeProfileId ? { profileId: activeProfileId } : {}),
          ...(countryCode.trim()
            ? { countryCode: countryCode.trim().slice(0, 2).toUpperCase() }
            : {}),
          languageCode: 'en',
          limit: 20,
        }),
      });
      setResponse(result);
      toast.success(`Search completed. ${result.results.length} candidates inspected.`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Search failed.';
      setError(message);
      toast.error(message);
    } finally {
      setSearching(false);
    }
  }

  async function extractEmail(id: string) {
    try {
      const result = await api<{ jobsExtracted: number }>(
        '/api/ai/email-ingestions/' + id + '/extract',
        { method: 'POST' },
      );
      toast.success(
        `${result.jobsExtracted} job${result.jobsExtracted === 1 ? '' : 's'} extracted from the email.`,
      );
      await loadDiscovery();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Email extraction failed.');
    }
  }

  async function acknowledgeEmail(id: string, label: 'RECENT' | 'OLD' | 'MIXED') {
    try {
      await api(`/api/email-ingestions/${id}/label-acknowledged`, {
        method: 'POST',
        body: JSON.stringify({ label }),
      });
      toast.success(`Email marked ${human(label)}.`);
      await loadDiscovery();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Email could not be updated.');
    }
  }

  async function createBatch(event: FormEvent) {
    event.preventDefault();
    if (!batchName.trim() || selectedSourceIds.length === 0) {
      toast.warn('Give the batch a name and select at least one source.');
      return;
    }
    try {
      await api('/api/source-batches', {
        method: 'POST',
        body: JSON.stringify({
          name: batchName.trim(),
          ...(batchDescription.trim() ? { description: batchDescription.trim() } : {}),
          sourceIds: selectedSourceIds,
        }),
      });
      setSelectedSourceIds([]);
      setBatchDescription('');
      toast.success('Manual source batch created.');
      await loadDiscovery();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Batch could not be created.');
    }
  }

  async function runBatch(batchId: string) {
    try {
      const result = await api<{ queued: unknown[] }>(`/api/source-batches/${batchId}/run`, {
        method: 'POST',
      });
      toast.success(
        `${result.queued.length} source run${result.queued.length === 1 ? '' : 's'} queued.`,
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Batch could not be queued.');
    }
  }

  async function deleteBatch(batchId: string) {
    try {
      await api(`/api/source-batches/${batchId}`, { method: 'DELETE' });
      toast.success('Batch removed.');
      await loadDiscovery();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Batch could not be removed.');
    }
  }

  const ingested = ingestionValue(response, 'newJobs');
  const duplicates = ingestionValue(response, 'duplicates');
  const quarantined = ingestionValue(response, 'quarantined');
  const known = response?.knownSources.length ?? 0;

  const tabs: Array<[Tab, string, string]> = [
    ['web', 'Web Search', 'Search beyond monitored sources'],
    ['email', 'Email Alerts', 'Process n8n / inbox discoveries'],
    ['batches', 'Manual Batches', 'Run selected sources together'],
    ['browser', 'Browser Capture', 'Continue from a job you are viewing'],
  ];

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 18 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: '#e2e8f0',
            letterSpacing: '-0.02em',
          }}
        >
          Universal Search
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
          Every discovery route feeds the same ingestion, freshness and deduplication engine.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {tabs.map(([key, label, description]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            title={description}
            style={{
              padding: '7px 11px',
              border: `1px solid ${tab === key ? '#3b82f6' : '#1a2540'}`,
              background: tab === key ? 'rgba(59,130,246,.12)' : '#0d1425',
              color: tab === key ? '#60a5fa' : '#64748b',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'web' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 330px) minmax(0, 1fr)',
            gap: 24,
            alignItems: 'start',
          }}
        >
          <div
            className="data-card"
            style={{ borderRadius: 6, padding: 20, position: 'sticky', top: 20 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Search Parameters
              </div>
              <button
                disabled={!activeProfile}
                onClick={useProfile}
                style={{
                  border: 0,
                  background: 'none',
                  color: activeProfile ? '#60a5fa' : '#334155',
                  fontSize: 10,
                  cursor: activeProfile ? 'pointer' : 'default',
                }}
              >
                Use active profile
              </button>
            </div>
            {[
              ['Keywords', keywords, setKeywords, 'Math Teacher, Backend Engineer...'],
              ['Skills / Subjects', skills, setSkills, 'Mathematics, Chemistry, React...'],
              ['Location', location, setLocation, 'Dubai, Remote, Nairobi...'],
            ].map(([label, value, setter, placeholder]) => (
              <label key={label as string} style={{ display: 'block', marginBottom: 14 }}>
                <span
                  className="mono"
                  style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 6 }}
                >
                  {String(label).toUpperCase()}
                </span>
                <input
                  value={value as string}
                  onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                  placeholder={placeholder as string}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#111c35',
                    border: '1px solid #1a2540',
                    borderRadius: 5,
                    color: '#e2e8f0',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
              </label>
            ))}
            <div style={{ marginBottom: 14 }}>
              <span
                className="mono"
                style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 6 }}
              >
                EXPERIENCE
              </span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['Any', 'Junior', 'Mid', 'Senior', 'Staff'].map((item) => (
                  <button
                    key={item}
                    onClick={() => setExperience(item)}
                    style={{
                      padding: '5px 8px',
                      background: experience === item ? 'rgba(59,130,246,.14)' : 'transparent',
                      border: `1px solid ${experience === item ? '#3b82f6' : '#1a2540'}`,
                      color: experience === item ? '#60a5fa' : '#64748b',
                      borderRadius: 4,
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span
                className="mono"
                style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 6 }}
              >
                COUNTRY CODE (OPTIONAL)
              </span>
              <input
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                placeholder="AE"
                maxLength={2}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                  color: '#e2e8f0',
                  fontSize: 12,
                  outline: 'none',
                  textTransform: 'uppercase',
                }}
              />
            </label>
            <div
              style={{
                padding: '10px 12px',
                border: '1px solid #1a2540',
                background: '#111c35',
                borderRadius: 5,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {activeProfile
                  ? `Active profile: ${activeProfile.name}`
                  : 'Searching across your general workspace'}
              </div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
                Accepted candidates enter your normal job inbox. Known jobs are attached as
                additional listings instead of duplicated.
              </div>
            </div>
            <button
              onClick={() => void runSearch()}
              disabled={searching}
              style={{
                width: '100%',
                padding: 10,
                background: searching ? '#1a2540' : '#3b82f6',
                border: 0,
                borderRadius: 5,
                color: searching ? '#64748b' : '#fff',
                fontWeight: 600,
                cursor: searching ? 'default' : 'pointer',
              }}
            >
              {searching ? '⟳ Searching the web…' : '⊕ Search the web'}
            </button>
            {error && (
              <div style={{ marginTop: 10, fontSize: 11, color: '#ef4444', lineHeight: 1.4 }}>
                {error}
              </div>
            )}
          </div>

          <div>
            {!response && !searching && (
              <EmptyState
                icon="⊕"
                title="Search beyond your monitored sites"
                desc="Use this when the sources you already monitor are not enough. Search results still pass through normalization, freshness checks and deduplication."
              />
            )}
            {searching && (
              <div style={{ display: 'grid', gap: 8 }}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="data-card"
                    style={{
                      borderRadius: 6,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      className="pulse"
                      style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6' }}
                    />
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Searching and validating candidates…
                    </span>
                  </div>
                ))}
              </div>
            )}
            {response && !searching && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5,minmax(0,1fr))',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  {[
                    ['Candidates', response.results.length, '#e2e8f0'],
                    ['New jobs', ingested, '#06d6a0'],
                    ['Matched existing', duplicates, '#8b5cf6'],
                    ['Needs review', quarantined, '#f59e0b'],
                    ['Known sources', known, '#3b82f6'],
                  ].map(([label, value, color]) => (
                    <div
                      key={String(label)}
                      className="data-card"
                      style={{ borderRadius: 6, padding: '14px 16px' }}
                    >
                      <div
                        className="mono"
                        style={{
                          fontSize: 9,
                          color: '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '.08em',
                        }}
                      >
                        {label}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 24,
                          color: String(color),
                          fontWeight: 700,
                          marginTop: 6,
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #1a2540',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      className="mono"
                      style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}
                    >
                      Search Results
                    </span>
                    <button
                      onClick={() => onNavigate('jobs-new')}
                      style={{
                        border: 0,
                        background: 'none',
                        color: '#60a5fa',
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      Review accepted jobs →
                    </button>
                  </div>
                  {response.results.length === 0 ? (
                    <EmptyState
                      title="No candidates returned"
                      desc="Try a broader query or remove some constraints."
                    />
                  ) : (
                    response.results.map((result, index) => {
                      const href = result.link ?? result.url ?? '';
                      const domain =
                        result.domain ??
                        (() => {
                          try {
                            return new URL(href).hostname;
                          } catch {
                            return 'Unclassified Source';
                          }
                        })();
                      return (
                        <div
                          key={`${href}-${index}`}
                          style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid #1a2540',
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0,1fr) 130px',
                            gap: 16,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                color: '#e2e8f0',
                                fontWeight: 600,
                                marginBottom: 3,
                              }}
                            >
                              {result.title ?? 'Untitled result'}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                              {result.snippet ?? 'No preview available.'}
                            </div>
                            <div
                              className="mono"
                              style={{ fontSize: 9, color: '#334155', marginTop: 6 }}
                            >
                              {domain}
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            <button
                              onClick={() => {
                                sessionStorage.setItem('jobintel-add-source-url', sourceRoot(href));
                                sessionStorage.setItem('jobintel-add-source-name', domain);
                                onNavigate('sites-all');
                              }}
                              style={{
                                padding: '6px 9px',
                                background: 'none',
                                border: '1px solid #1a2540',
                                borderRadius: 4,
                                color: '#64748b',
                                fontSize: 10,
                                cursor: 'pointer',
                              }}
                            >
                              Track source
                            </button>
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                padding: '6px 10px',
                                border: '1px solid #1a2540',
                                borderRadius: 4,
                                color: '#60a5fa',
                                fontSize: 11,
                                textDecoration: 'none',
                              }}
                            >
                              Open ↗
                            </a>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'email' && (
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
              onClick={() => void loadDiscovery()}
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
          {discoveryLoading ? (
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
                      onClick={() => void extractEmail(email.id)}
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
                    onClick={() => void acknowledgeEmail(email.id, 'RECENT')}
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
                    onClick={() => void acknowledgeEmail(email.id, 'OLD')}
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
      )}

      {tab === 'batches' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <form
            onSubmit={(event) => void createBatch(event)}
            className="data-card"
            style={{ borderRadius: 6, padding: 18 }}
          >
            <div className="mono" style={{ fontSize: 10, color: '#64748b', marginBottom: 14 }}>
              CREATE MANUAL SOURCE BATCH
            </div>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span
                className="mono"
                style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
              >
                NAME
              </span>
              <input
                value={batchName}
                onChange={(event) => setBatchName(event.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 4,
                  color: '#e2e8f0',
                }}
              />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span
                className="mono"
                style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
              >
                DESCRIPTION
              </span>
              <textarea
                value={batchDescription}
                onChange={(event) => setBatchDescription(event.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: 8,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 4,
                  color: '#e2e8f0',
                  resize: 'vertical',
                }}
              />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span
                className="mono"
                style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
              >
                SOURCES
              </span>
              <select
                multiple
                value={selectedSourceIds}
                onChange={(event) =>
                  setSelectedSourceIds(
                    Array.from(event.target.selectedOptions, (option) => option.value),
                  )
                }
                style={{
                  width: '100%',
                  minHeight: 190,
                  padding: 8,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 4,
                  color: '#94a3b8',
                }}
              >
                {sources
                  .filter(
                    (source) =>
                      !['EMAIL_ONLY', 'RESTRICTED', 'DISABLED'].includes(
                        source.collectionCapability ?? '',
                      ),
                  )
                  .map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name} · {human(source.collectionCapability ?? 'UNKNOWN')}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: 9,
                background: '#3b82f6',
                border: 0,
                borderRadius: 4,
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Create batch
            </button>
          </form>
          <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a2540' }}>
              <strong style={{ fontSize: 12, color: '#cbd5e1' }}>Saved manual batches</strong>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
                Use these for sites you intentionally do not run on a continuous automatic schedule.
              </div>
            </div>
            {batches.length === 0 ? (
              <EmptyState
                icon="⟳"
                title="No source batches yet"
                desc="Create a batch from manual or search-only sources, then run the group through the normal queue."
              />
            ) : (
              batches.map((batch) => (
                <div
                  key={batch.id}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid #1a2540',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1fr) auto',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 12, color: '#e2e8f0' }}>{batch.name}</strong>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                      {batch.description ||
                        `${batch.items.length} source${batch.items.length === 1 ? '' : 's'}`}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {batch.items.slice(0, 8).map((item) => (
                        <span
                          key={item.id}
                          className="mono"
                          style={{
                            fontSize: 8,
                            color: '#64748b',
                            border: '1px solid #1a2540',
                            padding: '2px 5px',
                            borderRadius: 3,
                          }}
                        >
                          {item.source.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => void runBatch(batch.id)}
                      style={{
                        padding: '6px 9px',
                        background: 'rgba(6,214,160,.1)',
                        border: '1px solid rgba(6,214,160,.25)',
                        color: '#06d6a0',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      Run batch
                    </button>
                    <button
                      onClick={() => void deleteBatch(batch.id)}
                      style={{
                        padding: '6px 9px',
                        background: 'none',
                        border: '1px solid #1a2540',
                        color: '#64748b',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'browser' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.3fr) minmax(280px,.7fr)',
            gap: 18,
          }}
        >
          <div className="data-card" style={{ borderRadius: 6, padding: 22 }}>
            <div className="mono" style={{ fontSize: 9, color: '#8b5cf6', marginBottom: 8 }}>
              BROWSER COMPANION
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 16, color: '#e2e8f0' }}>
              Already looking at a job?
            </h2>
            <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.6, maxWidth: 620 }}>
              The extension can inspect the open page, detect whether it is a vacancy, extract the
              role, compare it with one of your CVs, save the job, mark it applied, or send you into
              CV tailoring without copying anything manually.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
                gap: 8,
                margin: '18px 0',
              }}
            >
              {[
                'Detect job page',
                'Extract requirements',
                'Compare CV',
                'Save / Apply / Tailor',
              ].map((step, index) => (
                <div
                  key={step}
                  style={{
                    padding: 10,
                    background: '#111c35',
                    border: '1px solid #1a2540',
                    borderRadius: 5,
                  }}
                >
                  <span className="mono" style={{ color: '#8b5cf6', fontSize: 9 }}>
                    0{index + 1}
                  </span>
                  <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 5 }}>{step}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('extension')}
              style={{
                padding: '8px 12px',
                background: '#3b82f6',
                border: 0,
                borderRadius: 4,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Open Extension setup →
            </button>
          </div>
          <div className="data-card" style={{ borderRadius: 6, padding: 18 }}>
            <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 10 }}>
              WHY THIS EXISTS
            </div>
            <p style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.55, marginTop: 0 }}>
              Not every useful job will be found by a crawler or alert. Browser capture closes that
              gap while keeping the same canonical job, deduplication and application-tracking
              logic.
            </p>
            <div
              style={{
                borderTop: '1px solid #1a2540',
                marginTop: 14,
                paddingTop: 12,
                color: '#64748b',
                fontSize: 10,
                lineHeight: 1.5,
              }}
            >
              The extension never needs to become another job database. It is just one more
              acquisition channel into this workspace.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
