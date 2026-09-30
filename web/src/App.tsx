import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiError, api } from './api/client';
import GlobalSearch from './components/GlobalSearch';
import { ProductTour } from './components/ProductTour';
import TopBar from './components/TopBar';
import { ToastProvider } from './components/Toast';
import { useKeydown } from './components/UI';
import Analytics from './pages/Analytics';
import Applications from './pages/Applications';
import ChromeExtension from './pages/ChromeExtension';
import CrawlSessionDetail from './pages/CrawlSessionDetail';
import Crawling from './pages/Crawling';
import CVs from './pages/CVs';
import Dashboard from './pages/Dashboard';
import JobSites from './pages/JobSites';
import Jobs from './pages/Jobs';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import UniversalSearch from './pages/UniversalSearch';
import type { SearchProfileSummary } from './types/jobs';

type Page =
  | 'dashboard'
  | 'jobs-all'
  | 'jobs-new'
  | 'jobs-favorites'
  | 'jobs-scam'
  | 'jobs-expired'
  | 'sites-all'
  | 'sites-crawlable'
  | 'sites-restricted'
  | 'sites-scam'
  | 'crawl-configs'
  | 'crawl-sessions'
  | 'crawl-history'
  | 'crawl-failed'
  | 'crawl-session-detail'
  | 'search'
  | 'apps-all'
  | 'apps-applied'
  | 'apps-interviewing'
  | 'apps-rejected'
  | 'apps-offers'
  | 'cvs'
  | 'extension'
  | 'analytics'
  | 'settings';

interface User {
  id: string;
  email: string;
  name?: string | null;
}

interface NavChild {
  label: string;
  page: Page;
  badgeKey?: keyof NavCounts;
}

interface NavGroup {
  label: string;
  icon: string;
  children?: NavChild[];
  page?: Page;
}

interface NavCounts {
  jobsAll: number;
  jobsNew: number;
  jobsFavorites: number;
  jobsRisk: number;
  jobsExpired: number;
  sitesAll: number;
  sitesCrawlable: number;
  sitesRestricted: number;
  sitesRisk: number;
  crawlActive: number;
  crawlFailed: number;
  appsAll: number;
  appsApplied: number;
  appsInterviewing: number;
  appsRejected: number;
  appsOffers: number;
}

const EMPTY_COUNTS: NavCounts = {
  jobsAll: 0,
  jobsNew: 0,
  jobsFavorites: 0,
  jobsRisk: 0,
  jobsExpired: 0,
  sitesAll: 0,
  sitesCrawlable: 0,
  sitesRestricted: 0,
  sitesRisk: 0,
  crawlActive: 0,
  crawlFailed: 0,
  appsAll: 0,
  appsApplied: 0,
  appsInterviewing: 0,
  appsRejected: 0,
  appsOffers: 0,
};

const NAV: NavGroup[] = [
  { label: 'Dashboard', icon: '⬡', page: 'dashboard' },
  {
    label: 'Jobs',
    icon: '◈',
    children: [
      { label: 'All Jobs', page: 'jobs-all', badgeKey: 'jobsAll' },
      { label: 'New Today', page: 'jobs-new', badgeKey: 'jobsNew' },
      { label: 'Favorites', page: 'jobs-favorites', badgeKey: 'jobsFavorites' },
      { label: 'Scam / Risk', page: 'jobs-scam', badgeKey: 'jobsRisk' },
      { label: 'Expired', page: 'jobs-expired', badgeKey: 'jobsExpired' },
    ],
  },
  {
    label: 'Job Sources',
    icon: '◇',
    children: [
      { label: 'All Sources', page: 'sites-all', badgeKey: 'sitesAll' },
      { label: 'Crawlable', page: 'sites-crawlable', badgeKey: 'sitesCrawlable' },
      { label: 'Restricted', page: 'sites-restricted', badgeKey: 'sitesRestricted' },
      { label: 'Scam / Risk', page: 'sites-scam', badgeKey: 'sitesRisk' },
    ],
  },
  {
    label: 'Crawling',
    icon: '⟳',
    children: [
      { label: 'Configurations', page: 'crawl-configs' },
      { label: 'Active Sessions', page: 'crawl-sessions', badgeKey: 'crawlActive' },
      { label: 'History', page: 'crawl-history' },
      { label: 'Failed Crawls', page: 'crawl-failed', badgeKey: 'crawlFailed' },
    ],
  },
  { label: 'Universal Search', icon: '⊕', page: 'search' },
  {
    label: 'Applications',
    icon: '◉',
    children: [
      { label: 'All', page: 'apps-all', badgeKey: 'appsAll' },
      { label: 'Applied', page: 'apps-applied', badgeKey: 'appsApplied' },
      { label: 'Interviewing', page: 'apps-interviewing', badgeKey: 'appsInterviewing' },
      { label: 'Rejected', page: 'apps-rejected', badgeKey: 'appsRejected' },
      { label: 'Offers', page: 'apps-offers', badgeKey: 'appsOffers' },
    ],
  },
  { label: 'CVs', icon: '▤', page: 'cvs' },
  { label: 'Extension', icon: '⊞', page: 'extension' },
  { label: 'Analytics', icon: '▦', page: 'analytics' },
  { label: 'Settings', icon: '⚙', page: 'settings' },
];

function isParentActive(group: NavGroup, current: Page): boolean {
  if (group.page) return group.page === current;
  return group.children?.some((child) => child.page === current) ?? false;
}

function NavItem({
  group,
  current,
  onNavigate,
  expanded,
  onToggle,
  counts,
}: {
  group: NavGroup;
  current: Page;
  onNavigate: (page: Page) => void;
  expanded: boolean;
  onToggle: () => void;
  counts: NavCounts;
}) {
  const active = isParentActive(group, current);

  if (!group.children) {
    return (
      <div className={`nav-item ${active ? 'active' : ''}`} onClick={() => onNavigate(group.page!)}>
        <span style={{ fontSize: 12, width: 16, opacity: 0.55 }}>{group.icon}</span>
        <span>{group.label}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`nav-item ${active ? 'active' : ''}`}
        onClick={onToggle}
        style={{ justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, width: 16, opacity: 0.55 }}>{group.icon}</span>
          <span>{group.label}</span>
        </div>
        <span style={{ fontSize: 10, opacity: 0.4 }}>{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && (
        <div style={{ paddingLeft: 20, marginTop: 2 }}>
          {group.children.map((child) => {
            const value = child.badgeKey ? counts[child.badgeKey] : undefined;
            return (
              <div
                key={child.page}
                className={`nav-item ${current === child.page || (current === 'crawl-session-detail' && child.page === 'crawl-sessions') ? 'active' : ''}`}
                onClick={() => onNavigate(child.page)}
                style={{ justifyContent: 'space-between', paddingLeft: 16 }}
              >
                <span>{child.label}</span>
                {typeof value === 'number' && value > 0 && (
                  <span
                    className="mono"
                    style={{ fontSize: 10, color: '#475569', letterSpacing: '0.04em' }}
                  >
                    {value.toLocaleString()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function filterForJobs(page: Page): 'all' | 'new' | 'favorites' | 'risk' | 'expired' {
  if (page === 'jobs-new') return 'new';
  if (page === 'jobs-favorites') return 'favorites';
  if (page === 'jobs-scam') return 'risk';
  if (page === 'jobs-expired') return 'expired';
  return 'all';
}

function filterForSites(page: Page): 'all' | 'crawlable' | 'restricted' | 'risk' {
  if (page === 'sites-crawlable') return 'crawlable';
  if (page === 'sites-restricted') return 'restricted';
  if (page === 'sites-scam') return 'risk';
  return 'all';
}

function filterForApps(page: Page): 'all' | 'applied' | 'interviewing' | 'rejected' | 'offers' {
  if (page === 'apps-applied') return 'applied';
  if (page === 'apps-interviewing') return 'interviewing';
  if (page === 'apps-rejected') return 'rejected';
  if (page === 'apps-offers') return 'offers';
  return 'all';
}

function AppShell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Jobs: true,
    'Job Sources': false,
    Crawling: false,
    Applications: false,
  });
  const [counts, setCounts] = useState<NavCounts>(EMPTY_COUNTS);
  const [profiles, setProfiles] = useState<SearchProfileSummary[]>([]);
  const [activeProfileId, setActiveProfileId] = useState(
    () => localStorage.getItem('jobintel-active-profile') ?? '',
  );
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const toggleSearch = useCallback(() => setSearchOpen((value) => !value), []);
  useKeydown('k', true, toggleSearch);

  useEffect(() => {
    void (async () => {
      try {
        const response = await api<{ profiles: SearchProfileSummary[] }>('/api/profiles');
        setProfiles(response.profiles);
        if (activeProfileId && !response.profiles.some((profile) => profile.id === activeProfileId))
          setActiveProfileId('');
      } catch {
        setProfiles([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeProfileId) localStorage.setItem('jobintel-active-profile', activeProfileId);
    else localStorage.removeItem('jobintel-active-profile');
  }, [activeProfileId]);

  const refreshCounts = useCallback(async () => {
    try {
      const profileQuery = activeProfileId
        ? `&profileId=${encodeURIComponent(activeProfileId)}`
        : '';
      const [allJobs, newJobs, savedJobs, expiredJobs, riskJobs, sources, runs, applications] =
        await Promise.all([
          api<{ pagination: { total: number } }>(`/api/jobs?limit=1${profileQuery}`),
          api<{ pagination: { total: number } }>(
            `/api/jobs?limit=1&addedWithinDays=1${profileQuery}`,
          ),
          api<{ pagination: { total: number } }>(
            `/api/jobs?limit=1&disposition=SAVED${profileQuery}`,
          ),
          api<{ pagination: { total: number } }>(`/api/jobs?limit=1&status=EXPIRED${profileQuery}`),
          api<{ pagination: { total: number } }>(`/api/jobs?limit=1&status=SCAM${profileQuery}`),
          api<{ sources: Array<{ collectionCapability?: string; systemRiskLevel?: string }> }>(
            '/api/sources',
          ),
          api<{ runs: Array<{ status: string }> }>('/api/scheduler/runs?limit=100'),
          api<{ applications: Array<{ stage: string }> }>(
            `/api/applications${activeProfileId ? `?profileId=${encodeURIComponent(activeProfileId)}` : ''}`,
          ),
        ]);
      const appStages = applications.applications;
      setCounts({
        jobsAll: allJobs.pagination.total,
        jobsNew: newJobs.pagination.total,
        jobsFavorites: savedJobs.pagination.total,
        jobsRisk: riskJobs.pagination.total,
        jobsExpired: expiredJobs.pagination.total,
        sitesAll: sources.sources.length,
        sitesCrawlable: sources.sources.filter(
          (source) => source.collectionCapability === 'CRAWLABLE',
        ).length,
        sitesRestricted: sources.sources.filter(
          (source) => source.collectionCapability === 'RESTRICTED',
        ).length,
        sitesRisk: sources.sources.filter((source) =>
          ['ORANGE', 'RED'].includes(source.systemRiskLevel ?? ''),
        ).length,
        crawlActive: runs.runs.filter((run) => ['QUEUED', 'RUNNING'].includes(run.status)).length,
        crawlFailed: runs.runs.filter((run) =>
          ['FAILED', 'CHALLENGED', 'RATE_LIMITED'].includes(run.status),
        ).length,
        appsAll: appStages.length,
        appsApplied: appStages.filter((app) => app.stage === 'APPLIED').length,
        appsInterviewing: appStages.filter((app) =>
          ['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'SECOND_INTERVIEW', 'FINAL_INTERVIEW'].includes(
            app.stage,
          ),
        ).length,
        appsRejected: appStages.filter((app) => app.stage === 'REJECTED').length,
        appsOffers: appStages.filter((app) => ['OFFER', 'ACCEPTED'].includes(app.stage)).length,
      });
    } catch {
      // Navigation remains usable even if a summary request temporarily fails.
    }
  }, [activeProfileId]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  function navigate(next: Page) {
    setPage(next);
    setSidebarOpen(false);
    for (const group of NAV) {
      if (group.children?.some((child) => child.page === next))
        setExpanded((current) => ({ ...current, [group.label]: true }));
    }
  }

  function openRun(runId: string) {
    setSelectedRunId(runId);
    navigate('crawl-session-detail');
  }

  function renderPage() {
    if (page === 'dashboard')
      return <Dashboard activeProfileId={activeProfileId} onNavigate={navigate} />;
    if (page.startsWith('jobs-'))
      return (
        <Jobs
          filter={filterForJobs(page)}
          activeProfileId={activeProfileId}
          onChanged={refreshCounts}
          onNavigate={navigate}
        />
      );
    if (page.startsWith('sites-'))
      return (
        <JobSites
          filter={filterForSites(page)}
          activeProfileId={activeProfileId}
          profiles={profiles}
          onNavigate={navigate}
          onChanged={refreshCounts}
        />
      );
    if (page === 'crawl-session-detail')
      return <CrawlSessionDetail runId={selectedRunId} onBack={() => navigate('crawl-sessions')} />;
    if (page.startsWith('crawl-')) return <Crawling filter={page} onOpenRun={openRun} />;
    if (page === 'search')
      return (
        <UniversalSearch
          activeProfileId={activeProfileId}
          profiles={profiles}
          onNavigate={navigate}
        />
      );
    if (page.startsWith('apps-'))
      return (
        <Applications
          filter={filterForApps(page)}
          activeProfileId={activeProfileId}
          onChanged={refreshCounts}
        />
      );
    if (page === 'cvs') return <CVs profiles={profiles} activeProfileId={activeProfileId} />;
    if (page === 'extension') return <ChromeExtension activeProfileId={activeProfileId} />;
    if (page === 'analytics') return <Analytics activeProfileId={activeProfileId} />;
    if (page === 'settings')
      return (
        <Settings
          profiles={profiles}
          activeProfileId={activeProfileId}
          onProfilesChanged={async () => {
            const response = await api<{ profiles: SearchProfileSummary[] }>('/api/profiles');
            setProfiles(response.profiles);
          }}
        />
      );
    return null;
  }

  const initials = useMemo(
    () => (user.name?.trim() || user.email).slice(0, 2).toUpperCase(),
    [user],
  );

  return (
    <div className="app-shell">
      {searchOpen && (
        <GlobalSearch
          open
          activeProfileId={activeProfileId}
          onClose={() => setSearchOpen(false)}
          onNavigate={navigate}
        />
      )}
      <ProductTour navigate={(next) => navigate(next as Page)} />

      <button
        className="menu-btn"
        onClick={() => setSidebarOpen((value) => !value)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #1a2540' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: 'linear-gradient(135deg, #3b82f6, #06d6a0)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#070b14',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              J
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>JobIntel</div>
              <div
                style={{
                  fontSize: 10,
                  color: '#334155',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.08em',
                }}
              >
                LIVE WORKSPACE
              </div>
            </div>
          </div>
          <label style={{ display: 'block', marginTop: 14 }}>
            <span
              className="mono"
              style={{
                display: 'block',
                fontSize: 9,
                color: '#334155',
                letterSpacing: '0.08em',
                marginBottom: 5,
              }}
            >
              ACTIVE SEARCH
            </span>
            <select
              value={activeProfileId}
              onChange={(event) => setActiveProfileId(event.target.value)}
              style={{
                width: '100%',
                background: '#0d1425',
                border: '1px solid #1a2540',
                color: '#94a3b8',
                borderRadius: 4,
                padding: '6px 8px',
                fontSize: 11,
              }}
            >
              <option value="">All search profiles</option>
              {profiles
                .filter((profile) => profile.enabled)
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          {NAV.map((group) => (
            <NavItem
              key={group.label}
              group={group}
              current={page}
              onNavigate={navigate}
              expanded={Boolean(expanded[group.label])}
              onToggle={() =>
                setExpanded((current) => ({ ...current, [group.label]: !current[group.label] }))
              }
              counts={counts}
            />
          ))}
        </nav>

        <div style={{ padding: '12px 14px', borderTop: '1px solid #1a2540' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#94a3b8',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.name ?? 'Your account'}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: '#334155',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email}
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign out"
              style={{
                background: 'none',
                border: 'none',
                color: '#475569',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              ↪
            </button>
          </div>
        </div>
      </aside>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <TopBar
          user={user}
          counts={counts}
          onSearchOpen={() => setSearchOpen(true)}
          onNavigate={(next) => navigate(next as Page)}
          onLogout={onLogout}
        />
        <main className="main-content" style={{ flex: 1 }}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  const loadUser = useCallback(async () => {
    try {
      const response = await api<{ user: User }>('/api/auth/me');
      setUser(response.user);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) console.error(error);
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }

  if (checking)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#070b14',
          display: 'grid',
          placeItems: 'center',
          color: '#64748b',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
        }}
      >
        Loading JobIntel…
      </div>
    );

  return (
    <ToastProvider>
      {!user && authView === 'login' && (
        <Login
          onAuthenticated={(nextUser) => setUser(nextUser)}
          onRegister={() => setAuthView('register')}
        />
      )}
      {!user && authView === 'register' && (
        <Register
          onAuthenticated={(nextUser) => setUser(nextUser)}
          onLogin={() => setAuthView('login')}
        />
      )}
      {user && <AppShell user={user} onLogout={() => void logout()} />}
    </ToastProvider>
  );
}

export type { Page, User, NavCounts };
