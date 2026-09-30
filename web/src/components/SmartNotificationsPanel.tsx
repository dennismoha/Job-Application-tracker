import { useEffect, useState } from 'react';

import { api } from '../api/client';

interface Notification {
  id: string;
  type: string;
  state: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  createdAt: string;
}

export function SmartNotificationsPanel({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  async function refresh() {
    const response = await api<{ notifications: Notification[] }>(
      '/api/career/notifications/refresh',
      { method: 'POST' },
    );
    setNotifications(response.notifications.filter((item) => item.state === 'UNREAD').slice(0, 8));
  }
  useEffect(() => {
    void refresh();
  }, []);
  if (!notifications.length) return null;
  async function markRead(item: Notification) {
    await api(`/api/career/notifications/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'READ' }),
    });
    setNotifications((current) => current.filter((row) => row.id !== item.id));
    if (item.targetType === 'job' && item.targetId) {
      sessionStorage.setItem('jobintel-open-job', item.targetId);
      onNavigate('jobs-all');
      return;
    }
    if (item.targetType === 'application' && item.targetId) {
      sessionStorage.setItem('jobintel-open-application', item.targetId);
      onNavigate('apps-all');
      return;
    }
    if (item.targetType === 'source' && item.targetId) {
      sessionStorage.setItem('jobintel-open-site', item.targetId);
      onNavigate('sites-all');
      return;
    }
    if (item.actionUrl?.includes('applications')) onNavigate('apps-all');
    else if (item.actionUrl?.includes('sources')) onNavigate('sites-all');
    else onNavigate('jobs-all');
  }
  return (
    <section className="dashboard-card dashboard-card-wide">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Smart notifications</p>
          <h2>Things that materially changed</h2>
        </div>
        <button className="text-button" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>
      <div className="notification-list">
        {notifications.map((item) => (
          <button className="notification-row" key={item.id} onClick={() => void markRead(item)}>
            <div>
              <span className="stage-pill">{item.type.replaceAll('_', ' ')}</span>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
            </div>
            <small>{new Date(item.createdAt).toLocaleString()}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
