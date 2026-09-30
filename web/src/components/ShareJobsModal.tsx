import { useMemo, useState } from 'react';

import { api } from '../api/client';
import { useToast } from './Toast';

export function ShareJobsModal({ jobIds, onClose }: { jobIds: string[]; onClose: () => void }) {
  const toast = useToast();
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const emails = useMemo(
    () =>
      recipients
        .split(/[;,\n]/)
        .map((value) => value.trim())
        .filter(Boolean),
    [recipients],
  );

  async function share() {
    if (!emails.length) return toast.warn('Add at least one recipient email.');
    setBusy(true);
    try {
      const response = await api<{
        delivery: 'EMAIL_WEBHOOK' | 'EMAIL_CLIENT';
        mailtoUrl?: string | null;
      }>('/api/jobs/share', {
        method: 'POST',
        body: JSON.stringify({
          jobIds,
          recipients: emails,
          ...(subject.trim() ? { subject: subject.trim() } : {}),
          ...(message.trim() ? { message: message.trim() } : {}),
        }),
      });
      if (response.delivery === 'EMAIL_CLIENT' && response.mailtoUrl)
        window.location.href = response.mailtoUrl;
      toast.success(
        response.delivery === 'EMAIL_WEBHOOK'
          ? 'Jobs shared by email.'
          : 'Your email client has been prepared with the selected jobs.',
      );
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Jobs could not be shared.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 650,
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
          padding: 22,
        }}
      >
        <div
          style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}
        >
          <div>
            <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 15 }}>
              Share {jobIds.length === 1 ? 'job' : `${jobIds.length} jobs`} by email
            </h3>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 11 }}>
              Share the selected opportunities without changing their tracking state.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 0, color: '#64748b', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span
            className="mono"
            style={{ display: 'block', fontSize: 9, color: '#64748b', marginBottom: 5 }}
          >
            RECIPIENTS
          </span>
          <textarea
            rows={3}
            value={recipients}
            onChange={(event) => setRecipients(event.target.value)}
            placeholder="friend@example.com, colleague@example.com"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: 9,
              background: '#111c35',
              border: '1px solid #1a2540',
              borderRadius: 5,
              color: '#e2e8f0',
              resize: 'vertical',
            }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span
            className="mono"
            style={{ display: 'block', fontSize: 9, color: '#64748b', marginBottom: 5 }}
          >
            SUBJECT (OPTIONAL)
          </span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
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
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span
            className="mono"
            style={{ display: 'block', fontSize: 9, color: '#64748b', marginBottom: 5 }}
          >
            MESSAGE (OPTIONAL)
          </span>
          <textarea
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="I thought these opportunities might be useful to you."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: 9,
              background: '#111c35',
              border: '1px solid #1a2540',
              borderRadius: 5,
              color: '#e2e8f0',
              resize: 'vertical',
            }}
          />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
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
            disabled={busy || !emails.length}
            onClick={() => void share()}
            style={{
              padding: '8px 14px',
              background: '#3b82f6',
              border: 0,
              borderRadius: 5,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {busy ? 'Preparing…' : 'Share by email'}
          </button>
        </div>
      </div>
    </div>
  );
}
