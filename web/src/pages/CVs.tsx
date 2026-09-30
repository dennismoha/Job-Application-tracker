import { FormEvent, useEffect, useMemo, useState } from 'react';

import { api, apiBlob, downloadBlob } from '../api/client';
import { EmptyState, FileUploader } from '../components/UI';
import { useToast } from '../components/Toast';
import type {
  CvSummary,
  CvTailoringSession,
  CvTailoringSuggestion,
  CvVersionSummary,
} from '../types/cvs';
import type { SearchProfileSummary } from '../types/jobs';

interface VersionDetail extends CvVersionSummary {
  cv: { id: string; name: string };
  originalFileName?: string | null;
  mimeType?: string | null;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? '').split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}
function fmt(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function Modal({
  children,
  onClose,
  width = 760,
}: {
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7,11,20,.86)',
        zIndex: 350,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        style={{
          width: `min(${width}px, 96vw)`,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#0d1425',
          border: '1px solid #1a2540',
          borderRadius: 8,
          boxShadow: '0 24px 80px rgba(0,0,0,.5)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TailoringWorkspace({
  sessionId,
  onClose,
  onSaved,
}: {
  sessionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [session, setSession] = useState<CvTailoringSession | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Record<string, string>>({});
  async function load() {
    try {
      const r = await api<{ session: CvTailoringSession }>(`/api/cvs/tailoring/${sessionId}`);
      setSession(r.session);
      setText(r.session.workingText);
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Unable to load tailoring session.');
    }
  }
  useEffect(() => {
    void load();
  }, [sessionId]);
  const baseText = session?.baseCvVersion.plainText ?? '';
  const baseLines = Math.max(1, baseText.split('\n').length),
    lines = Math.max(1, text.split('\n').length);
  const growth = baseText
    ? Math.round(((text.length - baseText.length) / Math.max(1, baseText.length)) * 100)
    : 0;
  const layoutRisk = growth > 10 || lines > baseLines + 6;
  async function saveDraft() {
    if (!session) return;
    setBusy(true);
    try {
      const r = await api<{ session: CvTailoringSession }>(`/api/cvs/tailoring/${session.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ workingText: text }),
      });
      setSession(r.session);
      toast.success('Draft saved.');
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not save draft.');
    } finally {
      setBusy(false);
    }
  }
  async function suggestionAction(s: CvTailoringSuggestion, status: 'ACCEPTED' | 'IGNORED') {
    const confirmed = confirmation[s.id]?.trim();
    try {
      const r = await api<{ suggestion: CvTailoringSuggestion }>(
        `/api/cvs/tailoring/suggestions/${s.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status,
            ...(s.requiresConfirmation && status === 'ACCEPTED'
              ? { confirmedFact: confirmed }
              : {}),
          }),
        },
      );
      if (status === 'ACCEPTED' && r.suggestion.afterText?.trim()) {
        const next = `${text.trim()}\n\n${r.suggestion.afterText.trim()}`.trim();
        setText(next);
        await api(`/api/cvs/tailoring/${session!.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ workingText: next }),
        });
      }
      await load();
      toast.success(status === 'ACCEPTED' ? 'Suggestion added to draft.' : 'Suggestion ignored.');
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not update suggestion.');
    }
  }
  async function saveVersion() {
    if (!session) return;
    setBusy(true);
    try {
      await api(`/api/cvs/tailoring/${session.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ workingText: text }),
      });
      const r = await api<{ version: { id: string } }>(`/api/cvs/tailoring/${session.id}/save`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      toast.success('New CV version saved.');
      onSaved();
      await load();
      return r.version.id;
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not save version.');
    } finally {
      setBusy(false);
    }
  }
  async function download(format: 'pdf' | 'docx') {
    let id = session?.createdVersion?.id;
    if (!id) id = await saveVersion();
    if (!id) return;
    const result = await apiBlob(`/api/cvs/versions/${id}/download?format=${format}`);
    downloadBlob(result.blob, result.fileName ?? `tailored-cv.${format}`);
  }
  if (!session)
    return (
      <Modal onClose={onClose} width={1100}>
        <div style={{ padding: 28, color: '#64748b' }}>Loading tailoring workspace…</div>
      </Modal>
    );
  return (
    <Modal onClose={onClose} width={1180}>
      <div
        style={{
          padding: '18px 22px',
          borderBottom: '1px solid #1a2540',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div>
          <div
            className="mono"
            style={{ fontSize: 9, color: '#8b5cf6', textTransform: 'uppercase' }}
          >
            CV tailoring
          </div>
          <h2 style={{ margin: '4px 0 2px', fontSize: 17, color: '#e2e8f0' }}>
            {session.job.title}
          </h2>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {session.job.company?.name ?? 'Company unknown'} · {session.baseCvVersion.cv.name} v
            {session.baseCvVersion.versionNumber}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'start' }}>
          <button
            onClick={() => void saveDraft()}
            disabled={busy}
            style={{
              padding: '7px 11px',
              background: '#111c35',
              border: '1px solid #1a2540',
              borderRadius: 4,
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            Save draft
          </button>
          <button
            onClick={() => void saveVersion()}
            disabled={busy}
            style={{
              padding: '7px 11px',
              background: '#3b82f6',
              border: 0,
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Save new version
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
      <div
        style={{
          padding: '12px 22px',
          borderBottom: '1px solid #1a2540',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 14,
          background: layoutRisk ? 'rgba(245,158,11,.06)' : 'rgba(6,214,160,.04)',
        }}
      >
        <div>
          <strong style={{ fontSize: 11, color: layoutRisk ? '#f59e0b' : '#06d6a0' }}>
            ▣ Format guard · {layoutRisk ? 'review pagination' : 'layout volume stable'}
          </strong>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 3, lineHeight: 1.5 }}>
            The uploaded source remains untouched. Keep wording changes close to the original
            section length. A new version is created instead of overwriting the source document.
          </div>
        </div>
        <div className="mono" style={{ fontSize: 9, color: '#64748b', textAlign: 'right' }}>
          CONTENT {growth >= 0 ? '+' : ''}
          {growth}%<br />
          LINES {lines - baseLines >= 0 ? '+' : ''}
          {lines - baseLines}
        </div>
      </div>
      <div
        style={{
          padding: '10px 22px',
          background: 'rgba(139,92,246,.04)',
          borderBottom: '1px solid #1a2540',
          fontSize: 10,
          color: '#94a3b8',
        }}
      >
        <strong style={{ color: '#c4b5fd' }}>Truthfulness rule:</strong> improve wording and
        emphasis only. Missing qualifications or experience are not added until you explicitly
        confirm them.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0,1fr)', minHeight: 620 }}>
        <div
          style={{
            borderRight: '1px solid #1a2540',
            padding: 14,
            overflowY: 'auto',
            maxHeight: '70vh',
          }}
        >
          <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 10 }}>
            JOB GAPS / SUGGESTIONS
          </div>
          {session.suggestions.length === 0 ? (
            <div style={{ color: '#475569', fontSize: 11 }}>No changes suggested.</div>
          ) : (
            session.suggestions.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: 11,
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                  marginBottom: 8,
                  background: '#0a1020',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span
                    className="mono"
                    style={{ fontSize: 8, color: s.requiresConfirmation ? '#f59e0b' : '#8b5cf6' }}
                  >
                    {s.requiresConfirmation ? 'CONFIRM FACT' : 'REWRITE'}
                  </span>
                  <span className="mono" style={{ fontSize: 8, color: '#475569' }}>
                    {s.status}
                  </span>
                </div>
                {s.requirementText && (
                  <div
                    style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600, margin: '7px 0 4px' }}
                  >
                    {s.requirementText}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.45 }}>{s.reason}</div>
                {s.afterText && !s.requiresConfirmation && (
                  <div
                    style={{
                      marginTop: 7,
                      padding: 7,
                      background: '#111c35',
                      fontSize: 10,
                      color: '#94a3b8',
                      lineHeight: 1.4,
                    }}
                  >
                    {s.afterText}
                  </div>
                )}
                {s.requiresConfirmation && s.status === 'PENDING' && (
                  <textarea
                    value={confirmation[s.id] ?? ''}
                    onChange={(e) => setConfirmation((c) => ({ ...c, [s.id]: e.target.value }))}
                    placeholder="Confirm the real experience or qualification before it is added…"
                    rows={3}
                    style={{
                      width: '100%',
                      marginTop: 7,
                      background: '#111c35',
                      border: '1px solid #1a2540',
                      borderRadius: 4,
                      color: '#e2e8f0',
                      padding: 7,
                      fontSize: 10,
                    }}
                  />
                )}
                {s.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                    <button
                      onClick={() => void suggestionAction(s, 'IGNORED')}
                      style={{
                        padding: '5px 8px',
                        background: 'none',
                        border: '1px solid #1a2540',
                        color: '#64748b',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      Ignore
                    </button>
                    <button
                      disabled={s.requiresConfirmation && !confirmation[s.id]?.trim()}
                      onClick={() => void suggestionAction(s, 'ACCEPTED')}
                      style={{
                        padding: '5px 8px',
                        background: 'rgba(139,92,246,.12)',
                        border: '1px solid rgba(139,92,246,.3)',
                        color: '#a78bfa',
                        borderRadius: 4,
                        cursor: 'pointer',
                        opacity: s.requiresConfirmation && !confirmation[s.id]?.trim() ? 0.6 : 1,
                      }}
                    >
                      {s.requiresConfirmation ? 'Confirm & add' : 'Add to draft'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateRows: '1fr auto', minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>
            <div style={{ padding: 14, borderRight: '1px solid #1a2540' }}>
              <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 8 }}>
                EDIT CONTENT
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  width: '100%',
                  height: '58vh',
                  minHeight: 500,
                  background: '#080d1c',
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                  color: '#cbd5e1',
                  padding: 14,
                  fontSize: 11,
                  lineHeight: 1.55,
                  fontFamily: 'JetBrains Mono, monospace',
                  resize: 'none',
                }}
              />
            </div>
            <div style={{ padding: 14, background: '#111827' }}>
              <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 8 }}>
                LIVE PREVIEW · CONTENT FLOW
              </div>
              <div
                style={{
                  background: '#fff',
                  color: '#111827',
                  padding: '34px 38px',
                  minHeight: 500,
                  height: '58vh',
                  overflowY: 'auto',
                  boxShadow: '0 4px 20px rgba(0,0,0,.25)',
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 11,
                    lineHeight: 1.5,
                  }}
                >
                  {text}
                </pre>
              </div>
            </div>
          </div>
          <div
            style={{
              padding: '10px 14px',
              borderTop: '1px solid #1a2540',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 10, color: '#475569' }}>
              Preview is for content flow. The original uploaded document remains the formatting
              reference.
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => void download('docx')}
                style={{
                  padding: '6px 10px',
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  color: '#94a3b8',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                DOCX
              </button>
              <button
                onClick={() => void download('pdf')}
                style={{
                  padding: '6px 10px',
                  background: '#3b82f6',
                  border: 0,
                  color: '#fff',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function CVs({
  profiles,
  activeProfileId,
}: {
  profiles: SearchProfileSummary[];
  activeProfileId: string;
}) {
  const toast = useToast();
  const [cvs, setCvs] = useState<CvSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [preview, setPreview] = useState<VersionDetail | null>(null);
  const [history, setHistory] = useState<CvSummary | null>(null);
  const [tailoringId, setTailoringId] = useState(
    () => localStorage.getItem('active-cv-tailoring-session') ?? '',
  );
  const [mode, setMode] = useState<'upload' | 'create'>('upload'),
    [name, setName] = useState(''),
    [file, setFile] = useState<File | null>(null),
    [text, setText] = useState(''),
    [isMaster, setMaster] = useState(false),
    [profileId, setProfileId] = useState(activeProfileId),
    [makeDefault, setDefault] = useState(Boolean(activeProfileId)),
    [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const r = await api<{ cvs: CvSummary[] }>(
        `/api/cvs${activeProfileId ? `?profileId=${encodeURIComponent(activeProfileId)}` : ''}`,
      );
      setCvs(r.cvs);
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Unable to load CVs.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [activeProfileId]);
  useEffect(() => {
    if (tailoringId) localStorage.setItem('active-cv-tailoring-session', tailoringId);
  }, [tailoringId]);
  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === 'upload') {
        if (!file) throw new Error('Choose a CV file.');
        const contentBase64 = await readAsBase64(file);
        await api('/api/cvs/upload', {
          method: 'POST',
          body: JSON.stringify({
            name,
            fileName: file.name,
            mimeType: file.type,
            contentBase64,
            isMaster,
            profileId: profileId || undefined,
            makeDefault: makeDefault && Boolean(profileId),
          }),
        });
      } else {
        await api('/api/cvs', {
          method: 'POST',
          body: JSON.stringify({
            name,
            isMaster,
            plainText: text,
            profileId: profileId || undefined,
            makeDefault: makeDefault && Boolean(profileId),
          }),
        });
      }
      toast.success('CV added.');
      setAddOpen(false);
      setName('');
      setFile(null);
      setText('');
      await load();
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not save CV.');
    } finally {
      setBusy(false);
    }
  }
  async function previewVersion(id: string) {
    try {
      const r = await api<{ version: VersionDetail }>(`/api/cvs/versions/${id}`);
      setPreview(r.version);
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not load preview.');
    }
  }
  async function download(id: string, format: 'pdf' | 'docx') {
    try {
      const result = await apiBlob(`/api/cvs/versions/${id}/download?format=${format}`);
      downloadBlob(result.blob, result.fileName ?? `cv.${format}`);
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Download failed.');
    }
  }
  async function downloadSourceTemplate(id: string) {
    try {
      const result = await apiBlob(`/api/cvs/versions/${id}/source-template`);
      downloadBlob(result.blob, result.fileName ?? 'cv-source-template');
      toast.info('Downloaded the immutable source-format reference.');
    } catch (c) {
      toast.warn(
        c instanceof Error ? c.message : 'No uploaded source template is available for this CV.',
      );
    }
  }
  async function setDefaultProfile(cvId: string, target: string) {
    try {
      await api(`/api/cvs/${cvId}/profile-links`, {
        method: 'POST',
        body: JSON.stringify({ profileId: target, isDefault: true }),
      });
      toast.success('Default CV updated.');
      await load();
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not update default.');
    }
  }
  const defaultByProfile = useMemo(
    () =>
      new Map(
        cvs.flatMap((cv) =>
          cv.profileLinks
            .filter((link) => link.isDefault)
            .map((link) => [link.profileId, cv.name] as const),
        ),
      ),
    [cvs],
  );
  return (
    <div style={{ padding: '26px 30px' }}>
      {tailoringId && (
        <TailoringWorkspace
          sessionId={tailoringId}
          onClose={() => {
            setTailoringId('');
            localStorage.removeItem('active-cv-tailoring-session');
          }}
          onSaved={() => void load()}
        />
      )}
      {addOpen && (
        <Modal onClose={() => setAddOpen(false)}>
          <form onSubmit={create}>
            <div
              style={{
                padding: '17px 20px',
                borderBottom: '1px solid #1a2540',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div className="mono" style={{ fontSize: 9, color: '#475569' }}>
                  CV LIBRARY
                </div>
                <h2 style={{ margin: '4px 0 0', fontSize: 16, color: '#e2e8f0' }}>Add a CV</h2>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                style={{ background: 'none', border: 0, color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {(['upload', 'create'] as const).map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setMode(v)}
                    style={{
                      padding: '6px 10px',
                      background: mode === v ? 'rgba(59,130,246,.12)' : 'none',
                      border: `1px solid ${mode === v ? '#3b82f6' : '#1a2540'}`,
                      color: mode === v ? '#60a5fa' : '#64748b',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    {v === 'upload' ? 'Upload existing' : 'Create from text'}
                  </button>
                ))}
              </div>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span
                  className="mono"
                  style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
                >
                  CV NAME
                </span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Teaching CV"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#111c35',
                    border: '1px solid #1a2540',
                    borderRadius: 4,
                    color: '#e2e8f0',
                  }}
                />
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <label>
                  <span
                    className="mono"
                    style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
                  >
                    SEARCH PROFILE
                  </span>
                  <select
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#111c35',
                      border: '1px solid #1a2540',
                      borderRadius: 4,
                      color: '#94a3b8',
                    }}
                  >
                    <option value="">No profile</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ display: 'grid', gap: 6, alignContent: 'end' }}>
                  <label style={{ fontSize: 11, color: '#94a3b8' }}>
                    <input
                      type="checkbox"
                      checked={isMaster}
                      onChange={(e) => setMaster(e.target.checked)}
                    />{' '}
                    Master CV
                  </label>
                  <label style={{ fontSize: 11, color: '#94a3b8' }}>
                    <input
                      type="checkbox"
                      checked={makeDefault}
                      disabled={!profileId}
                      onChange={(e) => setDefault(e.target.checked)}
                    />{' '}
                    Default for profile
                  </label>
                </div>
              </div>
              {mode === 'upload' ? (
                <FileUploader
                  accept=".pdf,.docx,.txt,.md"
                  onFile={setFile}
                  label={file ? file.name : 'Drop your existing CV here or click to upload'}
                />
              ) : (
                <textarea
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={18}
                  placeholder="Paste or build your CV content here…"
                  style={{
                    width: '100%',
                    background: '#080d1c',
                    border: '1px solid #1a2540',
                    borderRadius: 5,
                    color: '#cbd5e1',
                    padding: 12,
                    fontSize: 11,
                    lineHeight: 1.5,
                  }}
                />
              )}
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  background: 'rgba(6,214,160,.04)',
                  border: '1px solid rgba(6,214,160,.15)',
                  borderRadius: 5,
                  fontSize: 10,
                  color: '#64748b',
                }}
              >
                <strong style={{ color: '#06d6a0' }}>Format preservation:</strong> uploaded
                documents are retained as the immutable source reference. Tailored versions do not
                overwrite the original.
              </div>
            </div>
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #1a2540',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 7,
              }}
            >
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                style={{
                  padding: '7px 12px',
                  background: 'none',
                  border: '1px solid #1a2540',
                  color: '#64748b',
                  borderRadius: 4,
                }}
              >
                Cancel
              </button>
              <button
                disabled={busy}
                style={{
                  padding: '7px 12px',
                  background: '#3b82f6',
                  border: 0,
                  color: '#fff',
                  borderRadius: 4,
                }}
              >
                {busy ? 'Saving…' : 'Save CV'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {preview && (
        <Modal onClose={() => setPreview(null)} width={800}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #1a2540',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div className="mono" style={{ fontSize: 9, color: '#475569' }}>
                PREVIEW
              </div>
              <h2 style={{ margin: '4px 0 0', fontSize: 15, color: '#e2e8f0' }}>
                {preview.cv.name} · v{preview.versionNumber}
              </h2>
              {preview.originalFileName && (
                <div style={{ fontSize: 10, color: '#06d6a0', marginTop: 4 }}>
                  Original format reference: {preview.originalFileName}
                </div>
              )}
            </div>
            <button
              onClick={() => setPreview(null)}
              style={{ background: 'none', border: 0, color: '#64748b' }}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: 20, background: '#111827' }}>
            <div
              style={{
                maxWidth: 690,
                margin: '0 auto',
                background: '#fff',
                color: '#111',
                padding: '44px 50px',
                minHeight: 850,
              }}
            >
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: 11,
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {preview.plainText}
              </pre>
            </div>
          </div>
          <div
            style={{
              padding: '11px 20px',
              borderTop: '1px solid #1a2540',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 10, color: '#475569' }}>
              Content preview. Use the source document as the visual formatting reference.
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => void downloadSourceTemplate(preview.id)}
                style={{
                  padding: '6px 10px',
                  background: 'none',
                  border: '1px solid rgba(6,214,160,.22)',
                  color: '#06d6a0',
                  borderRadius: 4,
                }}
              >
                Source template
              </button>
              <button
                onClick={() => void download(preview.id, 'docx')}
                style={{
                  padding: '6px 10px',
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  color: '#94a3b8',
                  borderRadius: 4,
                }}
              >
                DOCX
              </button>
              <button
                onClick={() => void download(preview.id, 'pdf')}
                style={{
                  padding: '6px 10px',
                  background: '#3b82f6',
                  border: 0,
                  color: '#fff',
                  borderRadius: 4,
                }}
              >
                PDF
              </button>
            </div>
          </div>
        </Modal>
      )}
      {history && (
        <Modal onClose={() => setHistory(null)} width={760}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #1a2540',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 15, color: '#e2e8f0' }}>
              {history.name} · Version history
            </h2>
            <button
              onClick={() => setHistory(null)}
              style={{ background: 'none', border: 0, color: '#64748b' }}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: 12 }}>
            {history.versions.map((v) => (
              <div
                key={v.id}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #1a2540',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 12,
                }}
              >
                <div>
                  <strong style={{ fontSize: 11, color: '#e2e8f0' }}>
                    v{v.versionNumber}
                    {v.label ? ` · ${v.label}` : ''}
                  </strong>
                  <div className="mono" style={{ fontSize: 9, color: '#475569', marginTop: 3 }}>
                    {v.sourceType} · {fmt(v.createdAt)}
                  </div>
                  {v.changeSummary && (
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                      {v.changeSummary}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    onClick={() => void previewVersion(v.id)}
                    style={{
                      background: 'none',
                      border: '1px solid #1a2540',
                      color: '#64748b',
                      borderRadius: 4,
                    }}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => void download(v.id, 'pdf')}
                    style={{
                      background: 'none',
                      border: '1px solid #1a2540',
                      color: '#64748b',
                      borderRadius: 4,
                    }}
                  >
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: '#e2e8f0', fontWeight: 600 }}>CVs</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
            Your factual CV library, job-specific comparisons, version history and format-conscious
            tailoring.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          {tailoringId && (
            <button
              onClick={() => setTailoringId(tailoringId)}
              style={{
                padding: '7px 11px',
                background: 'rgba(139,92,246,.1)',
                border: '1px solid rgba(139,92,246,.25)',
                borderRadius: 4,
                color: '#a78bfa',
              }}
            >
              Continue tailoring
            </button>
          )}
          <button
            onClick={() => setAddOpen(true)}
            style={{
              padding: '7px 12px',
              background: '#3b82f6',
              border: 0,
              borderRadius: 4,
              color: '#fff',
              fontWeight: 600,
            }}
          >
            + Add CV
          </button>
        </div>
      </div>
      <div
        className="data-card"
        style={{
          borderRadius: 6,
          padding: '12px 14px',
          marginBottom: 14,
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 16,
          background: 'linear-gradient(90deg,rgba(6,214,160,.035),#0d1425)',
        }}
      >
        <div>
          <strong style={{ fontSize: 11, color: '#06d6a0' }}>▣ Source-format workflow</strong>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
            Keep the uploaded CV as the immutable template reference. Tailor content in a new
            version, watch content growth, preview before export, and never overwrite the source.
          </div>
        </div>
        <div className="mono" style={{ fontSize: 9, color: '#06d6a0', alignSelf: 'center' }}>
          ORIGINAL LOCKED
        </div>
      </div>
      {profiles.length > 0 && (
        <div
          className="data-card"
          style={{
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 14,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span className="mono" style={{ fontSize: 9, color: '#475569' }}>
            PROFILE DEFAULTS
          </span>
          {profiles.map((p) => (
            <span key={p.id} style={{ fontSize: 10, color: '#64748b' }}>
              {p.name}:{' '}
              <strong style={{ color: '#94a3b8' }}>
                {defaultByProfile.get(p.id) ?? 'Not set'}
              </strong>
            </span>
          ))}
        </div>
      )}
      {loading ? (
        <div style={{ color: '#64748b' }}>Loading CV library…</div>
      ) : cvs.length === 0 ? (
        <div className="data-card" style={{ borderRadius: 6 }}>
          <EmptyState
            icon="▤"
            title="No CVs yet"
            desc="Upload your current CV or create a master CV. Every later tailored application version will remain traceable."
            action={
              <button
                onClick={() => setAddOpen(true)}
                style={{
                  padding: '7px 12px',
                  background: '#3b82f6',
                  border: 0,
                  borderRadius: 4,
                  color: '#fff',
                }}
              >
                Add your first CV
              </button>
            }
          />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
            gap: 10,
          }}
        >
          {cvs.map((cv) => {
            const latest = cv.versions[0];
            return (
              <article key={cv.id} className="data-card" style={{ borderRadius: 6, padding: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <h3 style={{ margin: 0, fontSize: 13, color: '#e2e8f0' }}>{cv.name}</h3>
                      {cv.isMaster && (
                        <span
                          className="mono"
                          style={{
                            fontSize: 8,
                            color: '#8b5cf6',
                            border: '1px solid rgba(139,92,246,.25)',
                            padding: '2px 5px',
                            borderRadius: 3,
                          }}
                        >
                          MASTER
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
                      Updated {fmt(cv.updatedAt)}
                    </div>
                  </div>
                  {latest && (
                    <span className="mono" style={{ fontSize: 9, color: '#64748b' }}>
                      v{latest.versionNumber}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    margin: '12px 0',
                    minHeight: 28,
                    fontSize: 10,
                    color: '#64748b',
                    lineHeight: 1.45,
                  }}
                >
                  {cv.description ?? 'Ready for matching and job-specific tailoring.'}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', minHeight: 23 }}>
                  {cv.profileLinks.map((link) => (
                    <span
                      key={link.id}
                      style={{
                        fontSize: 9,
                        color: link.isDefault ? '#06d6a0' : '#64748b',
                        background: '#111c35',
                        border: '1px solid #1a2540',
                        padding: '3px 6px',
                        borderRadius: 3,
                      }}
                    >
                      {link.profile?.name ?? 'Profile'}
                      {link.isDefault ? ' · Default' : ''}
                    </span>
                  ))}
                </div>
                {latest && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 5,
                      marginTop: 13,
                      paddingTop: 11,
                      borderTop: '1px solid #1a2540',
                    }}
                  >
                    <button
                      onClick={() => void previewVersion(latest.id)}
                      style={{
                        padding: '5px 8px',
                        background: 'none',
                        border: '1px solid #1a2540',
                        color: '#94a3b8',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setHistory(cv)}
                      style={{
                        padding: '5px 8px',
                        background: 'none',
                        border: '1px solid #1a2540',
                        color: '#64748b',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      History
                    </button>
                    <button
                      onClick={() => void download(latest.id, 'pdf')}
                      style={{
                        padding: '5px 8px',
                        background: 'none',
                        border: '1px solid #1a2540',
                        color: '#64748b',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => void download(latest.id, 'docx')}
                      style={{
                        padding: '5px 8px',
                        background: 'none',
                        border: '1px solid #1a2540',
                        color: '#64748b',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      DOCX
                    </button>
                  </div>
                )}
                {profiles.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) =>
                      e.target.value && void setDefaultProfile(cv.id, e.target.value)
                    }
                    style={{
                      width: '100%',
                      marginTop: 10,
                      padding: '6px 7px',
                      background: '#111c35',
                      border: '1px solid #1a2540',
                      borderRadius: 4,
                      color: '#64748b',
                      fontSize: 10,
                    }}
                  >
                    <option value="">Set default for a profile…</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
