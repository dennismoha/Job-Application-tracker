import { useEffect, useMemo, useState } from 'react';

import { api } from '../api/client';
import type { NavCounts, User } from '../App';

interface Notification {
  id: string;
  type: 'crawl' | 'job' | 'application' | 'error';
  message: string;
  time: string;
  targetType?: 'job' | 'application' | 'source';
  targetId?: string;
}

function relativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TYPE_ICON: Record<Notification['type'], string> = {
  crawl: '⟳',
  job: '◈',
  application: '◉',
  error: '⚠',
};
const TYPE_COLOR: Record<Notification['type'], string> = {
  crawl: '#3b82f6',
  job: '#06d6a0',
  application: '#8b5cf6',
  error: '#ef4444',
};

export default function TopBar({
  user,
  counts,
  onSearchOpen,
  onNavigate,
  onLogout,
}: {
  user: User;
  counts: NavCounts;
  onSearchOpen: () => void;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [runs, jobs, applications] = await Promise.all([
          api<{
            runs: Array<{
              id: string;
              status: string;
              createdAt: string;
              newJobs?: number;
              errorMessage?: string | null;
              source?: { name: string } | null;
            }>;
          }>('/api/scheduler/runs?limit=5'),
          api<{
            jobs: Array<{
              id: string;
              title: string;
              firstSeenAt: string;
              company?: { name: string } | null;
            }>;
          }>('/api/jobs?limit=3&addedWithinDays=1'),
          api<{
            applications: Array<{
              id: string;
              stage: string;
              lastActivityAt: string;
              job: { title: string; company?: { name: string } | null };
            }>;
          }>('/api/applications'),
        ]);
        const runNotes: Notification[] = runs.runs.slice(0, 4).map((run) => ({
          id: `run-${run.id}`,
          type: ['FAILED', 'CHALLENGED', 'RATE_LIMITED'].includes(run.status) ? 'error' : 'crawl',
          message: ['FAILED', 'CHALLENGED', 'RATE_LIMITED'].includes(run.status)
            ? `${run.source?.name ?? 'Job Source'} crawl needs attention${run.errorMessage ? ` — ${run.errorMessage}` : ''}`
            : `${run.source?.name ?? 'Job Source'} crawl ${run.status.toLowerCase()}${run.newJobs ? ` — ${run.newJobs} new jobs` : ''}`,
          time: relativeTime(run.createdAt),
        }));
        const jobNotes: Notification[] = jobs.jobs
          .slice(0, 2)
          .map((job) => ({
            id: `job-${job.id}`,
            type: 'job',
            targetType: 'job',
            targetId: job.id,
            message: `New job: ${job.title}${job.company?.name ? ` at ${job.company.name}` : ''}`,
            time: relativeTime(job.firstSeenAt),
          }));
        const appNotes: Notification[] = applications.applications
          .slice()
          .sort(
            (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime(),
          )
          .slice(0, 2)
          .map((app) => ({
            id: `app-${app.id}`,
            type: 'application',
            targetType: 'application',
            targetId: app.id,
            message: `${app.job.company?.name ?? 'Application'} → ${app.stage.replaceAll('_', ' ').toLowerCase()}`,
            time: relativeTime(app.lastActivityAt),
          }));
        setNotifications(
          [...runNotes, ...jobNotes, ...appNotes]
            .sort((a, b) => a.time.localeCompare(b.time))
            .slice(0, 8),
        );
      } catch {
        setNotifications([]);
      }
    })();
  }, [counts.jobsAll, counts.appsAll, counts.crawlActive]);

  const initials = useMemo(
    () => (user.name?.trim() || user.email).slice(0, 2).toUpperCase(),
    [user],
  );

  function openNotification(item: Notification) {
    if (item.targetType === 'job' && item.targetId) {
      sessionStorage.setItem('jobintel-open-job', item.targetId);
      onNavigate('jobs-all');
    } else if (item.targetType === 'application' && item.targetId) {
      sessionStorage.setItem('jobintel-open-application', item.targetId);
      onNavigate('apps-all');
    } else if (item.targetType === 'source' && item.targetId) {
      sessionStorage.setItem('jobintel-open-site', item.targetId);
      onNavigate('sites-all');
    }
    setNotifOpen(false);
  }

  return (
    <div
      style={{
        height: 48,
        background: '#080d1c',
        borderBottom: '1px solid #1a2540',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 12,
        flexShrink: 0,
        position: 'relative',
        zIndex: 30,
      }}
    >
      <button
        onClick={onSearchOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 12px',
          background: '#111c35',
          border: '1px solid #1a2540',
          borderRadius: 5,
          color: '#475569',
          fontSize: 12,
          cursor: 'pointer',
          flex: 1,
          maxWidth: 340,
        }}
      >
        <span style={{ fontSize: 13 }}>⊕</span>
        <span>Search jobs, Job Sources, applications, CVs…</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            padding: '1px 5px',
            border: '1px solid #1a2540',
            borderRadius: 3,
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          ⌘K
        </span>
      </button>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {[
          { label: 'Jobs', value: counts.jobsAll.toLocaleString(), nav: 'jobs-all' },
          { label: 'Job Sources', value: counts.sitesAll.toLocaleString(), nav: 'sites-all' },
          {
            label: 'Crawlers',
            value: counts.crawlActive ? `${counts.crawlActive} running` : 'idle',
            nav: 'crawl-sessions',
            color: counts.crawlActive ? '#3b82f6' : '#64748b',
          },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.nav)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              gap: 5,
              alignItems: 'center',
            }}
          >
            <span className="mono" style={{ fontSize: 10, color: '#475569' }}>
              {item.label}
            </span>
            <span
              className="mono"
              style={{ fontSize: 11, fontWeight: 600, color: item.color ?? '#94a3b8' }}
            >
              {item.value}
            </span>
          </button>
        ))}
      </div>
      <div style={{ width: 1, height: 20, background: '#1a2540' }} />
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => {
            setNotifOpen((value) => !value);
            setUserOpen(false);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 5,
            position: 'relative',
            color: '#64748b',
            fontSize: 15,
          }}
        >
          🔔
          {notifications.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 1,
                right: 1,
                minWidth: 15,
                height: 15,
                padding: '0 3px',
                borderRadius: 8,
                background: '#3b82f6',
                border: '2px solid #080d1c',
                fontSize: 8,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {notifications.length}
            </span>
          )}
        </button>
        {notifOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 360,
              background: '#0d1425',
              border: '1px solid #1a2540',
              borderRadius: 7,
              boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
              zIndex: 100,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #1a2540',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>
                Recent activity
              </span>
              <span className="mono" style={{ fontSize: 10, color: '#475569' }}>
                LIVE
              </span>
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12 }}>
                  No recent activity.
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <button
                    key={notification.id}
                    onClick={() => openNotification(notification)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      border: 0,
                      borderBottom: index < notifications.length - 1 ? '1px solid #1a2540' : 'none',
                      display: 'flex',
                      gap: 10,
                      background: 'none',
                      textAlign: 'left',
                      cursor: notification.targetId ? 'pointer' : 'default',
                    }}
                  >
                    <span style={{ color: TYPE_COLOR[notification.type], marginTop: 1 }}>
                      {TYPE_ICON[notification.type]}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
                        {notification.message}
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: 10, color: '#475569', marginTop: 3 }}
                      >
                        {notification.time}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => {
            setUserOpen((value) => !value);
            setNotifOpen(false);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: '#fff',
            }}
          >
            {initials}
          </div>
        </button>
        {userOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 210,
              background: '#0d1425',
              border: '1px solid #1a2540',
              borderRadius: 7,
              boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
              zIndex: 100,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2540' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>
                {user.name ?? 'Your account'}
              </div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{user.email}</div>
            </div>
            {[
              { label: 'Settings', nav: 'settings' },
              { label: 'Extension', nav: 'extension' },
              { label: 'Analytics', nav: 'analytics' },
            ].map((item) => (
              <div
                key={item.label}
                onClick={() => {
                  onNavigate(item.nav);
                  setUserOpen(false);
                }}
                style={{ padding: '9px 16px', fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}
              >
                {item.label}
              </div>
            ))}
            <div
              onClick={onLogout}
              style={{
                borderTop: '1px solid #1a2540',
                padding: '9px 16px',
                fontSize: 13,
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              Sign out
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
