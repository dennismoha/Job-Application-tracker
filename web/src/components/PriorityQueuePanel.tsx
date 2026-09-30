import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Priority {
  jobId: string;
  bucket: string;
  score: number;
  reasons: string[];
  title: string;
  company?: string | null;
  expiresAt?: string | null;
}

export function PriorityQueuePanel({
  activeProfileId = '',
  onOpen,
}: {
  activeProfileId?: string;
  onOpen(jobId: string): void;
}) {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  useEffect(() => {
    void api<{ priorities: Priority[] }>(
      `/api/career/intelligence/priorities${activeProfileId ? `?profileId=${encodeURIComponent(activeProfileId)}` : ''}`,
    ).then((response) => setPriorities(response.priorities));
  }, [activeProfileId]);
  if (!priorities.length) return null;
  return (
    <section className="panel-card priority-panel">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Review queue</p>
          <h2>Opportunity priority</h2>
        </div>
        <small>Reasons are visible; no unexplained score.</small>
      </div>
      <div className="priority-list">
        {priorities.slice(0, 12).map((item) => (
          <button className="priority-row" key={item.jobId} onClick={() => onOpen(item.jobId)}>
            <div>
              <span className="stage-pill">{item.bucket.replaceAll('_', ' ')}</span>
              <strong>{item.title}</strong>
              <div className="priority-reasons">{item.reasons.join(' · ')}</div>
            </div>
            <strong>{Math.round(item.score)}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
