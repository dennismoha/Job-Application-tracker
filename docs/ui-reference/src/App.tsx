import { useState, useCallback } from 'react'
import { ToastProvider } from './components/Toast'
import TopBar from './components/TopBar'
import GlobalSearch from './components/GlobalSearch'
import { useKeydown } from './components/UI'
import Dashboard from './pages/Dashboard'
import JobSites from './pages/JobSites'
import Jobs from './pages/Jobs'
import Crawling from './pages/Crawling'
import UniversalSearch from './pages/UniversalSearch'
import Applications from './pages/Applications'
import CVs from './pages/CVs'
import ChromeExtension from './pages/ChromeExtension'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import CrawlSessionDetail from './pages/CrawlSessionDetail'
import Login from './pages/Login'
import Register from './pages/Register'

type Page =
  | 'dashboard'
  | 'jobs-all' | 'jobs-new' | 'jobs-favorites' | 'jobs-scam' | 'jobs-expired'
  | 'sites-all' | 'sites-crawlable' | 'sites-restricted' | 'sites-scam'
  | 'crawl-configs' | 'crawl-sessions' | 'crawl-history' | 'crawl-failed' | 'crawl-session-detail'
  | 'search'
  | 'apps-all' | 'apps-applied' | 'apps-interviewing' | 'apps-rejected' | 'apps-offers'
  | 'cvs'
  | 'extension'
  | 'analytics' | 'settings'

interface NavGroup {
  label: string
  icon: string
  children?: { label: string; page: Page; badge?: string }[]
  page?: Page
}

const NAV: NavGroup[] = [
  { label: 'Dashboard', icon: '⬡', page: 'dashboard' },
  {
    label: 'Jobs',
    icon: '◈',
    children: [
      { label: 'All Jobs', page: 'jobs-all', badge: '12,481' },
      { label: 'New Today', page: 'jobs-new', badge: '342' },
      { label: 'Favorites', page: 'jobs-favorites', badge: '47' },
      { label: 'Scam', page: 'jobs-scam', badge: '23' },
      { label: 'Expired', page: 'jobs-expired', badge: '891' },
    ],
  },
  {
    label: 'Job Sites',
    icon: '◇',
    children: [
      { label: 'All Sites', page: 'sites-all', badge: '147' },
      { label: 'Crawlable', page: 'sites-crawlable', badge: '89' },
      { label: 'Restricted', page: 'sites-restricted', badge: '31' },
      { label: 'Scam Sites', page: 'sites-scam', badge: '8' },
    ],
  },
  {
    label: 'Crawling',
    icon: '⟳',
    children: [
      { label: 'Configurations', page: 'crawl-configs', badge: '24' },
      { label: 'Active Sessions', page: 'crawl-sessions', badge: '3' },
      { label: 'History', page: 'crawl-history' },
      { label: 'Failed Crawls', page: 'crawl-failed', badge: '2' },
    ],
  },
  { label: 'Universal Search', icon: '⊕', page: 'search' },
  {
    label: 'Applications',
    icon: '◉',
    children: [
      { label: 'All', page: 'apps-all', badge: '42' },
      { label: 'Applied', page: 'apps-applied', badge: '18' },
      { label: 'Interviewing', page: 'apps-interviewing', badge: '8' },
      { label: 'Rejected', page: 'apps-rejected', badge: '19' },
      { label: 'Offers', page: 'apps-offers', badge: '2' },
    ],
  },
  { label: 'CVs', icon: '▤', page: 'cvs' },
  { label: 'Extension', icon: '⊞', page: 'extension' },
  { label: 'Analytics', icon: '▦', page: 'analytics' },
  { label: 'Settings', icon: '⚙', page: 'settings' },
]

function isParentActive(group: NavGroup, current: Page): boolean {
  if (group.page) return group.page === current
  return group.children?.some(c => c.page === current) ?? false
}

function NavItem({
  group, current, onNavigate, expanded, onToggle,
}: {
  group: NavGroup; current: Page; onNavigate: (p: Page) => void; expanded: boolean; onToggle: () => void
}) {
  const active = isParentActive(group, current)
  if (!group.children) {
    return (
      <div className={`nav-item ${active ? 'active' : ''}`} onClick={() => onNavigate(group.page!)}>
        <span style={{ fontSize: 12, width: 16, opacity: 0.55 }}>{group.icon}</span>
        <span>{group.label}</span>
      </div>
    )
  }
  return (
    <div>
      <div className={`nav-item ${active ? 'active' : ''}`} onClick={onToggle} style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, width: 16, opacity: 0.55 }}>{group.icon}</span>
          <span>{group.label}</span>
        </div>
        <span style={{ fontSize: 10, opacity: 0.4 }}>{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && (
        <div style={{ paddingLeft: 20, marginTop: 2 }}>
          {group.children.map(child => (
            <div
              key={child.page}
              className={`nav-item ${current === child.page || (current === 'crawl-session-detail' && child.page === 'crawl-sessions') ? 'active' : ''}`}
              onClick={() => onNavigate(child.page)}
              style={{ justifyContent: 'space-between', paddingLeft: 16 }}
            >
              <span>{child.label}</span>
              {child.badge && (
                <span className="mono" style={{ fontSize: 10, color: '#334155', letterSpacing: '0.05em' }}>
                  {child.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<Page>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Jobs: true,
    'Job Sites': false,
    Crawling: false,
    Applications: false,
  })

  const toggleSearch = useCallback(() => setSearchOpen(v => !v), [])
  useKeydown('k', true, toggleSearch)

  function toggle(label: string) {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }))
  }

  function navigate(p: Page | string) {
    setPage(p as Page)
    setSidebarOpen(false)
    NAV.forEach(g => {
      if (g.children?.some(c => c.page === p)) {
        setExpanded(prev => ({ ...prev, [g.label]: true }))
      }
    })
  }

  function renderPage() {
    if (page === 'dashboard')             return <Dashboard onNavigate={navigate} />
    if (page.startsWith('sites'))         return <JobSites filter={page} onNavigate={navigate} />
    if (page.startsWith('jobs'))          return <Jobs filter={page} />
    if (page === 'crawl-session-detail')  return <CrawlSessionDetail onBack={() => navigate('crawl-sessions')} />
    if (page.startsWith('crawl'))         return <Crawling filter={page} onNavigate={navigate} />
    if (page === 'search')                return <UniversalSearch />
    if (page.startsWith('apps'))          return <Applications filter={page} />
    if (page === 'cvs')                   return <CVs />
    if (page === 'extension')             return <ChromeExtension />
    if (page === 'analytics')             return <Analytics />
    if (page === 'settings')              return <Settings />
    return (
      <div style={{ padding: 48, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
        — {page} not yet implemented —
      </div>
    )
  }

  return (
    <div className="app-shell">
      {searchOpen && <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={navigate} />}

      <button className="menu-btn" onClick={() => setSidebarOpen(v => !v)} aria-label="Toggle menu">
        {sidebarOpen ? '✕' : '☰'}
      </button>

      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #1a2540' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28,
              background: 'linear-gradient(135deg, #3b82f6, #06d6a0)',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#070b14',
              fontFamily: 'JetBrains Mono, monospace',
            }}>J</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.01em' }}>JobIntel</div>
              <div style={{ fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>v0.1.0</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          {NAV.map(group => (
            <NavItem
              key={group.label}
              group={group}
              current={page}
              onNavigate={navigate}
              expanded={!!expanded[group.label]}
              onToggle={() => toggle(group.label)}
            />
          ))}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #1a2540', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color: '#fff',
          }}>AK</div>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Alex Kim</div>
            <div style={{ fontSize: 10, color: '#334155' }}>alex@example.com</div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar onSearchOpen={() => setSearchOpen(true)} onNavigate={navigate} />
        <main className="main-content" style={{ flex: 1 }}>{renderPage()}</main>
      </div>
    </div>
  )
}

export default function App() {
  const [auth, setAuth] = useState<'login' | 'register' | 'app'>('login')

  return (
    <ToastProvider>
      {auth === 'login'    && <Login    onLogin={() => setAuth('app')} onRegister={() => setAuth('register')} />}
      {auth === 'register' && <Register onRegister={() => setAuth('app')} onLogin={() => setAuth('login')} />}
      {auth === 'app'      && <AppShell>{null}</AppShell>}
    </ToastProvider>
  )
}
