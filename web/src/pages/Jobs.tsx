import { useEffect, useMemo, useState } from 'react';

import { api } from '../api/client';
import { PriorityQueuePanel } from '../components/PriorityQueuePanel';
import { ShareJobsModal } from '../components/ShareJobsModal';
import { EmptyState, Pagination, SkeletonRow } from '../components/UI';
import { useToast } from '../components/Toast';
import type { CvJobMatch, CvSummary } from '../types/cvs';
import type {
  JobDetail,
  JobSummary,
  JobsResponse,
  SearchProfileSummary,
  SourceSummary,
} from '../types/jobs';

interface Props {
  filter: 'all' | 'new' | 'favorites' | 'risk' | 'expired';
  activeProfileId?: string;
  onChanged: () => void;
  onNavigate?: (page: string) => void;
}

interface AiAnalysis {
  score: number;
  eligibility: string;
  summary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  concerns: string[];
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface JobEditForm {
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  postedAt: string;
  expiresAt: string;
  employmentType: string;
  url: string;
}

interface JobHistory {
  snapshots: Array<{
    id: string;
    capturedAt: string;
    reason?: string | null;
    sourceUrl?: string | null;
    snapshot: unknown;
  }>;
  listings: Array<JobListingHistory>;
  statusEvents: Array<{ id: string; type: string; occurredAt: string; metadata?: unknown }>;
}

interface JobListingHistory {
  id: string;
  source: { id: string; name: string };
  revisions: Array<{ id: string; contentHash: string; detectedAt: string; snapshot?: unknown }>;
}

function human(value: string): string {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function date(value?: string | null): string {
  return value
    ? new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
}

function badgeStyle(value: string): React.CSSProperties {
  const upper = value.toUpperCase();
  const color = ['ACTIVE', 'NEW', 'RECENT', 'OFFER', 'ACCEPTED'].includes(upper)
    ? '#06d6a0'
    : ['SCAM', 'REJECTED', 'EXPIRED', 'RED'].includes(upper)
      ? '#ef4444'
      : ['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW'].includes(
            upper,
          )
        ? '#8b5cf6'
        : ['APPLIED', 'SCREENING'].includes(upper)
          ? '#3b82f6'
          : '#f59e0b';
  return {
    fontSize: 9,
    padding: '2px 7px',
    borderRadius: 3,
    border: `1px solid ${color}33`,
    color,
    background: `${color}12`,
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  };
}

function ManualJobModal({
  onClose,
  onSaved,
  onOpenExisting,
}: {
  onClose: () => void;
  onSaved: () => void;
  onOpenExisting: (jobId: string) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    url: '',
    salary: '',
    description: '',
  });
  const [sources, setSources] = useState<
    Array<{ id: string; name: string; sourceType?: string; systemOwned?: boolean }>
  >([]);
  const [sourceId, setSourceId] = useState('');
  const unclassifiedSource = sources.find((source) => source.systemOwned);
  const [detected, setDetected] = useState('');
  const [creatingSource, setCreatingSource] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', sourceType: 'JOB_BOARD' });
  const [saving, setSaving] = useState(false);
  const [duplicateJobId, setDuplicateJobId] = useState<string | null>(null);
  const [urlVerification, setUrlVerification] = useState<any | null>(null);

  async function loadSources() {
    const response = await api<{
      sources: Array<{ id: string; name: string; sourceType?: string; systemOwned?: boolean }>;
    }>('/api/sources');
    setSources(response.sources);
    if (!sourceId) setSourceId(response.sources.find((source) => source.systemOwned)?.id ?? '');
  }
  useEffect(() => {
    void loadSources();
  }, []);

  async function detectSource(url: string) {
    if (!url.trim()) return;
    try {
      const [response, urlCheck] = await Promise.all([
        api<{
          source: { id: string; name: string } | null;
          unclassified: { id: string; name: string } | null;
          suggestedBaseUrl?: string | null;
        }>('/api/sources/resolve', { method: 'POST', body: JSON.stringify({ url }) }),
        api<{
          normalizedUrl: string;
          duplicate: boolean;
          existing?: { job: { id: string; title: string } } | null;
          verification: any;
        }>('/api/jobs/check-url', { method: 'POST', body: JSON.stringify({ url }) }),
      ]);
      const selected = response.source ?? response.unclassified;
      if (selected) setSourceId(selected.id);
      setUrlVerification(urlCheck.verification);
      setDuplicateJobId(urlCheck.existing?.job.id ?? null);
      setDetected(
        urlCheck.duplicate
          ? `This URL is already saved as ${urlCheck.existing?.job.title ?? 'an existing job'}.`
          : response.source
            ? `Detected Job Source: ${response.source.name}`
            : 'No Job Source matched. This job will remain Unclassified unless you add one.',
      );
      if (!response.source)
        setNewSource((current) => ({
          ...current,
          url: response.suggestedBaseUrl ?? url,
          name:
            current.name ||
            (() => {
              try {
                return new URL(url).hostname.replace(/^www\./, '');
              } catch {
                return '';
              }
            })(),
        }));
    } catch {
      setDetected('Source detection could not run. You can select a Job Source manually.');
    }
  }

  async function createSource() {
    if (!newSource.name.trim() || !newSource.url.trim()) return;
    try {
      const created = await api<{ source: { id: string; name: string } }>('/api/sources', {
        method: 'POST',
        body: JSON.stringify({
          name: newSource.name.trim(),
          baseUrl: newSource.url.trim(),
          careersUrl: newSource.url.trim(),
          sourceType: newSource.sourceType,
          auditNow: true,
          defaultIntervalMinutes: 1440,
        }),
      });
      await loadSources();
      setSourceId(created.source.id);
      setCreatingSource(false);
      setDetected(`Job Source created and selected: ${created.source.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Job Source could not be created.');
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (duplicateJobId) {
      toast.warn('This job URL is already saved. Open the existing job instead.');
      return;
    }
    setSaving(true);
    try {
      await api('/api/jobs/manual', {
        method: 'POST',
        body: JSON.stringify({ ...form, ...(sourceId ? { sourceId } : {}), visibility: 'PRIVATE' }),
      });
      toast.success('Job saved to your inbox.');
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Job could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7,11,20,0.86)',
        zIndex: 450,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: 'min(680px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#0d1425',
          border: '1px solid #243050',
          borderRadius: 8,
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 15 }}>Add Job</h3>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 12 }}>
              The Job Source is where the vacancy was published. Manual entry is only the
              acquisition method.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 0, color: '#475569', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['Job title', 'title', 'text'],
            ['Organization', 'company', 'text'],
            ['Location', 'location', 'text'],
            ['Salary', 'salary', 'text'],
          ].map(([label, key, type]) => (
            <label key={key}>
              <span
                className="mono"
                style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 5 }}
              >
                {label.toUpperCase()}
              </span>
              <input
                type={type}
                required={key === 'title'}
                value={form[key as keyof typeof form]}
                onChange={(event) =>
                  setForm((current) => ({ ...current, [key]: event.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                  color: '#e2e8f0',
                  boxSizing: 'border-box',
                }}
              />
            </label>
          ))}
          <label style={{ gridColumn: '1 / -1' }}>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 5 }}
            >
              JOB URL
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="url"
                value={form.url}
                onChange={(event) => {
                  setForm((current) => ({ ...current, url: event.target.value }));
                  setDetected('');
                  setDuplicateJobId(null);
                  setUrlVerification(null);
                }}
                onBlur={() => void detectSource(form.url)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                  color: '#e2e8f0',
                }}
              />
              <button
                type="button"
                onClick={() => void detectSource(form.url)}
                style={{
                  padding: '7px 10px',
                  background: 'none',
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                  color: '#60a5fa',
                  cursor: 'pointer',
                }}
              >
                Detect source
              </button>
            </div>
            {detected && (
              <div
                style={{
                  marginTop: 5,
                  fontSize: 10,
                  color: duplicateJobId ? '#f59e0b' : '#64748b',
                }}
              >
                {detected}
                {duplicateJobId && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenExisting(duplicateJobId);
                    }}
                    style={{
                      marginLeft: 8,
                      background: 'none',
                      border: 0,
                      color: '#60a5fa',
                      cursor: 'pointer',
                    }}
                  >
                    Open existing →
                  </button>
                )}
                {urlVerification?.redirected && (
                  <div className="mono" style={{ marginTop: 3, fontSize: 9, color: '#475569' }}>
                    Resolved to: {urlVerification.finalUrl}
                  </div>
                )}
              </div>
            )}
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 5 }}
            >
              JOB SOURCE
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                style={{
                  flex: 1,
                  padding: 8,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                  color: '#94a3b8',
                }}
              >
                {unclassifiedSource && (
                  <option value={unclassifiedSource.id}>Unclassified Source</option>
                )}
                {sources
                  .filter((source) => !source.systemOwned)
                  .map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                      {source.sourceType ? ` · ${human(source.sourceType)}` : ''}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => setCreatingSource((v) => !v)}
                style={{
                  padding: '7px 10px',
                  background: 'none',
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                  color: '#60a5fa',
                  cursor: 'pointer',
                }}
              >
                + Add Job Source
              </button>
            </div>
          </label>
          {creatingSource && (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: 12,
                border: '1px solid #1a2540',
                borderRadius: 6,
                background: '#0a1020',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              <input
                value={newSource.name}
                onChange={(e) => setNewSource((c) => ({ ...c, name: e.target.value }))}
                placeholder="Source name"
                style={{
                  padding: 8,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 4,
                  color: '#e2e8f0',
                }}
              />
              <input
                value={newSource.url}
                onChange={(e) => setNewSource((c) => ({ ...c, url: e.target.value }))}
                placeholder="https://source.example/jobs"
                style={{
                  padding: 8,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 4,
                  color: '#e2e8f0',
                }}
              />
              <select
                value={newSource.sourceType}
                onChange={(e) => setNewSource((c) => ({ ...c, sourceType: e.target.value }))}
                style={{
                  padding: 8,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 4,
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
              <button
                type="button"
                onClick={() => void createSource()}
                style={{
                  padding: 8,
                  background: '#3b82f6',
                  border: 0,
                  borderRadius: 4,
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Create & select source
              </button>
            </div>
          )}
          <label style={{ gridColumn: '1 / -1' }}>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 5 }}
            >
              DESCRIPTION
            </span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={6}
              style={{
                width: '100%',
                padding: 10,
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 5,
                color: '#e2e8f0',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              background: 'none',
              border: '1px solid #1a2540',
              borderRadius: 5,
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            disabled={saving || Boolean(duplicateJobId)}
            type="submit"
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              border: 0,
              borderRadius: 5,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save job'}
          </button>
        </div>
      </form>
    </div>
  );
}

function JobDetailDrawer({
  jobId,
  activeProfileId,
  onClose,
  onChanged,
  onNavigate,
}: {
  jobId: string;
  activeProfileId?: string;
  onClose: () => void;
  onChanged: () => void;
  onNavigate?: (page: string) => void;
}) {
  const toast = useToast();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [tab, setTab] = useState<'details' | 'listings' | 'analysis' | 'history'>('details');
  const [cvs, setCvs] = useState<CvSummary[]>([]);
  const [cvVersionId, setCvVersionId] = useState('');
  const [match, setMatch] = useState<CvJobMatch | null>(null);
  const [profiles, setProfiles] = useState<SearchProfileSummary[]>([]);
  const [profileId, setProfileId] = useState(activeProfileId ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [customExpiresAt, setCustomExpiresAt] = useState('');
  const [riskLevel, setRiskLevel] = useState('YELLOW');
  const [riskReason, setRiskReason] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [history, setHistory] = useState<JobHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editForm, setEditForm] = useState<JobEditForm>({
    title: '',
    company: '',
    location: '',
    salary: '',
    description: '',
    postedAt: '',
    expiresAt: '',
    employmentType: '',
    url: '',
  });
  const [jobSources, setJobSources] = useState<SourceSummary[]>([]);
  const [listingSourceSelections, setListingSourceSelections] = useState<Record<string, string>>(
    {},
  );
  const [newListingSourceId, setNewListingSourceId] = useState('');
  const [newListingUrl, setNewListingUrl] = useState('');
  const [newListingOfficial, setNewListingOfficial] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  async function load() {
    const [jobResponse, cvResponse, profileResponse, sourceResponse] = await Promise.all([
      api<{ job: JobDetail }>(`/api/jobs/${jobId}`),
      api<{ cvs: CvSummary[] }>(
        `/api/cvs${profileId ? `?profileId=${encodeURIComponent(profileId)}` : ''}`,
      ),
      api<{ profiles: SearchProfileSummary[] }>('/api/profiles'),
      api<{ sources: SourceSummary[] }>('/api/sources'),
    ]);
    const nextJob = jobResponse.job;
    setJob(nextJob);
    setCvs(cvResponse.cvs);
    setProfiles(profileResponse.profiles);
    setJobSources(sourceResponse.sources);
    setListingSourceSelections(
      Object.fromEntries(nextJob.listings.map((listing) => [listing.id, listing.source.id])),
    );
    setCustomExpiresAt(nextJob.userStates[0]?.customExpiresAt?.slice(0, 10) ?? '');
    setEditForm({
      title: nextJob.title,
      company: nextJob.company?.name ?? '',
      location: nextJob.locationText ?? '',
      salary: nextJob.salaryText ?? '',
      description: nextJob.description ?? '',
      postedAt: nextJob.earliestPostedAt?.slice(0, 10) ?? '',
      expiresAt: nextJob.expiresAt?.slice(0, 10) ?? '',
      employmentType: nextJob.employmentType ?? '',
      url: nextJob.officialApplyUrl ?? '',
    });
    const preferred = nextJob.userStates[0]?.preferredCvVersionId;
    const defaultCv = cvResponse.cvs.find((cv) =>
      cv.profileLinks.some((link) => link.profileId === profileId && link.isDefault),
    );
    const candidate =
      preferred ?? defaultCv?.versions[0]?.id ?? cvResponse.cvs[0]?.versions[0]?.id ?? '';
    setCvVersionId((current) => current || candidate);
    await api(`/api/jobs/${jobId}/state`, {
      method: 'PATCH',
      body: JSON.stringify({ visited: true }),
    });
  }

  useEffect(() => {
    void load();
  }, [jobId]);

  async function state(disposition: string) {
    try {
      await api(`/api/jobs/${jobId}/state`, {
        method: 'PATCH',
        body: JSON.stringify({ disposition }),
      });
      await load();
      onChanged();
      if (disposition === 'ARCHIVED') toast.success('Job archived. Its history is preserved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Job state could not be changed.');
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    await api(`/api/jobs/${jobId}/notes`, { method: 'POST', body: JSON.stringify({ note }) });
    setNote('');
    await load();
    toast.success('Note added.');
  }

  async function markApplied() {
    if (!job) return;
    const listing = job.listings.find((item) => item.isOfficial) ?? job.listings[0];
    try {
      await api('/api/applications', {
        method: 'POST',
        body: JSON.stringify({
          jobId,
          ...(profileId ? { searchProfileId: profileId } : {}),
          ...(cvVersionId ? { cvVersionId } : {}),
          ...(listing ? { sourceListingId: listing.id } : {}),
          ...(job.officialApplyUrl ? { whereAppliedUrl: job.officialApplyUrl } : {}),
        }),
      });
      toast.success('Application recorded and Application Pack created.');
      await load();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Application could not be recorded.');
    }
  }

  async function changeListingSource(listingId: string) {
    const sourceId = listingSourceSelections[listingId];
    if (!sourceId) return;
    try {
      await api(`/api/jobs/listings/${listingId}/source`, {
        method: 'PATCH',
        body: JSON.stringify({ sourceId }),
      });
      toast.success('Job Listing reassigned to the selected Job Source.');
      await load();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Job Source could not be changed.');
    }
  }

  async function addListing() {
    if (!newListingSourceId) {
      toast.warn('Choose a Job Source first.');
      return;
    }
    try {
      await api(`/api/jobs/${jobId}/listings`, {
        method: 'POST',
        body: JSON.stringify({
          sourceId: newListingSourceId,
          ...(newListingUrl.trim() ? { url: newListingUrl.trim() } : {}),
          isOfficial: newListingOfficial,
        }),
      });
      setNewListingSourceId('');
      setNewListingUrl('');
      setNewListingOfficial(false);
      toast.success('Additional Job Listing attached to this canonical Job.');
      await load();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Job Listing could not be added.');
    }
  }

  async function compareCv() {
    if (!cvVersionId) return;
    setBusy(true);
    try {
      const response = await api<{ match: CvJobMatch }>(`/api/cvs/jobs/${jobId}/compare`, {
        method: 'POST',
        body: JSON.stringify({ cvVersionId }),
      });
      setMatch(response.match);
      setTab('analysis');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'CV comparison failed.');
    } finally {
      setBusy(false);
    }
  }

  async function saveWithCv() {
    if (!cvVersionId) return;
    await api(`/api/jobs/${jobId}/state`, {
      method: 'PATCH',
      body: JSON.stringify({ disposition: 'SAVED', preferredCvVersionId: cvVersionId }),
    });
    toast.success('Saved with selected CV.');
    await load();
    onChanged();
  }

  async function tailor() {
    if (!cvVersionId) return;
    setBusy(true);
    try {
      const response = await api<{ session: { id: string } }>('/api/cvs/tailoring', {
        method: 'POST',
        body: JSON.stringify({ jobId, cvVersionId, ...(match?.id ? { matchId: match.id } : {}) }),
      });
      localStorage.setItem('active-cv-tailoring-session', response.session.id);
      toast.success('Tailoring session created. Open CVs to continue.');
      onNavigate?.('cvs');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Tailoring session could not be created.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function analyzeProfile() {
    if (!profileId) {
      toast.warn('Choose a search profile first.');
      return;
    }
    setBusy(true);
    try {
      const response = await api<{ analysis: AiAnalysis }>(`/api/ai/jobs/${jobId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({ profileId }),
      });
      setAiAnalysis(response.analysis);
      toast.success('Profile fit analysis complete.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Profile analysis failed.');
    } finally {
      setBusy(false);
    }
  }

  async function saveExpiry() {
    try {
      await api(`/api/jobs/${jobId}/state`, {
        method: 'PATCH',
        body: JSON.stringify({ customExpiresAt: customExpiresAt || null }),
      });
      toast.success(customExpiresAt ? 'Personal reminder saved.' : 'Personal reminder cleared.');
      await load();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reminder could not be saved.');
    }
  }

  async function saveRisk(target: 'job' | 'company') {
    if (!job || !riskReason.trim()) return;
    if (target === 'company' && !job.company?.id) return;
    try {
      await api('/api/risk', {
        method: 'POST',
        body: JSON.stringify({
          ...(target === 'job' ? { jobId } : { companyId: job.company!.id }),
          level: riskLevel,
          reasonType: 'USER_MARKED',
          reason: riskReason.trim(),
        }),
      });
      setRiskReason('');
      toast.success(`${target === 'job' ? 'Job' : 'Company'} trust note saved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Trust note could not be saved.');
    }
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editForm.title,
          company: editForm.company || null,
          location: editForm.location || null,
          salary: editForm.salary || null,
          description: editForm.description || null,
          postedAt: editForm.postedAt || null,
          expiresAt: editForm.expiresAt || null,
          employmentType: editForm.employmentType || null,
          url: editForm.url || null,
        }),
      });
      setEditOpen(false);
      toast.success('Job updated.');
      await load();
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Job could not be updated.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteJob() {
    if (
      !job ||
      !window.confirm(
        `Permanently delete “${job.title}”?\n\nJobs with application history cannot be deleted and should be archived instead.`,
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/api/jobs/${jobId}`, { method: 'DELETE' });
      toast.success('Job permanently deleted.');
      onChanged();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Job could not be deleted.');
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory() {
    if (historyLoading) return;
    setHistoryLoading(true);
    try {
      const response = await api<{ history: JobHistory }>(`/api/career/jobs/${jobId}/history`);
      setHistory(response.history);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Job history could not be loaded.');
    } finally {
      setHistoryLoading(false);
    }
  }

  function switchTab(next: 'details' | 'listings' | 'analysis' | 'history') {
    setTab(next);
    if (next === 'history' && !history) void loadHistory();
  }

  if (!job)
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7,11,20,0.85)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <div
          style={{
            width: 560,
            background: '#0d1425',
            borderLeft: '1px solid #1a2540',
            padding: 30,
          }}
        >
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  const application = job.applications[0];
  const canEdit = Boolean(job.canEdit);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7,11,20,0.85)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        zIndex: 100,
      }}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      {shareOpen && <ShareJobsModal jobIds={[jobId]} onClose={() => setShareOpen(false)} />}
      <div
        style={{
          width: 'min(620px, 96vw)',
          height: '100%',
          background: '#0d1425',
          borderLeft: '1px solid #1a2540',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #1a2540',
            position: 'sticky',
            top: 0,
            background: '#0d1425',
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 10,
            }}
          >
            <div style={{ flex: 1, marginRight: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                {job.title}
              </div>
              <div style={{ fontSize: 14, color: '#94a3b8' }}>
                {job.company?.name ?? 'Company unknown'}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#475569',
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={badgeStyle(job.status)}>{human(job.status)}</span>
            <span style={badgeStyle(job.freshnessStatus)}>{human(job.freshnessStatus)}</span>
            {application && (
              <span style={badgeStyle(application.stage)}>{human(application.stage)}</span>
            )}
            {job.userStates[0]?.disposition === 'SAVED' && (
              <span style={badgeStyle('OFFER')}>★ Saved</span>
            )}
            {job.userStates[0]?.disposition === 'ARCHIVED' && (
              <span style={badgeStyle('ARCHIVED')}>Archived</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() =>
                void state(job.userStates[0]?.disposition === 'SAVED' ? 'NONE' : 'SAVED')
              }
              style={{
                padding: '5px 10px',
                background: 'none',
                border: '1px solid #1a2540',
                borderRadius: 4,
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              {job.userStates[0]?.disposition === 'SAVED' ? '★ Saved' : '☆ Save'}
            </button>
            <button
              onClick={() => void markApplied()}
              style={{
                padding: '5px 10px',
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: 4,
                color: '#3b82f6',
                cursor: 'pointer',
              }}
            >
              ⚑ Mark Applied
            </button>
            <button
              onClick={() => {
                switchTab('analysis');
                if (!match && cvVersionId) void compareCv();
              }}
              style={{
                padding: '5px 10px',
                background: 'none',
                border: '1px solid #1a2540',
                borderRadius: 4,
                color: '#8b5cf6',
                cursor: 'pointer',
              }}
            >
              ⊕ Analyze CV
            </button>
            {job.officialApplyUrl && (
              <a
                href={job.officialApplyUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '5px 10px',
                  background: 'rgba(6,214,160,0.1)',
                  border: '1px solid rgba(6,214,160,0.25)',
                  borderRadius: 4,
                  color: '#06d6a0',
                  textDecoration: 'none',
                  fontSize: 11,
                }}
              >
                Open application ↗
              </a>
            )}
            <button
              onClick={() => setShareOpen(true)}
              style={{
                padding: '5px 10px',
                background: 'none',
                border: '1px solid #1a2540',
                borderRadius: 4,
                color: '#60a5fa',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              Share
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #1a2540',
            padding: '0 24px',
            overflowX: 'auto',
          }}
        >
          {(['details', 'listings', 'analysis', 'history'] as const).map((item) => (
            <button
              key={item}
              onClick={() => switchTab(item)}
              style={{
                padding: '10px 0',
                marginRight: 24,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${tab === item ? '#3b82f6' : 'transparent'}`,
                color: tab === item ? '#e2e8f0' : '#64748b',
                fontSize: 12,
                cursor: 'pointer',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}
            >
              {item === 'listings' ? `Listings (${job.listings.length})` : item}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {tab === 'details' && (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {[
                  ['Location', job.locationText ?? 'Not specified'],
                  ['Employment', human(job.employmentType)],
                  ['Work style', human(job.remoteType)],
                  ['Salary', job.salaryText ?? 'Not disclosed'],
                  ['Posted', date(job.earliestPostedAt)],
                  ['First seen', date(job.firstSeenAt)],
                  ['Sources', String(job.listings.length)],
                  ['Category', job.primaryCategory?.name ?? 'Uncategorized'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{ background: '#111c35', borderRadius: 5, padding: '10px 12px' }}
                  >
                    <div
                      className="mono"
                      style={{
                        fontSize: 9,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: 4,
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
              {job.description && (
                <div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: 8,
                    }}
                  >
                    Description
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#94a3b8',
                      lineHeight: 1.65,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {job.description}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 22 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: '#475569',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Notes
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Add a note…"
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      background: '#111c35',
                      border: '1px solid #1a2540',
                      borderRadius: 4,
                      color: '#e2e8f0',
                    }}
                  />
                  <button
                    onClick={() => void addNote()}
                    style={{
                      padding: '7px 12px',
                      background: '#3b82f6',
                      border: 0,
                      borderRadius: 4,
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Add
                  </button>
                </div>
                {job.notes.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      marginTop: 8,
                      padding: '8px 10px',
                      background: '#111c35',
                      borderRadius: 4,
                      color: '#94a3b8',
                      fontSize: 11,
                    }}
                  >
                    {item.note}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
                <details
                  style={{ border: '1px solid #1a2540', borderRadius: 5, background: '#0a1020' }}
                >
                  <summary
                    style={{ padding: 10, color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}
                  >
                    Personal expiry reminder
                  </summary>
                  <div style={{ padding: '0 10px 10px', display: 'flex', gap: 6 }}>
                    <input
                      type="date"
                      value={customExpiresAt}
                      onChange={(event) => setCustomExpiresAt(event.target.value)}
                      style={{
                        flex: 1,
                        background: '#111c35',
                        border: '1px solid #1a2540',
                        color: '#94a3b8',
                        borderRadius: 4,
                        padding: 7,
                      }}
                    />
                    <button
                      onClick={() => void saveExpiry()}
                      style={{
                        border: '1px solid #1a2540',
                        background: '#111c35',
                        color: '#60a5fa',
                        borderRadius: 4,
                        padding: '6px 9px',
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                  </div>
                </details>
                <details
                  style={{ border: '1px solid #1a2540', borderRadius: 5, background: '#0a1020' }}
                >
                  <summary
                    style={{ padding: 10, color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}
                  >
                    Trust / risk note
                  </summary>
                  <div
                    style={{
                      padding: '0 10px 10px',
                      display: 'grid',
                      gridTemplateColumns: '100px 1fr',
                      gap: 6,
                    }}
                  >
                    <select
                      value={riskLevel}
                      onChange={(event) => setRiskLevel(event.target.value)}
                      style={{
                        background: '#111c35',
                        border: '1px solid #1a2540',
                        color: '#94a3b8',
                        borderRadius: 4,
                        padding: 7,
                      }}
                    >
                      <option>GREEN</option>
                      <option>YELLOW</option>
                      <option>ORANGE</option>
                      <option>RED</option>
                    </select>
                    <input
                      value={riskReason}
                      onChange={(event) => setRiskReason(event.target.value)}
                      placeholder="Why are you marking this?"
                      style={{
                        background: '#111c35',
                        border: '1px solid #1a2540',
                        color: '#e2e8f0',
                        borderRadius: 4,
                        padding: 7,
                      }}
                    />
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 6 }}>
                      <button
                        disabled={!riskReason.trim()}
                        onClick={() => void saveRisk('job')}
                        style={{
                          border: '1px solid #1a2540',
                          background: '#111c35',
                          color: '#f59e0b',
                          borderRadius: 4,
                          padding: '6px 9px',
                          cursor: 'pointer',
                        }}
                      >
                        Save for job
                      </button>
                      <button
                        disabled={!riskReason.trim() || !job.company}
                        onClick={() => void saveRisk('company')}
                        style={{
                          border: '1px solid #1a2540',
                          background: '#111c35',
                          color: '#64748b',
                          borderRadius: 4,
                          padding: '6px 9px',
                          cursor: 'pointer',
                        }}
                      >
                        Save for company
                      </button>
                    </div>
                  </div>
                </details>

                <details
                  open={editOpen}
                  onToggle={(event) => setEditOpen(event.currentTarget.open)}
                  style={{ border: '1px solid #1a2540', borderRadius: 5, background: '#0a1020' }}
                >
                  <summary
                    style={{ padding: 10, color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}
                  >
                    Manage job
                  </summary>
                  <div style={{ padding: '0 10px 10px' }}>
                    {!canEdit && (
                      <div
                        style={{
                          padding: 9,
                          marginBottom: 9,
                          background: 'rgba(59,130,246,.06)',
                          border: '1px solid rgba(59,130,246,.16)',
                          borderRadius: 4,
                          color: '#64748b',
                          fontSize: 10,
                          lineHeight: 1.5,
                        }}
                      >
                        This is a shared crawler-discovered job. Its canonical data is protected so
                        provenance and deduplication remain trustworthy. You can archive it, add
                        notes, or change your personal state.
                      </div>
                    )}
                    {canEdit && (
                      <form
                        onSubmit={(event) => void saveEdit(event)}
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
                      >
                        <label style={{ gridColumn: '1 / -1' }}>
                          <span
                            className="mono"
                            style={{
                              display: 'block',
                              fontSize: 8,
                              color: '#475569',
                              marginBottom: 4,
                            }}
                          >
                            TITLE
                          </span>
                          <input
                            required
                            value={editForm.title}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, title: event.target.value }))
                            }
                            style={{
                              width: '100%',
                              background: '#111c35',
                              border: '1px solid #1a2540',
                              borderRadius: 4,
                              color: '#e2e8f0',
                              padding: 7,
                            }}
                          />
                        </label>
                        <label>
                          <span
                            className="mono"
                            style={{
                              display: 'block',
                              fontSize: 8,
                              color: '#475569',
                              marginBottom: 4,
                            }}
                          >
                            COMPANY
                          </span>
                          <input
                            value={editForm.company}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                company: event.target.value,
                              }))
                            }
                            style={{
                              width: '100%',
                              background: '#111c35',
                              border: '1px solid #1a2540',
                              borderRadius: 4,
                              color: '#e2e8f0',
                              padding: 7,
                            }}
                          />
                        </label>
                        <label>
                          <span
                            className="mono"
                            style={{
                              display: 'block',
                              fontSize: 8,
                              color: '#475569',
                              marginBottom: 4,
                            }}
                          >
                            LOCATION
                          </span>
                          <input
                            value={editForm.location}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                location: event.target.value,
                              }))
                            }
                            style={{
                              width: '100%',
                              background: '#111c35',
                              border: '1px solid #1a2540',
                              borderRadius: 4,
                              color: '#e2e8f0',
                              padding: 7,
                            }}
                          />
                        </label>
                        <label>
                          <span
                            className="mono"
                            style={{
                              display: 'block',
                              fontSize: 8,
                              color: '#475569',
                              marginBottom: 4,
                            }}
                          >
                            SALARY
                          </span>
                          <input
                            value={editForm.salary}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, salary: event.target.value }))
                            }
                            style={{
                              width: '100%',
                              background: '#111c35',
                              border: '1px solid #1a2540',
                              borderRadius: 4,
                              color: '#e2e8f0',
                              padding: 7,
                            }}
                          />
                        </label>
                        <label>
                          <span
                            className="mono"
                            style={{
                              display: 'block',
                              fontSize: 8,
                              color: '#475569',
                              marginBottom: 4,
                            }}
                          >
                            EMPLOYMENT
                          </span>
                          <input
                            value={editForm.employmentType}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                employmentType: event.target.value,
                              }))
                            }
                            placeholder="FULL_TIME"
                            style={{
                              width: '100%',
                              background: '#111c35',
                              border: '1px solid #1a2540',
                              borderRadius: 4,
                              color: '#e2e8f0',
                              padding: 7,
                            }}
                          />
                        </label>
                        <label>
                          <span
                            className="mono"
                            style={{
                              display: 'block',
                              fontSize: 8,
                              color: '#475569',
                              marginBottom: 4,
                            }}
                          >
                            POSTED
                          </span>
                          <input
                            type="date"
                            value={editForm.postedAt}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                postedAt: event.target.value,
                              }))
                            }
                            style={{
                              width: '100%',
                              background: '#111c35',
                              border: '1px solid #1a2540',
                              borderRadius: 4,
                              color: '#e2e8f0',
                              padding: 7,
                            }}
                          />
                        </label>
                        <label>
                          <span
                            className="mono"
                            style={{
                              display: 'block',
                              fontSize: 8,
                              color: '#475569',
                              marginBottom: 4,
                            }}
                          >
                            EXPIRES
                          </span>
                          <input
                            type="date"
                            value={editForm.expiresAt}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                expiresAt: event.target.value,
                              }))
                            }
                            style={{
                              width: '100%',
                              background: '#111c35',
                              border: '1px solid #1a2540',
                              borderRadius: 4,
                              color: '#e2e8f0',
                              padding: 7,
                            }}
                          />
                        </label>
                        <label style={{ gridColumn: '1 / -1' }}>
                          <span
                            className="mono"
                            style={{
                              display: 'block',
                              fontSize: 8,
                              color: '#475569',
                              marginBottom: 4,
                            }}
                          >
                            APPLICATION URL
                          </span>
                          <input
                            type="url"
                            value={editForm.url}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, url: event.target.value }))
                            }
                            style={{
                              width: '100%',
                              background: '#111c35',
                              border: '1px solid #1a2540',
                              borderRadius: 4,
                              color: '#e2e8f0',
                              padding: 7,
                            }}
                          />
                        </label>
                        <label style={{ gridColumn: '1 / -1' }}>
                          <span
                            className="mono"
                            style={{
                              display: 'block',
                              fontSize: 8,
                              color: '#475569',
                              marginBottom: 4,
                            }}
                          >
                            DESCRIPTION
                          </span>
                          <textarea
                            rows={7}
                            value={editForm.description}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            style={{
                              width: '100%',
                              background: '#111c35',
                              border: '1px solid #1a2540',
                              borderRadius: 4,
                              color: '#e2e8f0',
                              padding: 7,
                              resize: 'vertical',
                            }}
                          />
                        </label>
                        <button
                          disabled={busy}
                          type="submit"
                          style={{
                            padding: 7,
                            background: '#3b82f6',
                            border: 0,
                            borderRadius: 4,
                            color: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          {busy ? 'Saving…' : 'Save edits'}
                        </button>
                        <button
                          disabled={busy}
                          type="button"
                          onClick={() => void deleteJob()}
                          style={{
                            padding: 7,
                            background: 'rgba(239,68,68,.08)',
                            border: '1px solid rgba(239,68,68,.22)',
                            borderRadius: 4,
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                        >
                          Delete permanently
                        </button>
                      </form>
                    )}
                    <button
                      onClick={() => void state('ARCHIVED')}
                      style={{
                        width: '100%',
                        marginTop: 8,
                        padding: 7,
                        background: 'none',
                        border: '1px solid #1a2540',
                        borderRadius: 4,
                        color: '#f59e0b',
                        cursor: 'pointer',
                      }}
                    >
                      Archive job and keep history
                    </button>
                  </div>
                </details>
              </div>
            </div>
          )}

          {tab === 'listings' && (
            <div>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 0 }}>
                A Job is the canonical opportunity. Each row below is a Job Listing: one occurrence
                of that Job on a publishing Job Source. Acquisition method records how JobIntel
                discovered that listing.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {job.listings.map((listing) => (
                  <div
                    key={listing.id}
                    style={{
                      background: '#111c35',
                      borderRadius: 6,
                      padding: '14px 16px',
                      border: '1px solid #1a2540',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <strong style={{ color: '#e2e8f0', fontSize: 13 }}>
                          {listing.source.name}
                          {listing.isOfficial ? ' · Official' : ''}
                        </strong>
                        <div
                          className="mono"
                          style={{
                            fontSize: 10,
                            color: '#3b82f6',
                            marginTop: 5,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {listing.sourceUrl ?? listing.applyUrl ?? 'URL unavailable'}
                        </div>
                      </div>
                      <span style={badgeStyle(listing.status ?? 'UNKNOWN')}>
                        {human(listing.status ?? 'UNKNOWN')}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3,1fr)',
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      <div>
                        <div className="mono" style={{ fontSize: 9, color: '#475569' }}>
                          POSTED
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {date(listing.postedAt)}
                        </div>
                      </div>
                      <div>
                        <div className="mono" style={{ fontSize: 9, color: '#475569' }}>
                          FIRST SEEN
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {date(listing.firstSeenAt)}
                        </div>
                      </div>
                      <div>
                        <div className="mono" style={{ fontSize: 9, color: '#475569' }}>
                          ACQUISITION
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          {human(listing.acquisitionMethod ?? 'MANUAL')}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 6,
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: '1px solid #1a2540',
                      }}
                    >
                      <select
                        value={listingSourceSelections[listing.id] ?? listing.source.id}
                        onChange={(event) =>
                          setListingSourceSelections((current) => ({
                            ...current,
                            [listing.id]: event.target.value,
                          }))
                        }
                        style={{
                          padding: '6px 8px',
                          background: '#0d1425',
                          border: '1px solid #1a2540',
                          borderRadius: 4,
                          color: '#94a3b8',
                          fontSize: 10,
                        }}
                      >
                        {jobSources.map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.name} · {human(source.sourceType ?? 'OTHER')}
                          </option>
                        ))}
                      </select>
                      <button
                        disabled={
                          (listingSourceSelections[listing.id] ?? listing.source.id) ===
                          listing.source.id
                        }
                        onClick={() => void changeListingSource(listing.id)}
                        style={{
                          padding: '6px 9px',
                          background: 'none',
                          border: '1px solid #1a2540',
                          borderRadius: 4,
                          color: '#60a5fa',
                          cursor: 'pointer',
                          opacity:
                            (listingSourceSelections[listing.id] ?? listing.source.id) ===
                            listing.source.id
                              ? 0.5
                              : 1,
                        }}
                      >
                        Change source
                      </button>
                    </div>
                    {(listing.applyUrl ?? listing.sourceUrl) && (
                      <a
                        href={listing.applyUrl ?? listing.sourceUrl ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-block',
                          marginTop: 10,
                          padding: '4px 10px',
                          border: '1px solid #1a2540',
                          borderRadius: 4,
                          color: '#3b82f6',
                          textDecoration: 'none',
                          fontSize: 11,
                        }}
                      >
                        Open listing →
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  border: '1px solid #1a2540',
                  borderRadius: 6,
                  background: '#0a1020',
                }}
              >
                <div className="mono" style={{ fontSize: 9, color: '#64748b', marginBottom: 8 }}>
                  + ADD ANOTHER JOB LISTING / SOURCE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 7 }}>
                  <select
                    value={newListingSourceId}
                    onChange={(event) => setNewListingSourceId(event.target.value)}
                    style={{
                      padding: 8,
                      background: '#111c35',
                      border: '1px solid #1a2540',
                      borderRadius: 4,
                      color: '#94a3b8',
                    }}
                  >
                    <option value="">Choose Job Source</option>
                    {jobSources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name} · {human(source.sourceType ?? 'OTHER')}
                      </option>
                    ))}
                  </select>
                  <input
                    type="url"
                    value={newListingUrl}
                    onChange={(event) => setNewListingUrl(event.target.value)}
                    placeholder="Listing URL (optional)"
                    style={{
                      padding: 8,
                      background: '#111c35',
                      border: '1px solid #1a2540',
                      borderRadius: 4,
                      color: '#e2e8f0',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 8,
                  }}
                >
                  <label style={{ fontSize: 10, color: '#64748b' }}>
                    <input
                      type="checkbox"
                      checked={newListingOfficial}
                      onChange={(event) => setNewListingOfficial(event.target.checked)}
                    />{' '}
                    Official listing
                  </label>
                  <button
                    onClick={() => void addListing()}
                    style={{
                      padding: '7px 10px',
                      background: '#3b82f6',
                      border: 0,
                      borderRadius: 4,
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Attach listing
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'analysis' && (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <select
                  value={profileId}
                  onChange={(event) => {
                    setProfileId(event.target.value);
                    setMatch(null);
                  }}
                  style={{
                    padding: '8px 10px',
                    background: '#111c35',
                    border: '1px solid #1a2540',
                    borderRadius: 5,
                    color: '#94a3b8',
                  }}
                >
                  <option value="">Any profile</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => void load()}
                  style={{
                    background: 'none',
                    border: '1px solid #1a2540',
                    borderRadius: 5,
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Refresh CVs
                </button>
              </div>
              <select
                value={cvVersionId}
                onChange={(event) => {
                  setCvVersionId(event.target.value);
                  setMatch(null);
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                  color: '#94a3b8',
                  marginBottom: 10,
                }}
              >
                <option value="">Choose CV</option>
                {cvs.flatMap((cv) =>
                  cv.versions.slice(0, 1).map((version) => (
                    <option key={version.id} value={version.id}>
                      {cv.name} · v{version.versionNumber}
                      {cv.isMaster ? ' · Master' : ''}
                    </option>
                  )),
                )}
              </select>
              {match ? (
                <div
                  style={{
                    background: '#111c35',
                    borderRadius: 6,
                    padding: '14px 16px',
                    border: '1px solid #1a2540',
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      marginBottom: 10,
                    }}
                  >
                    CV Match
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}
                  >
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Requirements evidenced</span>
                    <span
                      className="mono"
                      style={{ color: match.score >= 75 ? '#06d6a0' : '#f59e0b', fontWeight: 600 }}
                    >
                      {match.score}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: '#1a2540',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${match.score}%`,
                        background: match.score >= 75 ? '#06d6a0' : '#f59e0b',
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{match.summary}</p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4,1fr)',
                      gap: 6,
                      margin: '12px 0',
                    }}
                  >
                    {[
                      ['Evidenced', match.evidencedCount, '#06d6a0'],
                      ['Partial', match.partialCount, '#f59e0b'],
                      ['Not evidenced', match.notEvidencedCount, '#ef4444'],
                      ['Confirm', match.needsConfirmationCount, '#8b5cf6'],
                    ].map(([label, count, color]) => (
                      <div
                        key={String(label)}
                        style={{
                          background: '#0d1425',
                          padding: 8,
                          borderRadius: 4,
                          textAlign: 'center',
                        }}
                      >
                        <strong
                          className="mono"
                          style={{ display: 'block', color: String(color), fontSize: 14 }}
                        >
                          {String(count)}
                        </strong>
                        <small style={{ color: '#475569', fontSize: 9 }}>{String(label)}</small>
                      </div>
                    ))}
                  </div>
                  {match.items
                    .filter((item) => !['EVIDENCED', 'NOT_APPLICABLE'].includes(item.status))
                    .slice(0, 6)
                    .map((item, index) => (
                      <div
                        key={`${item.requirementText}-${index}`}
                        style={{ padding: '8px 0', borderTop: '1px solid #1a2540' }}
                      >
                        <span
                          style={badgeStyle(
                            item.status === 'NOT_EVIDENCED' ? 'REJECTED' : 'ASSESSMENT',
                          )}
                        >
                          {human(item.status)}
                        </span>
                        <p style={{ margin: '5px 0 0', fontSize: 11, color: '#94a3b8' }}>
                          {item.requirementText}
                        </p>
                        {item.evidence && (
                          <small style={{ color: '#475569' }}>
                            Current evidence: {item.evidence}
                          </small>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: 28,
                    textAlign: 'center',
                    border: '1px dashed #1a2540',
                    borderRadius: 6,
                    color: '#475569',
                    fontSize: 12,
                  }}
                >
                  Choose a CV and compare it with this job. “Not evidenced” means the CV does not
                  show the requirement; it does not assume you lack it.
                </div>
              )}
              <button
                disabled={!cvVersionId || busy}
                onClick={() => void compareCv()}
                style={{
                  width: '100%',
                  padding: 10,
                  marginTop: 10,
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: 6,
                  color: '#3b82f6',
                  cursor: 'pointer',
                }}
              >
                {busy ? 'Analyzing…' : '⊕ Run CV Analysis'}
              </button>
              {match && (
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}
                >
                  <button
                    onClick={() => void tailor()}
                    style={{
                      padding: 10,
                      background: 'rgba(139,92,246,0.1)',
                      border: '1px solid rgba(139,92,246,0.25)',
                      borderRadius: 6,
                      color: '#8b5cf6',
                      cursor: 'pointer',
                    }}
                  >
                    ✦ Improve CV
                  </button>
                  <button
                    onClick={() => void saveWithCv()}
                    style={{
                      padding: 10,
                      background: 'rgba(6,214,160,0.1)',
                      border: '1px solid rgba(6,214,160,0.25)',
                      borderRadius: 6,
                      color: '#06d6a0',
                      cursor: 'pointer',
                    }}
                  >
                    Save job + CV
                  </button>
                </div>
              )}
              <div style={{ marginTop: 18, borderTop: '1px solid #1a2540', paddingTop: 14 }}>
                <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 8 }}>
                  SEARCH PROFILE FIT
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    value={profileId}
                    onChange={(event) => {
                      setProfileId(event.target.value);
                      setAiAnalysis(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      background: '#111c35',
                      border: '1px solid #1a2540',
                      borderRadius: 5,
                      color: '#94a3b8',
                    }}
                  >
                    <option value="">Choose profile</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={!profileId || busy}
                    onClick={() => void analyzeProfile()}
                    style={{
                      padding: '8px 10px',
                      background: 'rgba(59,130,246,.12)',
                      border: '1px solid rgba(59,130,246,.3)',
                      color: '#60a5fa',
                      borderRadius: 5,
                      cursor: 'pointer',
                    }}
                  >
                    Analyze fit
                  </button>
                </div>
                {aiAnalysis && (
                  <div
                    style={{
                      marginTop: 10,
                      background: '#111c35',
                      border: '1px solid #1a2540',
                      borderRadius: 6,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ color: '#e2e8f0', fontSize: 12 }}>
                        {aiAnalysis.score}% profile match
                      </strong>
                      <span style={badgeStyle(aiAnalysis.eligibility)}>
                        {human(aiAnalysis.eligibility)}
                      </span>
                    </div>
                    <p style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5 }}>
                      {aiAnalysis.summary}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <div className="mono" style={{ color: '#06d6a0', fontSize: 8 }}>
                          MATCHED
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.45 }}>
                          {aiAnalysis.matchedKeywords.join(', ') || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="mono" style={{ color: '#f59e0b', fontSize: 8 }}>
                          MISSING / CONCERNS
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.45 }}>
                          {[...aiAnalysis.missingKeywords, ...aiAnalysis.concerns].join('; ') ||
                            '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div>
                  <div className="mono" style={{ fontSize: 9, color: '#475569' }}>
                    JOB HISTORY
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                    Application snapshots, source revisions and lifecycle changes are retained even
                    when the original vacancy disappears.
                  </div>
                </div>
                <button
                  onClick={() => void loadHistory()}
                  style={{
                    padding: '5px 8px',
                    background: 'none',
                    border: '1px solid #1a2540',
                    borderRadius: 4,
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Refresh
                </button>
              </div>
              {historyLoading && <SkeletonRow />}
              {!historyLoading && history && (
                <div style={{ display: 'grid', gap: 12 }}>
                  <section
                    style={{ border: '1px solid #1a2540', borderRadius: 6, overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        padding: '9px 11px',
                        background: '#0a1020',
                        borderBottom: '1px solid #1a2540',
                      }}
                    >
                      <span className="mono" style={{ fontSize: 9, color: '#64748b' }}>
                        SNAPSHOTS · {history.snapshots.length}
                      </span>
                    </div>
                    {history.snapshots.length === 0 ? (
                      <div style={{ padding: 14, color: '#475569', fontSize: 11 }}>
                        No application snapshots captured yet. A snapshot is created with an
                        Application Pack.
                      </div>
                    ) : (
                      history.snapshots.map((snapshot) => (
                        <div
                          key={snapshot.id}
                          style={{ padding: '10px 12px', borderBottom: '1px solid #1a2540' }}
                        >
                          <div
                            style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}
                          >
                            <strong style={{ fontSize: 11, color: '#cbd5e1' }}>
                              {snapshot.reason ?? 'Snapshot'}
                            </strong>
                            <span className="mono" style={{ fontSize: 9, color: '#475569' }}>
                              {new Date(snapshot.capturedAt).toLocaleString()}
                            </span>
                          </div>
                          {snapshot.sourceUrl && (
                            <div
                              className="mono"
                              style={{
                                fontSize: 9,
                                color: '#3b82f6',
                                marginTop: 4,
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {snapshot.sourceUrl}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </section>
                  <section
                    style={{ border: '1px solid #1a2540', borderRadius: 6, overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        padding: '9px 11px',
                        background: '#0a1020',
                        borderBottom: '1px solid #1a2540',
                      }}
                    >
                      <span className="mono" style={{ fontSize: 9, color: '#64748b' }}>
                        SOURCE REVISIONS
                      </span>
                    </div>
                    {history.listings.flatMap((listing) =>
                      listing.revisions.map((revision) => ({
                        revision,
                        source: listing.source.name,
                      })),
                    ).length === 0 ? (
                      <div style={{ padding: 14, color: '#475569', fontSize: 11 }}>
                        No source revisions recorded.
                      </div>
                    ) : (
                      history.listings.flatMap((listing) =>
                        listing.revisions.map((revision) => (
                          <div
                            key={revision.id}
                            style={{ padding: '10px 12px', borderBottom: '1px solid #1a2540' }}
                          >
                            <div
                              style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}
                            >
                              <strong style={{ fontSize: 11, color: '#cbd5e1' }}>
                                {listing.source.name}
                              </strong>
                              <span className="mono" style={{ fontSize: 9, color: '#475569' }}>
                                {new Date(revision.detectedAt).toLocaleString()}
                              </span>
                            </div>
                            <div
                              className="mono"
                              style={{ fontSize: 8, color: '#334155', marginTop: 4 }}
                            >
                              CONTENT {revision.contentHash.slice(0, 12)}
                            </div>
                          </div>
                        )),
                      )
                    )}
                  </section>
                  <section
                    style={{ border: '1px solid #1a2540', borderRadius: 6, overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        padding: '9px 11px',
                        background: '#0a1020',
                        borderBottom: '1px solid #1a2540',
                      }}
                    >
                      <span className="mono" style={{ fontSize: 9, color: '#64748b' }}>
                        STATUS EVENTS · {history.statusEvents.length}
                      </span>
                    </div>
                    {history.statusEvents.length === 0 ? (
                      <div style={{ padding: 14, color: '#475569', fontSize: 11 }}>
                        No lifecycle events recorded.
                      </div>
                    ) : (
                      history.statusEvents.map((event) => (
                        <div
                          key={event.id}
                          style={{
                            padding: '10px 12px',
                            borderBottom: '1px solid #1a2540',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {human(event.type)}
                          </span>
                          <span className="mono" style={{ fontSize: 9, color: '#475569' }}>
                            {new Date(event.occurredAt).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </section>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default function Jobs({ filter, activeProfileId = '', onChanged, onNavigate }: Props) {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'remote' | 'unvisited' | 'applied'>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [freshness, setFreshness] = useState('');
  const [status, setStatus] = useState('');
  const [disposition, setDisposition] = useState('');
  const [visited, setVisited] = useState('');
  const [applied, setApplied] = useState('');
  const [applicationStage, setApplicationStage] = useState('');
  const [addedWithinDays, setAddedWithinDays] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sources, setSources] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    void Promise.all([
      api<{ sources: Array<{ id: string; name: string }> }>('/api/sources'),
      api<{ categories: CategoryOption[] }>('/api/profiles/categories'),
    ])
      .then(([sourceResponse, categoryResponse]) => {
        setSources(sourceResponse.sources);
        setCategories(categoryResponse.categories);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const pendingJobId = sessionStorage.getItem('jobintel-open-job');
    if (!pendingJobId) return;
    sessionStorage.removeItem('jobintel-open-job');
    setSelectedId(pendingJobId);
  }, []);

  async function load(nextPage = page) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(nextPage), limit: '30' });
    if (search.trim()) params.set('q', search.trim());
    if (activeProfileId) params.set('profileId', activeProfileId);
    if (freshness) params.set('freshness', freshness);
    if (status) params.set('status', status);
    if (disposition) params.set('disposition', disposition);
    if (visited) params.set('visited', visited);
    if (applied) params.set('applied', applied);
    if (applicationStage) params.set('applicationStage', applicationStage);
    if (addedWithinDays) params.set('addedWithinDays', addedWithinDays);
    if (sourceId) params.set('sourceId', sourceId);
    if (categoryId) params.set('categoryId', categoryId);
    if (viewFilter === 'remote') params.set('remoteType', 'REMOTE');
    if (filter === 'new') params.set('addedWithinDays', '1');
    if (filter === 'favorites') params.set('disposition', 'SAVED');
    if (filter === 'risk') params.set('status', 'SCAM');
    if (filter === 'expired') params.set('status', 'EXPIRED');
    if (viewFilter === 'unvisited') params.set('visited', 'false');
    if (viewFilter === 'applied') params.set('applied', 'true');
    try {
      const response = await api<JobsResponse>(`/api/jobs?${params}`);
      setJobs(response.jobs);
      setPagination(response.pagination);
      setPage(response.pagination.page);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setPage(1);
    void load(1);
  }, [
    activeProfileId,
    filter,
    viewFilter,
    freshness,
    status,
    disposition,
    visited,
    applied,
    applicationStage,
    addedWithinDays,
    sourceId,
    categoryId,
  ]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      void load(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const visibleJobs = useMemo(() => jobs, [jobs]);
  const title =
    filter === 'new'
      ? 'New Jobs Today'
      : filter === 'favorites'
        ? 'Favorites'
        : filter === 'risk'
          ? 'Scam / Risk Jobs'
          : filter === 'expired'
            ? 'Expired Jobs'
            : 'All Jobs';
  const multiSite = visibleJobs.filter((job) => job.listings.length > 1).length;

  return (
    <div style={{ padding: '28px 32px' }}>
      {selectedId && (
        <JobDetailDrawer
          jobId={selectedId}
          activeProfileId={activeProfileId}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            void load();
            onChanged();
          }}
          onNavigate={onNavigate}
        />
      )}
      {shareOpen && selected.size > 0 && (
        <ShareJobsModal jobIds={[...selected]} onClose={() => setShareOpen(false)} />
      )}
      {manualOpen && (
        <ManualJobModal
          onClose={() => setManualOpen(false)}
          onSaved={() => {
            void load();
            onChanged();
          }}
          onOpenExisting={(jobId) => setSelectedId(jobId)}
        />
      )}
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e2e8f0' }}>{title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
            {pagination.total.toLocaleString()} jobs · {multiSite} multi-source in this page
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setSelected(new Set(visibleJobs.map((job) => job.id)))}
            style={{
              padding: '7px 14px',
              background: 'none',
              border: '1px solid #1a2540',
              borderRadius: 5,
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            ☑ Select page
          </button>
          {selected.size > 0 && (
            <button
              onClick={() => setShareOpen(true)}
              style={{
                padding: '7px 14px',
                background: 'rgba(59,130,246,.1)',
                border: '1px solid rgba(59,130,246,.3)',
                borderRadius: 5,
                color: '#60a5fa',
                cursor: 'pointer',
              }}
            >
              Share {selected.size}
            </button>
          )}
          <button
            onClick={() => setManualOpen(true)}
            style={{
              padding: '7px 14px',
              background: '#3b82f6',
              border: 0,
              borderRadius: 5,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            + Add Job
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search jobs, companies…"
          style={{
            flex: 1,
            minWidth: 220,
            maxWidth: 340,
            padding: '7px 12px',
            background: '#0d1425',
            border: '1px solid #1a2540',
            borderRadius: 5,
            color: '#e2e8f0',
            outline: 'none',
          }}
        />
        {(
          [
            ['all', 'All'],
            ['remote', 'Remote'],
            ['unvisited', 'Unvisited'],
            ['applied', 'Applied'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setViewFilter(key)}
            style={{
              padding: '7px 14px',
              background: viewFilter === key ? 'rgba(59,130,246,0.12)' : 'none',
              border: `1px solid ${viewFilter === key ? '#3b82f6' : '#1a2540'}`,
              borderRadius: 5,
              color: viewFilter === key ? '#3b82f6' : '#64748b',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setFiltersOpen((value) => !value)}
          style={{
            padding: '7px 14px',
            background: filtersOpen ? 'rgba(139,92,246,.1)' : 'none',
            border: `1px solid ${filtersOpen ? '#8b5cf6' : '#1a2540'}`,
            borderRadius: 5,
            color: filtersOpen ? '#a78bfa' : '#64748b',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          ⌁ Filters
        </button>
      </div>
      {filtersOpen && (
        <div
          className="data-card"
          style={{
            borderRadius: 6,
            padding: 12,
            marginBottom: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(4,minmax(140px,1fr))',
            gap: 8,
          }}
        >
          {[
            [
              'Posting age',
              freshness,
              setFreshness,
              [
                ['', 'Any age'],
                ['NEW', 'New'],
                ['RECENT', 'Recent'],
                ['AGING', 'Aging'],
                ['OLD', 'Old'],
                ['VERY_OLD', 'Very old'],
              ],
            ],
            [
              'Job status',
              status,
              setStatus,
              [
                ['', 'Any status'],
                ['ACTIVE', 'Active'],
                ['EXPIRED', 'Expired'],
                ['CLOSED', 'Closed'],
                ['SCAM', 'Scam'],
                ['UNKNOWN', 'Unknown'],
              ],
            ],
            [
              'Your list',
              disposition,
              setDisposition,
              [
                ['', 'Any'],
                ['SAVED', 'Saved'],
                ['IGNORED', 'Ignored'],
                ['ARCHIVED', 'Archived'],
              ],
            ],
            [
              'Review state',
              visited,
              setVisited,
              [
                ['', 'Any'],
                ['false', 'Unvisited'],
                ['true', 'Visited'],
              ],
            ],
            [
              'Application',
              applied,
              setApplied,
              [
                ['', 'Any'],
                ['false', 'Not applied'],
                ['true', 'Applied'],
              ],
            ],
            [
              'Added to system',
              addedWithinDays,
              setAddedWithinDays,
              [
                ['', 'Any time'],
                ['1', 'Today'],
                ['3', 'Last 3 days'],
                ['7', 'Last 7 days'],
                ['14', 'Last 14 days'],
                ['30', 'Last 30 days'],
              ],
            ],
          ].map(([label, value, setter, options]) => (
            <label key={String(label)}>
              <span
                className="mono"
                style={{ display: 'block', fontSize: 8, color: '#475569', marginBottom: 4 }}
              >
                {String(label).toUpperCase()}
              </span>
              <select
                value={value as string}
                onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                style={{
                  width: '100%',
                  padding: 7,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 4,
                  color: '#94a3b8',
                  fontSize: 10,
                }}
              >
                {(options as string[][]).map(([key, text]) => (
                  <option key={key} value={key}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 8, color: '#475569', marginBottom: 4 }}
            >
              APPLICATION STAGE
            </span>
            <select
              value={applicationStage}
              onChange={(event) => setApplicationStage(event.target.value)}
              style={{
                width: '100%',
                padding: 7,
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 4,
                color: '#94a3b8',
                fontSize: 10,
              }}
            >
              <option value="">Any stage</option>
              {[
                'APPLIED',
                'SCREENING',
                'INTERVIEW_SCHEDULED',
                'INTERVIEWED',
                'SECOND_INTERVIEW',
                'FINAL_INTERVIEW',
                'OFFER',
                'ACCEPTED',
                'DECLINED',
                'REJECTED',
                'WITHDRAWN',
                'NO_RESPONSE',
                'CLOSED',
              ].map((stage) => (
                <option key={stage} value={stage}>
                  {human(stage)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 8, color: '#475569', marginBottom: 4 }}
            >
              JOB SOURCE
            </span>
            <select
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              style={{
                width: '100%',
                padding: 7,
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 4,
                color: '#94a3b8',
                fontSize: 10,
              }}
            >
              <option value="">Any Job Source</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 8, color: '#475569', marginBottom: 4 }}
            >
              CATEGORY
            </span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              style={{
                width: '100%',
                padding: 7,
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 4,
                color: '#94a3b8',
                fontSize: 10,
              }}
            >
              <option value="">Any category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              onClick={() => {
                setFreshness('');
                setStatus('');
                setDisposition('');
                setVisited('');
                setApplied('');
                setApplicationStage('');
                setAddedWithinDays('');
                setSourceId('');
                setCategoryId('');
              }}
              style={{
                width: '100%',
                padding: 7,
                background: 'none',
                border: '1px solid #1a2540',
                borderRadius: 4,
                color: '#64748b',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      <PriorityQueuePanel
        activeProfileId={activeProfileId}
        onOpen={(jobId) => setSelectedId(jobId)}
      />

      <div className="data-card table-wrap" style={{ borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1050 }}>
          <thead>
            <tr style={{ background: '#0a1020', borderBottom: '1px solid #1a2540' }}>
              {[
                '',
                'Title',
                'Company',
                'Location',
                'Salary',
                'Category',
                'Sources',
                'Posted',
                'Freshness',
                'Application',
              ].map((heading) => (
                <th
                  key={heading}
                  className="mono"
                  style={{
                    padding: '9px 16px',
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
            {loading
              ? Array.from({ length: 6 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={10}>
                      <SkeletonRow />
                    </td>
                  </tr>
                ))
              : visibleJobs.map((job, index) => {
                  const userState = job.userStates[0];
                  const app = job.applications[0];
                  return (
                    <tr
                      key={job.id}
                      className="tr-hover"
                      onClick={() => setSelectedId(job.id)}
                      style={{
                        borderBottom: index < visibleJobs.length - 1 ? '1px solid #1a2540' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <td style={{ padding: '10px 8px 10px 16px' }}>
                        <input
                          type="checkbox"
                          checked={selected.has(job.id)}
                          onChange={(event) =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (event.target.checked) next.add(job.id);
                              else next.delete(job.id);
                              return next;
                            })
                          }
                          onClick={(event) => event.stopPropagation()}
                          style={{ accentColor: '#3b82f6' }}
                        />
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {userState?.disposition === 'SAVED' && (
                            <span style={{ color: '#f59e0b', fontSize: 11 }}>★</span>
                          )}
                          {!userState?.firstViewedAt && (
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                background: '#3b82f6',
                              }}
                            />
                          )}
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>
                            {job.title}
                          </span>
                          {job.profileMatches?.[0]?.score != null && (
                            <span
                              className="mono"
                              title={`${human(job.profileMatches[0].eligibility)} · analyzed ${date(job.profileMatches[0].matchedAt)}`}
                              style={{
                                fontSize: 8,
                                color: job.profileMatches[0].score! >= 75 ? '#06d6a0' : '#f59e0b',
                                border: '1px solid #1a2540',
                                borderRadius: 3,
                                padding: '1px 4px',
                              }}
                            >
                              {Math.round(job.profileMatches[0].score!)}% fit
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#94a3b8' }}>
                        {job.company?.name ?? 'Unknown'}
                      </td>
                      <td
                        style={{
                          padding: '10px 16px',
                          fontSize: 12,
                          color: job.remoteType === 'REMOTE' ? '#06d6a0' : '#64748b',
                        }}
                      >
                        {job.locationText ?? human(job.remoteType)}
                      </td>
                      <td
                        className="mono"
                        style={{ padding: '10px 16px', fontSize: 10, color: '#64748b' }}
                      >
                        {job.salaryText ?? '—'}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: '#64748b' }}>
                        {job.primaryCategory?.name ?? '—'}
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: '10px 16px',
                          fontSize: 11,
                          color: job.listings.length > 1 ? '#3b82f6' : '#475569',
                        }}
                      >
                        {job.listings.length}
                      </td>
                      <td
                        className="mono"
                        style={{ padding: '10px 16px', fontSize: 10, color: '#475569' }}
                      >
                        {date(job.earliestPostedAt)}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={badgeStyle(job.freshnessStatus)}>
                          {human(job.freshnessStatus)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {app ? (
                          <span style={badgeStyle(app.stage)}>{human(app.stage)}</span>
                        ) : (
                          <span style={badgeStyle('UNKNOWN')}>Not Applied</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            {!loading && visibleJobs.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <EmptyState
                    icon="◈"
                    title="No jobs match this view"
                    desc="Change the filter, search another term, or add/discover more sources."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={pagination.page}
          total={pagination.total}
          pageSize={pagination.limit}
          onChange={(next) => void load(next)}
        />
      </div>
    </div>
  );
}
