import { useEffect, useMemo, useRef, useState } from 'react';

import { api } from '../api/client';
import type { Page } from '../App';
import type { CvSummary } from '../types/cvs';
import type { JobSummary, SourceSummary } from '../types/jobs';
import { useKeydown } from './UI';

interface ApplicationSummary {
  id: string;
  stage: string;
  job: { title: string; company?: { name: string } | null };
}
interface Result {
  id: string;
  type: 'job' | 'site' | 'application' | 'cv';
  title: string;
  sub: string;
  badge?: string;
  nav: Page;
}

export default function GlobalSearch({
  open,
  activeProfileId = '',
  onClose,
  onNavigate,
}: {
  open: boolean;
  activeProfileId?: string;
  onClose: () => void;
  onNavigate: (page: Page) => void;
}) {
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [sites, setSites] = useState<SourceSummary[]>([]);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [cvs, setCvs] = useState<CvSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useKeydown('Escape', false, onClose);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const profileParam = activeProfileId
            ? `profileId=${encodeURIComponent(activeProfileId)}`
            : '';
          const jobParams = [
            profileParam,
            'limit=12',
            query.trim() ? `q=${encodeURIComponent(query.trim())}` : '',
          ]
            .filter(Boolean)
            .join('&');
          const applicationQuery = activeProfileId
            ? `?profileId=${encodeURIComponent(activeProfileId)}`
            : '';
          const cvQuery = activeProfileId
            ? `?profileId=${encodeURIComponent(activeProfileId)}`
            : '';
          const [jobResponse, siteResponse, appResponse, cvResponse] = await Promise.all([
            api<{ jobs: JobSummary[] }>(`/api/jobs?${jobParams}`),
            api<{ sources: SourceSummary[] }>('/api/sources'),
            api<{ applications: ApplicationSummary[] }>(`/api/applications${applicationQuery}`),
            api<{ cvs: CvSummary[] }>(`/api/cvs${cvQuery}`),
          ]);
          setJobs(jobResponse.jobs);
          setSites(siteResponse.sources);
          setApplications(appResponse.applications);
          setCvs(cvResponse.cvs);
        } finally {
          setLoading(false);
        }
      })();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, query, activeProfileId]);

  const results = useMemo<Result[]>(() => {
    const normalized = query.trim().toLowerCase();
    const match = (value: string) => !normalized || value.toLowerCase().includes(normalized);
    return [
      ...jobs
        .slice(0, 6)
        .map((job): Result => ({
          id: job.id,
          type: 'job',
          title: job.title,
          sub: `${job.company?.name ?? 'Company unknown'} · ${job.locationText ?? 'Location not listed'}`,
          badge: job.status,
          nav: 'jobs-all',
        })),
      ...sites
        .filter((site) => match(site.name))
        .slice(0, 4)
        .map((site): Result => ({
          id: site.id,
          type: 'site',
          title: site.name,
          sub: `${site.collectionCapability ?? 'Unknown mode'} · ${site.health?.status ?? 'Unknown health'}`,
          badge: site.systemRiskLevel,
          nav: 'sites-all',
        })),
      ...applications
        .filter((app) => match(`${app.job.title} ${app.job.company?.name ?? ''}`))
        .slice(0, 4)
        .map((app): Result => ({
          id: app.id,
          type: 'application',
          title: `${app.job.company?.name ?? 'Application'} · ${app.job.title}`,
          sub: app.stage.replaceAll('_', ' '),
          badge: app.stage,
          nav: 'apps-all',
        })),
      ...cvs
        .filter((cv) => match(cv.name))
        .slice(0, 4)
        .map((cv): Result => ({
          id: cv.id,
          type: 'cv',
          title: cv.name,
          sub: `${cv.versions.length} version${cv.versions.length === 1 ? '' : 's'}${cv.isMaster ? ' · Master CV' : ''}`,
          badge: cv.profileLinks.some((link) => link.isDefault) ? 'Default' : undefined,
          nav: 'cvs',
        })),
    ];
  }, [query, jobs, sites, applications, cvs]);

  if (!open) return null;
  const icons = { job: '◈', site: '◇', application: '◉', cv: '▤' };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7,11,20,0.82)',
        backdropFilter: 'blur(3px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(680px, calc(100vw - 32px))',
          maxHeight: '72vh',
          background: '#0d1425',
          border: '1px solid #243050',
          borderRadius: 9,
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #1a2540',
            padding: '0 16px',
          }}
        >
          <span style={{ color: '#3b82f6', fontSize: 18 }}>⊕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search everything…"
            style={{
              flex: 1,
              border: 0,
              outline: 0,
              background: 'transparent',
              color: '#e2e8f0',
              fontSize: 15,
              padding: '16px 12px',
            }}
          />
          <kbd
            className="mono"
            style={{
              fontSize: 10,
              color: '#475569',
              border: '1px solid #1a2540',
              padding: '2px 6px',
              borderRadius: 3,
            }}
          >
            ESC
          </kbd>
        </div>
        <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
          {loading && (
            <div
              className="mono"
              style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 11 }}
            >
              Searching live data…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: 36, textAlign: 'center', color: '#475569', fontSize: 12 }}>
              No matching jobs, Job Sources, applications or CVs.
            </div>
          )}
          {!loading &&
            results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => {
                  const storageKey =
                    result.type === 'job'
                      ? 'jobintel-open-job'
                      : result.type === 'site'
                        ? 'jobintel-open-site'
                        : result.type === 'application'
                          ? 'jobintel-open-application'
                          : 'jobintel-open-cv';
                  sessionStorage.setItem(storageKey, result.id);
                  onNavigate(result.nav);
                  onClose();
                }}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  textAlign: 'left',
                  padding: '11px 16px',
                  background: 'none',
                  border: 0,
                  borderBottom: '1px solid #111c35',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: '#3b82f6' }}>{icons[result.type]}</span>
                <span>
                  <strong
                    style={{ display: 'block', color: '#cbd5e1', fontSize: 12, fontWeight: 500 }}
                  >
                    {result.title}
                  </strong>
                  <small style={{ color: '#475569', fontSize: 10 }}>{result.sub}</small>
                </span>
                {result.badge && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      borderRadius: 3,
                      border: '1px solid #1a2540',
                      color: '#64748b',
                    }}
                  >
                    {result.badge.replaceAll('_', ' ')}
                  </span>
                )}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
