import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const jobsOverTime = [
  { day: 'Sep 16', new: 210, existing: 480 },
  { day: 'Sep 17', new: 185, existing: 510 },
  { day: 'Sep 18', new: 320, existing: 490 },
  { day: 'Sep 19', new: 275, existing: 520 },
  { day: 'Sep 20', new: 410, existing: 470 },
  { day: 'Sep 21', new: 190, existing: 440 },
  { day: 'Sep 22', new: 240, existing: 510 },
  { day: 'Sep 23', new: 360, existing: 530 },
  { day: 'Sep 24', new: 342, existing: 549 },
  { day: 'Sep 25', new: 160, existing: 350 },
]

const jobsBySite = [
  { site: 'LinkedIn',    jobs: 4821 },
  { site: 'Indeed',      jobs: 3102 },
  { site: 'Glassdoor',   jobs: 2100 },
  { site: 'Greenhouse',  jobs: 1893 },
  { site: 'Wellfound',   jobs: 892  },
  { site: 'RemoteOK',    jobs: 421  },
  { site: 'HN Jobs',     jobs: 312  },
]

const byCategory = [
  { name: 'Backend',  value: 4210, color: '#3b82f6' },
  { name: 'Fullstack',value: 2890, color: '#8b5cf6' },
  { name: 'DevOps',   value: 1840, color: '#06d6a0' },
  { name: 'Data',     value: 1320, color: '#f59e0b' },
  { name: 'Frontend', value: 980,  color: '#ef4444' },
  { name: 'Other',    value: 1241, color: '#475569' },
]

const crawlStats = [
  { week: 'Wk 36', success: 142, failed: 8  },
  { week: 'Wk 37', success: 156, failed: 4  },
  { week: 'Wk 38', success: 149, failed: 11 },
  { week: 'Wk 39', success: 163, failed: 3  },
]

const appFunnel = [
  { stage: 'Applied',      count: 42, color: '#3b82f6' },
  { stage: 'Assessment',   count: 12, color: '#f59e0b' },
  { stage: 'Interviewing', count: 8,  color: '#8b5cf6' },
  { stage: 'Offer',        count: 2,  color: '#06d6a0' },
  { stage: 'Rejected',     count: 19, color: '#ef4444' },
]

const topSkills = [
  { skill: 'Python',     count: 3820 },
  { skill: 'Go',         count: 2940 },
  { skill: 'TypeScript', count: 2710 },
  { skill: 'Kubernetes', count: 2180 },
  { skill: 'PostgreSQL', count: 1990 },
  { skill: 'AWS',        count: 1870 },
  { skill: 'Docker',     count: 1760 },
  { skill: 'Rust',       count: 1120 },
]

const TT_STYLE = {
  backgroundColor: '#0d1425',
  border: '1px solid #1a2540',
  borderRadius: 5,
  fontSize: 12,
  color: '#e2e8f0',
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono, monospace' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: '#1a2540' }} />
    </div>
  )
}

function StatTile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="data-card" style={{ borderRadius: 6, padding: '14px 18px' }}>
      <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#475569', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

export default function Analytics() {
  return (
    <div className="page-pad" style={{ maxWidth: 1280 }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em' }}>Analytics</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>Platform activity — Sep 16 to Sep 25, 2026</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['7 days', '30 days', '90 days', 'All time'].map((r, i) => (
            <button key={r} style={{ padding: '6px 12px', background: i === 0 ? 'rgba(59,130,246,0.15)' : 'none', border: `1px solid ${i === 0 ? '#3b82f6' : '#1a2540'}`, borderRadius: 5, color: i === 0 ? '#3b82f6' : '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>{r}</button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="stats-grid-4" style={{ marginBottom: 28 }}>
        <StatTile label="Total Jobs"      value="12,481" sub="+342 today · +2,107 this week" color="#e2e8f0" />
        <StatTile label="Crawl Success"   value="97.4%"  sub="163 succeeded · 3 failed this week" color="#06d6a0" />
        <StatTile label="Dedup Rate"      value="56.2%"  sub="of raw results are existing jobs" color="#f59e0b" />
        <StatTile label="Interview Rate"  value="19.0%"  sub="8 of 42 applications reached interview" color="#8b5cf6" />
      </div>

      {/* Jobs over time */}
      <div style={{ marginBottom: 28 }}>
        <SectionHeader title="Job Discovery — Last 10 Days" />
        <div className="data-card" style={{ borderRadius: 6, padding: '20px 16px 12px' }}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={jobsOverTime} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gExist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#475569" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#475569" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              <Area type="monotone" dataKey="new"      name="New Jobs"      stroke="#3b82f6" fill="url(#gNew)"   strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="existing" name="Existing Jobs"  stroke="#475569" fill="url(#gExist)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2col" style={{ marginBottom: 28 }}>
        {/* Jobs by site */}
        <div>
          <SectionHeader title="Jobs by Site" />
          <div className="data-card" style={{ borderRadius: 6, padding: '16px 16px 12px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={jobsBySite} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="site" width={80} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT_STYLE} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                <Bar dataKey="jobs" fill="#3b82f6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Jobs by category */}
        <div>
          <SectionHeader title="Jobs by Category" />
          <div className="data-card" style={{ borderRadius: 6, padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <ResponsiveContainer width={180} height={200}>
              <PieChart>
                <Pie data={byCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={0}>
                  {byCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {byCategory.map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#94a3b8', flex: 1 }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{c.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2col" style={{ marginBottom: 28 }}>
        {/* Crawl health */}
        <div>
          <SectionHeader title="Crawl Health — Weekly" />
          <div className="data-card" style={{ borderRadius: 6, padding: '16px 16px 12px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={crawlStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={TT_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Bar dataKey="success" name="Successful" fill="#06d6a0" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="failed"  name="Failed"     fill="#ef4444" radius={[2, 2, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Application funnel */}
        <div>
          <SectionHeader title="Application Funnel" />
          <div className="data-card" style={{ borderRadius: 6, padding: '16px 20px' }}>
            {appFunnel.map((s, i) => (
              <div key={s.stage} style={{ marginBottom: i < appFunnel.length - 1 ? 14 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{s.stage}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.count}</span>
                </div>
                <div style={{ height: 6, background: '#111c35', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(s.count / 42) * 100}%`, background: s.color, borderRadius: 3, opacity: 0.8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top skills */}
      <div>
        <SectionHeader title="Most Demanded Skills" />
        <div className="data-card" style={{ borderRadius: 6, padding: '16px 16px 12px' }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topSkills}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" />
              <XAxis dataKey="skill" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={TT_STYLE} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
              <Bar dataKey="count" name="Job Mentions" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
