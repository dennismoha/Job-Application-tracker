import { useEffect, useMemo, useState } from 'react';

import { api, apiBlob, downloadBlob } from '../api/client';

type Tab = 'pack' | 'evidence' | 'interview' | 'contacts' | 'offer';

interface EvidenceEntry {
  id: string;
  type: string;
  title: string;
  summary: string;
  skills: string[];
  verified: boolean;
}
interface PackResponse {
  application: {
    id: string;
    stage: string;
    cvVersionId?: string | null;
    whereAppliedUrl?: string | null;
    job: { id: string; title: string; company?: { name: string } | null };
  };
  pack?: {
    id: string;
    status: string;
    cvVersionId?: string | null;
    sourceUrl?: string | null;
    answers?: Record<string, unknown> | null;
    notes?: string | null;
    snapshots: Array<{ id: string; capturedAt: string; reason?: string | null; snapshot: unknown }>;
  } | null;
  coverLetters: Array<{
    id: string;
    title: string;
    content: string;
    status: string;
    requirementsCovered?: unknown;
  }>;
  interview?: {
    id: string;
    scheduledAt?: string | null;
    meetingUrl?: string | null;
    location?: string | null;
    likelyAreas?: unknown[] | null;
    starExamples?: unknown[] | null;
    questionsToAsk?: unknown[] | null;
    prepNotes?: string | null;
    questionsAsked?: unknown[] | null;
    outcomeNotes?: string | null;
    followUpNotes?: string | null;
  } | null;
  contacts: Array<{
    id: string;
    relationship?: string | null;
    contact: {
      id: string;
      name: string;
      email?: string | null;
      organization?: string | null;
      title?: string | null;
    };
  }>;
  followUps: Array<{
    id: string;
    action: string;
    state: string;
    dueAt?: string | null;
    reason: string;
  }>;
  offer?: Record<string, unknown> | null;
}
interface Contact {
  id: string;
  name: string;
  email?: string | null;
  organization?: string | null;
  title?: string | null;
  nextFollowUpAt?: string | null;
}

function human(value: string): string {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ApplicationIntelligencePanel({
  applicationId,
  onClose,
}: {
  applicationId: string;
  onClose(): void;
}) {
  const [tab, setTab] = useState<Tab>('pack');
  const [data, setData] = useState<PackResponse | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [coverLetterText, setCoverLetterText] = useState('');
  const [answerQuestion, setAnswerQuestion] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [interviewSchedule, setInterviewSchedule] = useState({
    scheduledAt: '',
    meetingUrl: '',
    location: '',
  });
  const [evidenceForm, setEvidenceForm] = useState({
    type: 'ACHIEVEMENT',
    title: '',
    summary: '',
    skills: '',
  });
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    organization: '',
    title: '',
  });
  const [interviewNotes, setInterviewNotes] = useState('');
  const [offerForm, setOfferForm] = useState({
    salary: '',
    currency: '',
    housingText: '',
    medicalText: '',
    visaText: '',
    startDate: '',
    otherBenefits: '',
    notes: '',
  });

  async function load() {
    const [pack, evidenceResponse, contactResponse] = await Promise.all([
      api<PackResponse>(`/api/career/applications/${applicationId}/pack`),
      api<{ evidence: EvidenceEntry[] }>('/api/career/evidence'),
      api<{ contacts: Contact[] }>('/api/career/contacts'),
    ]);
    setData(pack);
    setEvidence(evidenceResponse.evidence);
    setContacts(contactResponse.contacts);
    setCoverLetterText(pack.coverLetters[0]?.content ?? '');
    setInterviewNotes(pack.interview?.prepNotes ?? '');
    setInterviewSchedule({
      scheduledAt: pack.interview?.scheduledAt ? pack.interview.scheduledAt.slice(0, 16) : '',
      meetingUrl: pack.interview?.meetingUrl ?? '',
      location: pack.interview?.location ?? '',
    });
    const currentOffer = pack.offer as Record<string, unknown> | null | undefined;
    if (currentOffer)
      setOfferForm({
        salary: currentOffer.salary ? String(currentOffer.salary) : '',
        currency: String(currentOffer.currency ?? ''),
        housingText: String(currentOffer.housingText ?? ''),
        medicalText: String(currentOffer.medicalText ?? ''),
        visaText: String(currentOffer.visaText ?? ''),
        startDate: currentOffer.startDate ? String(currentOffer.startDate).slice(0, 10) : '',
        otherBenefits: String(currentOffer.otherBenefits ?? ''),
        notes: String(currentOffer.notes ?? ''),
      });
  }
  useEffect(() => {
    void load();
  }, [applicationId]);

  async function action(run: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try {
      await run();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function generateLetter() {
    await action(async () => {
      const response = await api<{ coverLetter: { content: string } }>(
        `/api/career/applications/${applicationId}/cover-letter`,
        { method: 'POST', body: JSON.stringify({ tone: 'professional' }) },
      );
      setCoverLetterText(response.coverLetter.content);
      setMessage('Cover letter drafted only from verified Evidence Bank entries.');
      await load();
    });
  }

  async function saveCoverLetter() {
    const current = data?.coverLetters[0];
    if (!current || !coverLetterText.trim()) return;
    await action(async () => {
      await api(`/api/career/cover-letters/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: coverLetterText }),
      });
      await load();
      setMessage('Cover letter saved.');
    });
  }

  async function saveAnswer() {
    if (!data?.pack || !answerQuestion.trim() || !answerText.trim()) return;
    const answers = { ...(data.pack.answers ?? {}), [answerQuestion.trim()]: answerText.trim() };
    await action(async () => {
      await api(`/api/career/applications/${applicationId}/pack`, {
        method: 'PATCH',
        body: JSON.stringify({ answers }),
      });
      setAnswerQuestion('');
      setAnswerText('');
      await load();
      setMessage('Application answer saved in the pack.');
    });
  }

  async function addEvidence() {
    await action(async () => {
      await api('/api/career/evidence', {
        method: 'POST',
        body: JSON.stringify({
          type: evidenceForm.type,
          title: evidenceForm.title,
          summary: evidenceForm.summary,
          skills: evidenceForm.skills
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          tags: [],
          verified: true,
        }),
      });
      setEvidenceForm({ type: 'ACHIEVEMENT', title: '', summary: '', skills: '' });
      await load();
      setMessage('Verified evidence added.');
    });
  }

  async function evaluateFollowUp() {
    await action(async () => {
      await api(`/api/career/applications/${applicationId}/follow-up/evaluate`, { method: 'POST' });
      await load();
      setMessage('Next action recalculated from the application timeline.');
    });
  }

  async function prepareInterview() {
    await action(async () => {
      await api(`/api/career/applications/${applicationId}/interview/prepare`, { method: 'POST' });
      await load();
      setMessage('Interview preparation generated from job requirements and verified evidence.');
    });
  }

  async function saveInterview() {
    await action(async () => {
      await api(`/api/career/applications/${applicationId}/interview`, {
        method: 'PATCH',
        body: JSON.stringify({
          prepNotes: interviewNotes,
          scheduledAt: interviewSchedule.scheduledAt || null,
          meetingUrl: interviewSchedule.meetingUrl || null,
          location: interviewSchedule.location || null,
        }),
      });
      await load();
      setMessage('Interview notes saved.');
    });
  }

  async function createAndLinkContact() {
    await action(async () => {
      const response = await api<{ contact: Contact }>('/api/career/contacts', {
        method: 'POST',
        body: JSON.stringify(contactForm),
      });
      await api(`/api/career/applications/${applicationId}/contacts`, {
        method: 'POST',
        body: JSON.stringify({
          contactId: response.contact.id,
          relationship: 'Recruiter / hiring contact',
        }),
      });
      setContactForm({ name: '', email: '', organization: '', title: '' });
      await load();
      setMessage('Contact linked to this application.');
    });
  }

  async function saveOffer() {
    await action(async () => {
      await api(`/api/career/applications/${applicationId}/offer`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'RECEIVED',
          ...(offerForm.salary ? { salary: Number(offerForm.salary) } : {}),
          currency: offerForm.currency || null,
          housingText: offerForm.housingText || null,
          medicalText: offerForm.medicalText || null,
          visaText: offerForm.visaText || null,
          startDate: offerForm.startDate || null,
          otherBenefits: offerForm.otherBenefits || null,
          notes: offerForm.notes || null,
        }),
      });
      await load();
      setMessage('Offer details saved.');
    });
  }

  async function openApplicationWithCv() {
    const applicationWindow = window.open('about:blank', '_blank');
    await action(async () => {
      try {
        const launch = await api<{
          applyUrl: string;
          cvVersionId?: string | null;
          cvDownloadPath?: string | null;
        }>(`/api/career/applications/${applicationId}/launch`);
        if (launch.cvDownloadPath) {
          const file = await apiBlob(launch.cvDownloadPath);
          downloadBlob(file.blob, file.fileName ?? 'application-cv.docx');
        }
        if (applicationWindow) {
          applicationWindow.opener = null;
          applicationWindow.location.href = launch.applyUrl;
        } else {
          window.open(launch.applyUrl, '_blank', 'noopener,noreferrer');
        }
        setMessage(
          launch.cvDownloadPath
            ? 'Selected CV downloaded and application page opened.'
            : 'Application page opened. No CV version was attached to this application pack.',
        );
      } catch (error) {
        applicationWindow?.close();
        throw error;
      }
    });
  }

  const nextAction = useMemo(
    () => data?.followUps.find((item) => item.state === 'SUGGESTED'),
    [data],
  );
  if (!data)
    return (
      <div className="modal-backdrop">
        <div className="modal-card">
          <p>Loading application pack…</p>
        </div>
      </div>
    );

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <div className="modal-card intelligence-modal">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Application Pack</p>
            <h2>{data.application.job.title}</h2>
            <p>{data.application.job.company?.name ?? 'Company not identified'}</p>
          </div>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="intelligence-tabs">
          {(['pack', 'evidence', 'interview', 'contacts', 'offer'] as Tab[]).map((item) => (
            <button
              key={item}
              className={tab === item ? 'active' : ''}
              onClick={() => setTab(item)}
            >
              {human(item)}
            </button>
          ))}
        </div>
        {message && <p className="status-message">{message}</p>}

        {tab === 'pack' && (
          <div className="intelligence-grid">
            <section className="panel-card">
              <p className="eyebrow">Permanent application record</p>
              <h3>Application pack</h3>
              <p>
                Job snapshot: <strong>{data.pack?.snapshots.length ?? 0}</strong>
              </p>
              <p>
                CV version:{' '}
                <strong>
                  {data.pack?.cvVersionId ?? data.application.cvVersionId ?? 'Not recorded'}
                </strong>
              </p>
              <p>
                Source URL:{' '}
                <strong>
                  {data.pack?.sourceUrl ?? data.application.whereAppliedUrl ?? 'Not recorded'}
                </strong>
              </p>
              <button
                onClick={() =>
                  void action(async () => {
                    await api(`/api/career/applications/${applicationId}/snapshots`, {
                      method: 'POST',
                      body: JSON.stringify({ reason: 'MANUAL_CAPTURE' }),
                    });
                    await load();
                    setMessage('Current vacancy snapshot captured.');
                  })
                }
              >
                Capture current snapshot
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void openApplicationWithCv()}
              >
                Open application + prepare CV
              </button>
            </section>
            <section className="panel-card">
              <p className="eyebrow">Next action</p>
              <h3>{nextAction ? human(nextAction.action) : 'Not evaluated'}</h3>
              <p>
                {nextAction?.reason ??
                  'Evaluate the application timeline to calculate a suggested next action.'}
              </p>
              {nextAction?.dueAt && (
                <small>Due {new Date(nextAction.dueAt).toLocaleString()}</small>
              )}
              <button onClick={() => void evaluateFollowUp()}>Recalculate next action</button>
            </section>
            <section className="panel-card intelligence-span">
              <p className="eyebrow">Application answers</p>
              <h3>Keep the answers you actually submitted</h3>
              <div className="answer-grid">
                <input
                  value={answerQuestion}
                  onChange={(event) => setAnswerQuestion(event.target.value)}
                  placeholder="Application question"
                />
                <textarea
                  value={answerText}
                  onChange={(event) => setAnswerText(event.target.value)}
                  placeholder="Your submitted / prepared answer"
                />
                <button
                  disabled={!answerQuestion.trim() || !answerText.trim()}
                  onClick={() => void saveAnswer()}
                >
                  Save answer
                </button>
              </div>
              <div className="answer-list">
                {Object.entries(data.pack?.answers ?? {}).map(([question, answer]) => (
                  <div key={question}>
                    <strong>{question}</strong>
                    <p>{String(answer)}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel-card intelligence-span">
              <p className="eyebrow">Truthful cover letter</p>
              <div className="card-heading">
                <h3>Cover letter</h3>
                <div>
                  <button onClick={() => void generateLetter()}>Generate from evidence</button>
                  {data.coverLetters[0] && (
                    <button onClick={() => void saveCoverLetter()}>Save edits</button>
                  )}
                </div>
              </div>
              <textarea
                className="large-textarea"
                value={coverLetterText}
                onChange={(event) => setCoverLetterText(event.target.value)}
                placeholder="Generate or paste a cover letter…"
              />
              <p className="muted">
                Generation is restricted to verified Evidence Bank facts; missing experience is
                omitted rather than invented.
              </p>
            </section>
          </div>
        )}

        {tab === 'evidence' && (
          <div className="intelligence-grid">
            <section className="panel-card">
              <p className="eyebrow">Trusted career facts</p>
              <h3>Add evidence</h3>
              <label>
                Type
                <select
                  value={evidenceForm.type}
                  onChange={(event) =>
                    setEvidenceForm((current) => ({ ...current, type: event.target.value }))
                  }
                >
                  {[
                    'ACHIEVEMENT',
                    'PROJECT',
                    'RESPONSIBILITY',
                    'CERTIFICATION',
                    'TECHNOLOGY',
                    'TEACHING_ACHIEVEMENT',
                    'METRIC',
                    'EDUCATION',
                    'LANGUAGE',
                    'OTHER',
                  ].map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label>
                Title
                <input
                  value={evidenceForm.title}
                  onChange={(event) =>
                    setEvidenceForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>
              <label>
                Verified fact
                <textarea
                  value={evidenceForm.summary}
                  onChange={(event) =>
                    setEvidenceForm((current) => ({ ...current, summary: event.target.value }))
                  }
                />
              </label>
              <label>
                Skills
                <input
                  value={evidenceForm.skills}
                  onChange={(event) =>
                    setEvidenceForm((current) => ({ ...current, skills: event.target.value }))
                  }
                  placeholder="Maths, IGCSE, React…"
                />
              </label>
              <button
                className="primary"
                disabled={!evidenceForm.title || !evidenceForm.summary || busy}
                onClick={() => void addEvidence()}
              >
                Add verified evidence
              </button>
            </section>
            <section className="panel-card intelligence-span">
              <p className="eyebrow">Evidence Bank</p>
              <div className="evidence-list">
                {evidence.map((item) => (
                  <article key={item.id}>
                    <span className="stage-pill">{human(item.type)}</span>
                    <strong>{item.title}</strong>
                    <p>{item.summary}</p>
                    {item.skills.length > 0 && <small>{item.skills.join(' · ')}</small>}
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'interview' && (
          <div className="intelligence-grid">
            <section className="panel-card">
              <p className="eyebrow">Interview workspace</p>
              <h3>Preparation</h3>
              <label>
                Interview time
                <input
                  type="datetime-local"
                  value={interviewSchedule.scheduledAt}
                  onChange={(event) =>
                    setInterviewSchedule((current) => ({
                      ...current,
                      scheduledAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Meeting URL
                <input
                  value={interviewSchedule.meetingUrl}
                  onChange={(event) =>
                    setInterviewSchedule((current) => ({
                      ...current,
                      meetingUrl: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Location
                <input
                  value={interviewSchedule.location}
                  onChange={(event) =>
                    setInterviewSchedule((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                />
              </label>
              <button className="primary" onClick={() => void prepareInterview()}>
                Build prep from job + evidence
              </button>
              <p className="muted">
                Likely areas and STAR examples are grounded in the vacancy and Evidence Bank.
              </p>
              {Array.isArray(data.interview?.likelyAreas) && (
                <ul>
                  {data.interview!.likelyAreas!.map((item, index) => (
                    <li key={index}>{String(item)}</li>
                  ))}
                </ul>
              )}
            </section>
            <section className="panel-card">
              <p className="eyebrow">Questions to ask</p>
              <ul>
                {Array.isArray(data.interview?.questionsToAsk) &&
                  data.interview!.questionsToAsk!.map((item, index) => (
                    <li key={index}>{String(item)}</li>
                  ))}
              </ul>
            </section>
            <section className="panel-card intelligence-span">
              <label>
                Preparation / outcome notes
                <textarea
                  className="large-textarea"
                  value={interviewNotes}
                  onChange={(event) => setInterviewNotes(event.target.value)}
                />
              </label>
              <button onClick={() => void saveInterview()}>Save interview notes</button>
            </section>
          </div>
        )}

        {tab === 'contacts' && (
          <div className="intelligence-grid">
            <section className="panel-card">
              <p className="eyebrow">Recruiter CRM</p>
              <h3>Add contact</h3>
              {Object.entries(contactForm).map(([key, value]) => (
                <label key={key}>
                  {human(key)}
                  <input
                    value={value}
                    onChange={(event) =>
                      setContactForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                </label>
              ))}
              <button
                className="primary"
                disabled={!contactForm.name}
                onClick={() => void createAndLinkContact()}
              >
                Create & link
              </button>
            </section>
            <section className="panel-card">
              <p className="eyebrow">Application contacts</p>
              {data.contacts.map((link) => (
                <div className="profile-row" key={link.id}>
                  <div>
                    <strong>{link.contact.name}</strong>
                    <span>
                      {link.contact.title ?? ''}{' '}
                      {link.contact.organization ? `· ${link.contact.organization}` : ''}
                    </span>
                    <small>{link.contact.email ?? ''}</small>
                  </div>
                </div>
              ))}
            </section>
            <section className="panel-card intelligence-span">
              <p className="eyebrow">All saved contacts</p>
              <div className="contact-grid">
                {contacts.map((contact) => (
                  <div key={contact.id}>
                    <strong>{contact.name}</strong>
                    <span>{contact.organization ?? '—'}</span>
                    <small>{contact.email ?? ''}</small>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'offer' && (
          <div className="intelligence-grid">
            <section className="panel-card intelligence-span">
              <p className="eyebrow">Offer management</p>
              <h3>Record factual offer terms</h3>
              <div className="offer-grid">
                {Object.entries(offerForm).map(([key, value]) =>
                  key === 'notes' || key === 'otherBenefits' ? (
                    <label key={key} className="offer-wide">
                      {human(key)}
                      <textarea
                        value={value}
                        onChange={(event) =>
                          setOfferForm((current) => ({ ...current, [key]: event.target.value }))
                        }
                      />
                    </label>
                  ) : (
                    <label key={key}>
                      {human(key)}
                      <input
                        type={key === 'startDate' ? 'date' : 'text'}
                        value={value}
                        onChange={(event) =>
                          setOfferForm((current) => ({ ...current, [key]: event.target.value }))
                        }
                      />
                    </label>
                  ),
                )}
              </div>
              <button className="primary" onClick={() => void saveOffer()}>
                Save offer
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
