import { useEffect, useMemo, useState } from 'react';

import { api } from '../api/client';
import { ApplicationIntelligencePanel } from '../components/ApplicationIntelligencePanel';
import { EmptyState, Pagination, SkeletonRow } from '../components/UI';
import { useToast } from '../components/Toast';

type ApplicationStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEWED'
  | 'SECOND_INTERVIEW'
  | 'FINAL_INTERVIEW'
  | 'OFFER'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'NO_RESPONSE'
  | 'CLOSED';
interface ApplicationSummary {
  id: string;
  stage: ApplicationStage;
  appliedAt: string;
  lastActivityAt: string;
  whereAppliedUrl?: string | null;
  job: { id: string; title: string; company?: { name: string } | null };
  sourceListing?: { source?: { id: string; name: string } | null } | null;
  foundSource?: { id: string; name: string } | null;
  appliedSource?: { id: string; name: string } | null;
  searchProfile?: { id: string; name: string } | null;
  cvVersion?: {
    id: string;
    versionNumber: number;
    label?: string | null;
    cv: { id: string; name: string };
  } | null;
  events: Array<{ id: string; type: string; occurredAt: string; note?: string | null }>;
}
interface ApplicationDetail extends ApplicationSummary {
  events: Array<{ id: string; type: string; occurredAt: string; note?: string | null }>;
  notes: Array<{ id: string; note: string; createdAt: string }>;
}
interface ApplicationsResponse {
  applications: ApplicationSummary[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

const STAGES: ApplicationStage[] = [
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
];
const LABEL: Record<ApplicationStage, string> = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW_SCHEDULED: 'Interview scheduled',
  INTERVIEWED: 'Interviewed',
  SECOND_INTERVIEW: 'Second interview',
  FINAL_INTERVIEW: 'Final interview',
  OFFER: 'Offer',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  NO_RESPONSE: 'No response',
  CLOSED: 'Closed',
};
const COLOR: Record<ApplicationStage, string> = {
  APPLIED: '#3b82f6',
  SCREENING: '#f59e0b',
  INTERVIEW_SCHEDULED: '#8b5cf6',
  INTERVIEWED: '#8b5cf6',
  SECOND_INTERVIEW: '#8b5cf6',
  FINAL_INTERVIEW: '#8b5cf6',
  OFFER: '#06d6a0',
  ACCEPTED: '#06d6a0',
  DECLINED: '#64748b',
  REJECTED: '#ef4444',
  WITHDRAWN: '#64748b',
  NO_RESPONSE: '#f59e0b',
  CLOSED: '#64748b',
};
const KANBAN: Array<{ label: string; stages: ApplicationStage[] }> = [
  { label: 'Applied', stages: ['APPLIED'] },
  { label: 'Screening', stages: ['SCREENING'] },
  {
    label: 'Interviewing',
    stages: ['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW'],
  },
  { label: 'Offer', stages: ['OFFER', 'ACCEPTED'] },
  { label: 'Closed', stages: ['DECLINED', 'REJECTED', 'WITHDRAWN', 'NO_RESPONSE', 'CLOSED'] },
];

function Badge({ stage }: { stage: ApplicationStage }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 9,
        color: COLOR[stage],
        border: `1px solid ${COLOR[stage]}44`,
        background: `${COLOR[stage]}12`,
        padding: '2px 6px',
        borderRadius: 3,
        textTransform: 'uppercase',
      }}
    >
      {LABEL[stage]}
    </span>
  );
}
function fmt(date?: string | null) {
  return date
    ? new Date(date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
}

function Drawer({
  applicationId,
  onClose,
  onChanged,
  onOpenPack,
}: {
  applicationId: string;
  onClose: () => void;
  onChanged: () => void;
  onOpenPack: () => void;
}) {
  const toast = useToast();
  const [item, setItem] = useState<ApplicationDetail | null>(null);
  const [stage, setStage] = useState<ApplicationStage>('APPLIED');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState<
    Array<{ id: string; name: string; systemOwned?: boolean }>
  >([]);
  const [foundSourceId, setFoundSourceId] = useState('');
  const [appliedSourceId, setAppliedSourceId] = useState('');
  async function load() {
    try {
      const [response, sourceResponse] = await Promise.all([
        api<{ application: ApplicationDetail }>(`/api/applications/${applicationId}`),
        api<{ sources: Array<{ id: string; name: string; systemOwned?: boolean }> }>(
          '/api/sources',
        ),
      ]);
      setItem(response.application);
      setStage(response.application.stage);
      setSources(sourceResponse.sources);
      const unclassifiedId = sourceResponse.sources.find((source) => source.systemOwned)?.id ?? '';
      setFoundSourceId(
        response.application.foundSource?.id ??
          response.application.sourceListing?.source?.id ??
          unclassifiedId,
      );
      setAppliedSourceId(
        response.application.appliedSource?.id ??
          response.application.sourceListing?.source?.id ??
          unclassifiedId,
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to load application.');
    }
  }
  useEffect(() => {
    void load();
  }, [applicationId]);

  async function changeStage() {
    if (!item || stage === item.stage) return;
    setBusy(true);
    try {
      await api(`/api/applications/${item.id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      });
      toast.success(`Application moved to ${LABEL[stage]}.`);
      await load();
      onChanged();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update stage.');
    } finally {
      setBusy(false);
    }
  }
  async function saveAttribution() {
    if (!item) return;
    setBusy(true);
    try {
      await api(`/api/applications/${item.id}/attribution`, {
        method: 'PATCH',
        body: JSON.stringify({
          foundSourceId: foundSourceId || null,
          appliedSourceId: appliedSourceId || null,
        }),
      });
      toast.success('Found via and Applied via updated.');
      await load();
      onChanged();
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'Application attribution could not be updated.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!item || !note.trim()) return;
    setBusy(true);
    try {
      await api(`/api/applications/${item.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() }),
      });
      setNote('');
      toast.success('Note added.');
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not add note.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7,11,20,.82)',
        zIndex: 300,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        style={{
          width: 'min(560px,100vw)',
          height: '100%',
          background: '#0d1425',
          borderLeft: '1px solid #1a2540',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!item ? (
          <div style={{ padding: 24, color: '#64748b' }}>Loading application…</div>
        ) : (
          <>
            <div
              style={{
                padding: '18px 22px',
                borderBottom: '1px solid #1a2540',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>
                  {item.job.title}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                  {item.job.company?.name ?? 'Unknown company'} · Applied {fmt(item.appliedAt)}
                </div>
                <div style={{ marginTop: 8 }}>
                  <Badge stage={item.stage} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <button
                  onClick={onOpenPack}
                  style={{
                    padding: '6px 9px',
                    background: 'rgba(139,92,246,.10)',
                    border: '1px solid rgba(139,92,246,.28)',
                    color: '#a78bfa',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 10,
                  }}
                >
                  Application Pack
                </button>
                <button
                  onClick={onClose}
                  style={{
                    background: 'none',
                    border: 0,
                    color: '#64748b',
                    fontSize: 18,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1 }}>
              <div className="data-card" style={{ padding: 14, borderRadius: 6, marginBottom: 14 }}>
                <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 10 }}>
                  APPLICATION CONTEXT
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr',
                    gap: '7px 12px',
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: '#475569' }}>Found via</span>
                  <select
                    value={foundSourceId}
                    onChange={(event) => setFoundSourceId(event.target.value)}
                    style={{
                      background: '#111c35',
                      border: '1px solid #1a2540',
                      borderRadius: 4,
                      color: '#94a3b8',
                      padding: '5px 7px',
                      fontSize: 10,
                    }}
                  >
                    {!sources.some((source) => source.systemOwned) && (
                      <option value="">Unclassified</option>
                    )}
                    {sources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                  <span style={{ color: '#475569' }}>Applied via</span>
                  <select
                    value={appliedSourceId}
                    onChange={(event) => setAppliedSourceId(event.target.value)}
                    style={{
                      background: '#111c35',
                      border: '1px solid #1a2540',
                      borderRadius: 4,
                      color: '#94a3b8',
                      padding: '5px 7px',
                      fontSize: 10,
                    }}
                  >
                    {!sources.some((source) => source.systemOwned) && (
                      <option value="">Unclassified</option>
                    )}
                    {sources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                  <span></span>
                  <button
                    onClick={() => void saveAttribution()}
                    disabled={busy}
                    style={{
                      justifySelf: 'start',
                      padding: '5px 8px',
                      background: 'none',
                      border: '1px solid #1a2540',
                      borderRadius: 4,
                      color: '#60a5fa',
                      cursor: 'pointer',
                      fontSize: 9,
                    }}
                  >
                    Save source attribution
                  </button>
                  <span style={{ color: '#475569' }}>Search profile</span>
                  <span style={{ color: '#94a3b8' }}>{item.searchProfile?.name ?? '—'}</span>
                  <span style={{ color: '#475569' }}>CV submitted</span>
                  <span style={{ color: item.cvVersion ? '#06d6a0' : '#f59e0b' }}>
                    {item.cvVersion
                      ? `${item.cvVersion.cv.name} · v${item.cvVersion.versionNumber}${item.cvVersion.label ? ` · ${item.cvVersion.label}` : ''}`
                      : 'Not recorded'}
                  </span>
                  <span style={{ color: '#475569' }}>Application URL</span>
                  <span>
                    {item.whereAppliedUrl ? (
                      <a
                        href={item.whereAppliedUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#60a5fa' }}
                      >
                        Open portal ↗
                      </a>
                    ) : (
                      <span style={{ color: '#475569' }}>—</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="data-card" style={{ padding: 14, borderRadius: 6, marginBottom: 14 }}>
                <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 10 }}>
                  UPDATE STAGE
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={stage}
                    onChange={(event) => setStage(event.target.value as ApplicationStage)}
                    style={{
                      flex: 1,
                      background: '#111c35',
                      border: '1px solid #1a2540',
                      color: '#e2e8f0',
                      borderRadius: 4,
                      padding: '7px 8px',
                      fontSize: 11,
                    }}
                  >
                    {STAGES.map((value) => (
                      <option key={value} value={value}>
                        {LABEL[value]}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={busy || stage === item.stage}
                    onClick={() => void changeStage()}
                    style={{
                      background: '#3b82f6',
                      border: 0,
                      color: '#fff',
                      borderRadius: 4,
                      padding: '7px 12px',
                      cursor: 'pointer',
                      opacity: busy || stage === item.stage ? 0.4 : 1,
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div
                className="data-card"
                style={{ borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}
              >
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #1a2540' }}>
                  <span className="mono" style={{ fontSize: 9, color: '#475569' }}>
                    HISTORY
                  </span>
                </div>
                {item.events.length === 0 ? (
                  <div style={{ padding: 14, color: '#475569', fontSize: 11 }}>
                    No events recorded.
                  </div>
                ) : (
                  item.events.map((event, index) => (
                    <div
                      key={event.id}
                      style={{
                        padding: '11px 14px',
                        display: 'grid',
                        gridTemplateColumns: '16px 110px 1fr',
                        gap: 9,
                        borderBottom: index < item.events.length - 1 ? '1px solid #1a2540' : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#3b82f6',
                          marginTop: 3,
                        }}
                      />
                      <div className="mono" style={{ fontSize: 9, color: '#64748b' }}>
                        {fmt(event.occurredAt)}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                          {event.type.replaceAll('_', ' ')}
                        </div>
                        {event.note && (
                          <div
                            style={{
                              fontSize: 10,
                              color: '#64748b',
                              marginTop: 3,
                              lineHeight: 1.4,
                            }}
                          >
                            {event.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="data-card" style={{ padding: 14, borderRadius: 6 }}>
                <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 8 }}>
                  NOTES
                </div>
                {item.notes.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      fontSize: 11,
                      color: '#94a3b8',
                      lineHeight: 1.5,
                      padding: '8px 0',
                      borderBottom: '1px solid #1a2540',
                    }}
                  >
                    {entry.note}
                    <div className="mono" style={{ fontSize: 9, color: '#334155', marginTop: 4 }}>
                      {fmt(entry.createdAt)}
                    </div>
                  </div>
                ))}
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add interview notes, follow-up details, recruiter feedback…"
                  rows={3}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    background: '#111c35',
                    border: '1px solid #1a2540',
                    borderRadius: 4,
                    color: '#e2e8f0',
                    padding: 9,
                    resize: 'vertical',
                    fontSize: 11,
                  }}
                />
                <button
                  onClick={() => void addNote()}
                  disabled={busy || !note.trim()}
                  style={{
                    marginTop: 7,
                    padding: '6px 10px',
                    background: '#111c35',
                    border: '1px solid #243050',
                    color: '#94a3b8',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Add note
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Applications({
  filter,
  activeProfileId,
  onChanged,
}: {
  filter: 'all' | 'applied' | 'interviewing' | 'rejected' | 'offers';
  activeProfileId: string;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [response, setResponse] = useState<ApplicationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'table' | 'board'>('table');
  const [selected, setSelected] = useState<string | null>(null);
  const [packApplicationId, setPackApplicationId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (activeProfileId) params.set('profileId', activeProfileId);
      if (q.trim()) params.set('q', q.trim());
      const result = await api<ApplicationsResponse>(`/api/applications?${params}`);
      setResponse(result);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to load applications.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [activeProfileId, page]);
  useEffect(() => {
    const pendingApplicationId = sessionStorage.getItem('jobintel-open-application');
    if (!pendingApplicationId) return;
    sessionStorage.removeItem('jobintel-open-application');
    setSelected(pendingApplicationId);
  }, []);

  const apps = useMemo(
    () =>
      (response?.applications ?? []).filter((item) => {
        if (filter === 'applied') return item.stage === 'APPLIED';
        if (filter === 'interviewing')
          return [
            'INTERVIEW_SCHEDULED',
            'INTERVIEWED',
            'SECOND_INTERVIEW',
            'FINAL_INTERVIEW',
          ].includes(item.stage);
        if (filter === 'rejected') return item.stage === 'REJECTED';
        if (filter === 'offers') return ['OFFER', 'ACCEPTED'].includes(item.stage);
        return true;
      }),
    [response, filter],
  );

  async function quickStage(id: string, stage: ApplicationStage) {
    try {
      await api(`/api/applications/${id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      });
      toast.success(`Application moved to ${LABEL[stage]}.`);
      await load();
      onChanged();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not update application.');
    }
  }

  return (
    <div style={{ padding: '26px 30px' }}>
      {selected && (
        <Drawer
          applicationId={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            void load();
            onChanged();
          }}
          onOpenPack={() => setPackApplicationId(selected)}
        />
      )}
      {packApplicationId && (
        <ApplicationIntelligencePanel
          applicationId={packApplicationId}
          onClose={() => setPackApplicationId(null)}
        />
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: '#e2e8f0', fontWeight: 600 }}>
            Applications
          </h1>
          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 12 }}>
            Everything after you apply: response, interviews, offers, rejection and the exact CV
            sent.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setView('table')}
            style={{
              padding: '6px 10px',
              border: `1px solid ${view === 'table' ? '#3b82f6' : '#1a2540'}`,
              background: view === 'table' ? 'rgba(59,130,246,.12)' : 'none',
              color: view === 'table' ? '#60a5fa' : '#64748b',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Table
          </button>
          <button
            onClick={() => setView('board')}
            style={{
              padding: '6px 10px',
              border: `1px solid ${view === 'board' ? '#3b82f6' : '#1a2540'}`,
              background: view === 'board' ? 'rgba(59,130,246,.12)' : 'none',
              color: view === 'board' ? '#60a5fa' : '#64748b',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Pipeline
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && void load()}
          placeholder="Search role or company…"
          style={{
            width: 320,
            padding: '7px 10px',
            background: '#111c35',
            border: '1px solid #1a2540',
            borderRadius: 5,
            color: '#e2e8f0',
            fontSize: 11,
          }}
        />
        <button
          onClick={() => {
            setPage(1);
            void load();
          }}
          style={{
            padding: '7px 12px',
            background: '#111c35',
            border: '1px solid #1a2540',
            color: '#94a3b8',
            borderRadius: 5,
            cursor: 'pointer',
          }}
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="data-card" style={{ borderRadius: 6 }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonRow key={index} />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="data-card" style={{ borderRadius: 6 }}>
          <EmptyState
            icon="◉"
            title="No applications in this view"
            desc="Applications appear here as soon as a job is marked applied."
          />
        </div>
      ) : view === 'table' ? (
        <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(210px,1.8fr) 125px 100px 125px 125px 145px 28px',
              gap: 10,
              padding: '9px 14px',
              borderBottom: '1px solid #1a2540',
            }}
          >
            {['Role', 'Stage', 'Applied', 'Found via', 'Applied via', 'CV used', ''].map((item) => (
              <span
                key={item}
                className="mono"
                style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase' }}
              >
                {item}
              </span>
            ))}
          </div>
          {apps.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelected(item.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(210px,1.8fr) 125px 100px 125px 125px 145px 28px',
                gap: 10,
                alignItems: 'center',
                padding: '11px 14px',
                borderBottom: '1px solid #1a2540',
                cursor: 'pointer',
              }}
              onMouseEnter={(event) => (event.currentTarget.style.background = '#0f172a')}
              onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
                  {item.job.title}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                  {item.job.company?.name ?? 'Unknown organization'}
                </div>
              </div>
              <div>
                <Badge stage={item.stage} />
              </div>
              <div className="mono" style={{ fontSize: 10, color: '#64748b' }}>
                {fmt(item.appliedAt)}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>
                {item.foundSource?.name ?? item.sourceListing?.source?.name ?? 'Unclassified'}
              </div>
              <div style={{ fontSize: 10, color: '#60a5fa' }}>
                {item.appliedSource?.name ?? item.sourceListing?.source?.name ?? 'Unclassified'}
              </div>
              <div style={{ fontSize: 10, color: item.cvVersion ? '#94a3b8' : '#f59e0b' }}>
                {item.cvVersion
                  ? `${item.cvVersion.cv.name} · v${item.cvVersion.versionNumber}`
                  : 'Not recorded'}
              </div>
              <div style={{ color: '#475569' }}>›</div>
            </div>
          ))}
          {response && (
            <Pagination
              page={page}
              total={response.pagination.total}
              pageSize={response.pagination.limit}
              onChange={setPage}
            />
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
          {KANBAN.map((column) => (
            <div
              key={column.label}
              style={{
                minWidth: 220,
                flex: 1,
                border: '1px solid #1a2540',
                borderRadius: 6,
                background: '#080d1c',
                overflow: 'hidden',
              }}
            >
              <div
                className="mono"
                style={{
                  padding: '9px 11px',
                  borderBottom: '1px solid #1a2540',
                  color: '#64748b',
                  fontSize: 9,
                  textTransform: 'uppercase',
                }}
              >
                {column.label} · {apps.filter((item) => column.stages.includes(item.stage)).length}
              </div>
              <div style={{ padding: 7, display: 'grid', gap: 7 }}>
                {apps
                  .filter((item) => column.stages.includes(item.stage))
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelected(item.id)}
                      style={{
                        padding: '9px 10px',
                        border: '1px solid #1a2540',
                        background: '#0d1425',
                        borderRadius: 5,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>
                        {item.job.title}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', margin: '2px 0 7px' }}>
                        {item.job.company?.name ?? 'Unknown company'}
                      </div>
                      <Badge stage={item.stage} />
                      {column.label === 'Applied' && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            void quickStage(item.id, 'SCREENING');
                          }}
                          style={{
                            display: 'block',
                            marginTop: 7,
                            border: 0,
                            background: 'none',
                            color: '#60a5fa',
                            fontSize: 9,
                            padding: 0,
                            cursor: 'pointer',
                          }}
                        >
                          Move to screening →
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
