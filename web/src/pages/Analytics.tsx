import { useEffect, useMemo, useState } from 'react';

import { api } from '../api/client';
import { CareerIntelligenceReports } from '../components/CareerIntelligenceReports';
import { useToast } from '../components/Toast';

interface Overview {
  jobs: number;
  listings: number;
  duplicateListings: number;
  freshJobs: number;
  oldJobs: number;
  expiredJobs: number;
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
  eligibleForNoResponse: number;
  noResponses: number;
  riskReports: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  noResponseRate: number;
}
interface SourceMetric {
  source: { id: string; name: string; sourceType: string; collectionCapability: string };
  listings: number;
  uniqueJobs: number;
  firstDiscoveries: number;
  uniqueContributionRate: number;
  duplicateRate: number;
  medianJobAgeDays: number | null;
  oldJobRate: number;
  expiredOnDiscoveryRate: number;
  repostRate: number;
  foundApplications: number;
  appliedVia: number;
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  noResponses: number;
  noResponseRate: number;
  noResponseSample: number;
  riskReports: number;
  riskRate: number;
}
interface ApplicationReport {
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  medianResponseDays: number | null;
  medianInterviewDays: number | null;
  stages: Array<{ stage: string; _count: { _all: number } }>;
}
interface RiskReport {
  total: number;
  highRisk: number;
  byReason: Record<string, number>;
  byLevel: Record<string, number>;
}
interface HealthReport {
  sourceHealth: Array<{ status: string; _count: { _all: number } }>;
  runsLast24Hours: Array<{ status: string; _count: { _all: number } }>;
}
interface BrainSource {
  source: { id: string; name: string; sourceType: string; collectionCapability: string };
  discoveredJobs: number;
  foundApplications: number;
  appliedVia: number;
  responses: number;
  interviews: number;
  rejected: number;
  noResponses: number;
  noResponseRate: number;
  scams: number;
  expiredJobs: number;
  crawlJobs: number;
  universalSearchJobs: number;
  stages: Record<string, number>;
}
interface BrainReport {
  period: { from: string; to: string };
  applications: number;
  responses: number;
  interviews: number;
  rejected: number;
  sources: BrainSource[];
  acquisitionMethods: Array<{ method: string; jobs: number }>;
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}
function human(value?: string | null) {
  return value
    ? value
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Unknown';
}
function Metric({
  label,
  value,
  sub,
  color = '#e2e8f0',
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="data-card" style={{ borderRadius: 6, padding: '14px 16px' }}>
      <div
        className="mono"
        style={{
          fontSize: 9,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        }}
      >
        {label}
      </div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 700, color, marginTop: 6 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
function Bar({
  label,
  value,
  max,
  color = '#3b82f6',
  right,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  right?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 5 }}
      >
        <span style={{ color: '#64748b' }}>{label}</span>
        <span className="mono" style={{ color: '#94a3b8' }}>
          {right ?? value}
        </span>
      </div>
      <div style={{ height: 5, background: '#111c35', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${max ? Math.max(2, (value / max) * 100) : 0}%`,
            background: color,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
}
function Answer({
  question,
  answer,
  detail,
  color = '#e2e8f0',
}: {
  question: string;
  answer: string | number;
  detail?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: '11px 12px',
        background: '#0a1020',
        border: '1px solid #1a2540',
        borderRadius: 5,
      }}
    >
      <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>{question}</div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color, marginTop: 5 }}>
        {answer}
      </div>
      {detail && (
        <div style={{ fontSize: 9, color: '#475569', marginTop: 3, lineHeight: 1.45 }}>
          {detail}
        </div>
      )}
    </div>
  );
}

export default function Analytics({ activeProfileId }: { activeProfileId: string }) {
  const toast = useToast();
  const [range, setRange] = useState('90');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sources, setSources] = useState<SourceMetric[]>([]);
  const [applications, setApplications] = useState<ApplicationReport | null>(null);
  const [risk, setRisk] = useState<RiskReport | null>(null);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [brain, setBrain] = useState<BrainReport | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const now = new Date();
      let to = now,
        from = new Date(now.getTime() - 90 * 86400000);
      if (range === 'today') {
        from = new Date(now);
        from.setHours(0, 0, 0, 0);
      } else if (range === 'custom' && customFrom && customTo) {
        from = new Date(`${customFrom}T00:00:00`);
        to = new Date(`${customTo}T23:59:59.999`);
      } else if (range !== 'custom') {
        from = new Date(now.getTime() - Number(range) * 86400000);
      }
      const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      if (activeProfileId) qs.set('profileId', activeProfileId);
      const [o, s, a, r, h, b] = await Promise.all([
        api<Overview>(`/api/reports/overview?${qs}`),
        api<{ sources: SourceMetric[] }>(`/api/reports/sources?${qs}`),
        api<ApplicationReport>(`/api/reports/applications?${qs}`),
        api<RiskReport>(`/api/reports/risk?${qs}`),
        api<HealthReport>('/api/reports/system-health'),
        api<BrainReport>(`/api/reports/job-search-brain?${qs}`),
      ]);
      setOverview(o);
      setSources(s.sources);
      setApplications(a);
      setRisk(r);
      setHealth(h);
      setBrain(b);
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (range === 'custom' && (!customFrom || !customTo)) return;
    void load();
  }, [activeProfileId, range, customFrom, customTo]);

  const topSources = useMemo(
    () =>
      sources
        .slice()
        .sort((a, b) => b.uniqueJobs - a.uniqueJobs)
        .slice(0, 10),
    [sources],
  );
  const maxJobs = Math.max(1, ...topSources.map((s) => s.uniqueJobs));
  const brainAnswers = useMemo(() => {
    const rows = brain?.sources ?? [];
    const noResponse = rows
      .filter((row) => row.noResponses > 0)
      .sort((a, b) => b.noResponses - a.noResponses || b.noResponseRate - a.noResponseRate)[0];
    const interviews = rows
      .filter((row) => row.interviews > 0)
      .sort((a, b) => b.interviews - a.interviews)[0];
    const scams = rows.filter((row) => row.scams > 0).sort((a, b) => b.scams - a.scams)[0];
    const crawled = rows
      .filter((row) => row.crawlJobs > 0)
      .sort((a, b) => b.crawlJobs - a.crawlJobs)[0];
    const universal = rows
      .filter((row) => row.universalSearchJobs > 0)
      .sort((a, b) => b.universalSearchJobs - a.universalSearchJobs)[0];
    return { noResponse, interviews, scams, crawled, universal };
  }, [brain]);

  if (loading && !overview)
    return <div style={{ padding: 30, color: '#64748b' }}>Loading analytics…</div>;
  return (
    <div style={{ padding: '26px 30px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: '#e2e8f0', fontWeight: 600 }}>Analytics</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
            Answer the questions that matter while searching and applying: where jobs came from,
            where you applied, what returned feedback and what did not.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 7,
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{
              padding: '7px 9px',
              background: '#111c35',
              border: '1px solid #1a2540',
              borderRadius: 4,
              color: '#94a3b8',
            }}
          >
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
            <option value="custom">Custom range</option>
          </select>
          {range === 'custom' && (
            <>
              <input
                aria-label="Analytics start date"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  padding: '6px 8px',
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 4,
                  color: '#94a3b8',
                }}
              />
              <span style={{ fontSize: 10, color: '#475569' }}>to</span>
              <input
                aria-label="Analytics end date"
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  padding: '6px 8px',
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 4,
                  color: '#94a3b8',
                }}
              />
            </>
          )}
        </div>
      </div>

      {brain && (
        <div className="data-card" style={{ borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 11 }}
          >
            <div>
              <div
                className="mono"
                style={{ fontSize: 9, color: '#60a5fa', letterSpacing: '.08em' }}
              >
                JOB SEARCH BRAIN
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                The same Job Source architecture answers these questions without guessing.
              </div>
            </div>
            <div className="mono" style={{ fontSize: 9, color: '#475569' }}>
              Found via ≠ Applied via
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 8 }}>
            <Answer
              question="How many applications?"
              answer={brain.applications}
              detail={`${brain.responses} received feedback`}
              color="#3b82f6"
            />
            <Answer
              question="How many interviews?"
              answer={brain.interviews}
              detail={
                brainAnswers.interviews
                  ? `${brainAnswers.interviews.source.name} contributed ${brainAnswers.interviews.interviews}`
                  : 'No interviews in this period'
              }
              color="#8b5cf6"
            />
            <Answer
              question="How many rejected?"
              answer={brain.rejected}
              detail="Based on application stage"
              color={brain.rejected ? '#ef4444' : '#94a3b8'}
            />
            <Answer
              question="Which Job Source has most no-response outcomes?"
              answer={brainAnswers.noResponse?.source.name ?? '—'}
              detail={
                brainAnswers.noResponse
                  ? `${brainAnswers.noResponse.noResponses} aged applications · ${pct(brainAnswers.noResponse.noResponseRate)} no response`
                  : 'No eligible no-response sample'
              }
              color={brainAnswers.noResponse ? '#f59e0b' : '#94a3b8'}
            />
            <Answer
              question="Where did high-risk/scam jobs appear?"
              answer={brainAnswers.scams?.source.name ?? '—'}
              detail={
                brainAnswers.scams
                  ? `${brainAnswers.scams.scams} high-risk/scam jobs`
                  : 'No high-risk source in this period'
              }
              color={brainAnswers.scams ? '#ef4444' : '#94a3b8'}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <Answer
              question="Which Job Source contributed most through crawling?"
              answer={brainAnswers.crawled?.source.name ?? '—'}
              detail={
                brainAnswers.crawled
                  ? `${brainAnswers.crawled.crawlJobs} canonical jobs found by crawler`
                  : 'No crawler discoveries in this period'
              }
              color="#06d6a0"
            />
            <Answer
              question="Which Job Source contributed most through Universal Search?"
              answer={brainAnswers.universal?.source.name ?? '—'}
              detail={
                brainAnswers.universal
                  ? `${brainAnswers.universal.universalSearchJobs} canonical jobs · acquisition method remains Universal Search`
                  : 'No Universal Search discoveries in this period'
              }
              color="#60a5fa"
            />
          </div>
        </div>
      )}

      {overview && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6,minmax(0,1fr))',
              gap: 9,
              marginBottom: 14,
            }}
          >
            <Metric label="Unique jobs" value={overview.jobs} />
            <Metric label="Fresh jobs" value={overview.freshJobs} color="#06d6a0" />
            <Metric label="Expired jobs" value={overview.expiredJobs} color="#f59e0b" />
            <Metric label="Applications" value={overview.applications} color="#3b82f6" />
            <Metric label="Interviews" value={overview.interviews} color="#8b5cf6" />
            <Metric label="Offers" value={overview.offers} color="#06d6a0" />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
              gap: 9,
              marginBottom: 18,
            }}
          >
            <Metric
              label="Feedback rate"
              value={pct(overview.responseRate)}
              sub={`${overview.responses}/${overview.applications} applications`}
            />
            <Metric
              label="Interview conversion"
              value={pct(overview.interviewRate)}
              sub={`${overview.interviews}/${overview.applications} applications`}
            />
            <Metric
              label="Offer conversion"
              value={pct(overview.offerRate)}
              sub={`${overview.offers}/${overview.applications} applications`}
            />
            <Metric
              label="No response"
              value={pct(overview.noResponseRate)}
              sub={`${overview.noResponses}/${overview.eligibleForNoResponse} aged ≥21 days`}
              color={overview.noResponseRate > 0.5 ? '#f59e0b' : '#e2e8f0'}
            />
          </div>
        </>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.2fr) minmax(300px,.8fr)',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div className="data-card" style={{ borderRadius: 6, padding: 15 }}>
          <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 14 }}>
            JOB SOURCE CONTRIBUTION
          </div>
          {topSources.length === 0 ? (
            <div style={{ color: '#475569', fontSize: 11 }}>No Job Source data in this period.</div>
          ) : (
            topSources.map((s, index) => (
              <Bar
                key={s.source.id}
                label={`${index + 1}. ${s.source.name}`}
                value={s.uniqueJobs}
                max={maxJobs}
                color={s.responseRate > 0.2 ? '#06d6a0' : '#3b82f6'}
                right={`${s.uniqueJobs} jobs · ${s.foundApplications} applied from discoveries`}
              />
            ))
          )}
        </div>
        <div className="data-card" style={{ borderRadius: 6, padding: 15 }}>
          <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 14 }}>
            APPLICATION FUNNEL
          </div>
          {applications && (
            <>
              {[
                ['Applied', applications.applications, '#3b82f6'],
                ['Feedback', applications.responses, '#f59e0b'],
                ['Interviews', applications.interviews, '#8b5cf6'],
                ['Offers', applications.offers, '#06d6a0'],
              ].map(([label, value, color]) => (
                <Bar
                  key={String(label)}
                  label={String(label)}
                  value={Number(value)}
                  max={Math.max(1, applications.applications)}
                  color={String(color)}
                />
              ))}
              <div
                style={{
                  borderTop: '1px solid #1a2540',
                  paddingTop: 10,
                  marginTop: 6,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                <div>
                  <div className="mono" style={{ fontSize: 8, color: '#475569' }}>
                    MEDIAN FEEDBACK
                  </div>
                  <strong className="mono" style={{ fontSize: 16, color: '#94a3b8' }}>
                    {applications.medianResponseDays ?? '—'}
                    {applications.medianResponseDays != null ? 'd' : ''}
                  </strong>
                </div>
                <div>
                  <div className="mono" style={{ fontSize: 8, color: '#475569' }}>
                    MEDIAN INTERVIEW
                  </div>
                  <strong className="mono" style={{ fontSize: 16, color: '#94a3b8' }}>
                    {applications.medianInterviewDays ?? '—'}
                    {applications.medianInterviewDays != null ? 'd' : ''}
                  </strong>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #1a2540' }}>
          <span className="mono" style={{ fontSize: 9, color: '#475569' }}>
            JOB SOURCE EFFECTIVENESS
          </span>
          <div style={{ fontSize: 9, color: '#334155', marginTop: 3 }}>
            Found via measures discovery effectiveness. Applied via measures where submissions
            actually happened.
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px,1.8fr) repeat(9,minmax(68px,1fr))',
            gap: 8,
            padding: '8px 12px',
            borderBottom: '1px solid #1a2540',
          }}
        >
          {[
            'Job Source',
            'Jobs',
            'Found→App',
            'Applied via',
            'Feedback',
            'Interview',
            'No resp',
            'Crawl',
            'U.Search',
            'Risk',
          ].map((x) => (
            <span key={x} className="mono" style={{ fontSize: 8, color: '#475569' }}>
              {x}
            </span>
          ))}
        </div>
        {sources.slice(0, 25).map((s) => {
          const brainSource = brain?.sources.find((row) => row.source.id === s.source.id);
          return (
            <div
              key={s.source.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(180px,1.8fr) repeat(9,minmax(68px,1fr))',
                gap: 8,
                padding: '9px 12px',
                borderBottom: '1px solid #1a2540',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: '#cbd5e1' }}>{s.source.name}</div>
                <div className="mono" style={{ fontSize: 8, color: '#334155' }}>
                  {human(s.source.sourceType)} · {human(s.source.collectionCapability)}
                </div>
              </div>
              <span className="mono" style={{ fontSize: 9, color: '#94a3b8' }}>
                {s.uniqueJobs}
              </span>
              <span className="mono" style={{ fontSize: 9, color: '#94a3b8' }}>
                {s.foundApplications}
              </span>
              <span className="mono" style={{ fontSize: 9, color: '#60a5fa' }}>
                {s.appliedVia}
              </span>
              <span
                className="mono"
                style={{ fontSize: 9, color: s.responses ? '#06d6a0' : '#64748b' }}
              >
                {s.responses}
              </span>
              <span
                className="mono"
                style={{ fontSize: 9, color: s.interviews ? '#8b5cf6' : '#64748b' }}
              >
                {s.interviews}
              </span>
              <span
                className="mono"
                style={{ fontSize: 9, color: s.noResponses ? '#f59e0b' : '#64748b' }}
              >
                {s.noResponses}
              </span>
              <span className="mono" style={{ fontSize: 9, color: '#64748b' }}>
                {brainSource?.crawlJobs ?? 0}
              </span>
              <span className="mono" style={{ fontSize: 9, color: '#64748b' }}>
                {brainSource?.universalSearchJobs ?? 0}
              </span>
              <span
                className="mono"
                style={{ fontSize: 9, color: s.riskReports ? '#ef4444' : '#64748b' }}
              >
                {s.riskReports}
              </span>
            </div>
          );
        })}
      </div>

      {brain && (
        <div className="data-card" style={{ borderRadius: 6, padding: 15, marginBottom: 14 }}>
          <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 12 }}>
            ACQUISITION METHODS
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {brain.acquisitionMethods.map((row) => (
              <div
                key={row.method}
                style={{
                  padding: '8px 10px',
                  background: '#0a1020',
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                }}
              >
                <div style={{ fontSize: 9, color: '#64748b' }}>{human(row.method)}</div>
                <strong className="mono" style={{ fontSize: 15, color: '#cbd5e1' }}>
                  {row.jobs}
                </strong>
                <span style={{ fontSize: 9, color: '#475569' }}> jobs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="data-card" style={{ borderRadius: 6, padding: 15 }}>
          <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 12 }}>
            TRUST / RISK
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'baseline' }}>
            <strong
              className="mono"
              style={{ fontSize: 24, color: risk?.highRisk ? '#ef4444' : '#e2e8f0' }}
            >
              {risk?.total ?? 0}
            </strong>
            <span style={{ fontSize: 10, color: '#64748b' }}>
              reports · {risk?.highRisk ?? 0} high risk
            </span>
          </div>
          {risk &&
            Object.entries(risk.byReason)
              .slice(0, 6)
              .map(([reason, count]) => (
                <div
                  key={reason}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderTop: '1px solid #1a2540',
                    fontSize: 10,
                  }}
                >
                  <span style={{ color: '#64748b' }}>{human(reason)}</span>
                  <span className="mono" style={{ color: '#94a3b8' }}>
                    {count}
                  </span>
                </div>
              ))}
        </div>
        <div className="data-card" style={{ borderRadius: 6, padding: 15 }}>
          <div className="mono" style={{ fontSize: 9, color: '#475569', marginBottom: 12 }}>
            SYSTEM / JOB SOURCE HEALTH
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              {health?.sourceHealth.map((row) => (
                <div
                  key={row.status}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    fontSize: 10,
                  }}
                >
                  <span style={{ color: '#64748b' }}>{human(row.status)}</span>
                  <span className="mono" style={{ color: '#94a3b8' }}>
                    {row._count._all}
                  </span>
                </div>
              ))}
            </div>
            <div>
              {health?.runsLast24Hours.map((row) => (
                <div
                  key={row.status}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    fontSize: 10,
                  }}
                >
                  <span style={{ color: '#64748b' }}>{human(row.status)}</span>
                  <span className="mono" style={{ color: '#94a3b8' }}>
                    {row._count._all}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <CareerIntelligenceReports activeProfileId={activeProfileId} />
      </div>
    </div>
  );
}
