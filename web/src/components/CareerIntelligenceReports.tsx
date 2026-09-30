import { useEffect, useState } from 'react';

import { api } from '../api/client';

interface Gap {
  keyword: string;
  jobs: number;
  frequency: number;
  missingCount: number;
  matchedCount: number;
  evidenced: boolean;
}
interface StrategyRow {
  key: string;
  label: string;
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
}
interface Market {
  totalJobs: number;
  topCompanies: Array<[string, number]>;
  categories: Array<[string, number]>;
  months: Array<[string, number]>;
  sources: Array<[string, number]>;
}
interface OfferComparison {
  id: string;
  status: string;
  salary?: string | number | null;
  currency?: string | null;
  housingText?: string | null;
  medicalText?: string | null;
  visaText?: string | null;
  startDate?: string | null;
  application: { job: { title: string; company?: { name: string } | null } };
}
interface Campaign {
  campaign: {
    id: string;
    name: string;
    status: string;
    startedAt: string;
    endedAt?: string | null;
    profile?: { name: string } | null;
  };
  summary: {
    jobsDiscovered: number;
    shortlisted: number;
    applications: number;
    responses: number;
    interviews: number;
    offers: number;
  };
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function CareerIntelligenceReports({ activeProfileId = '' }: { activeProfileId?: string }) {
  const [gaps, setGaps] = useState<{ jobsAnalyzed: number; gaps: Gap[] } | null>(null);
  const [strategy, setStrategy] = useState<{
    overall: StrategyRow;
    byCvVersion: StrategyRow[];
    bySource: StrategyRow[];
  } | null>(null);
  const [market, setMarket] = useState<Market | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [offers, setOffers] = useState<OfferComparison[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const intelligenceQuery = `days=90${activeProfileId ? `&profileId=${encodeURIComponent(activeProfileId)}` : ''}`;
    const [gapData, strategyData, marketData, campaignData, offerData] = await Promise.all([
      api<{ jobsAnalyzed: number; gaps: Gap[] }>(
        `/api/career/intelligence/skill-gaps?${intelligenceQuery}`,
      ),
      api<{ overall: StrategyRow; byCvVersion: StrategyRow[]; bySource: StrategyRow[] }>(
        `/api/career/intelligence/strategy?${intelligenceQuery}`,
      ),
      api<Market>(`/api/career/intelligence/market?${intelligenceQuery}`),
      api<{ campaigns: Campaign[] }>('/api/career/campaigns'),
      api<{ offers: OfferComparison[] }>('/api/career/offers'),
    ]);
    setGaps(gapData);
    setStrategy(strategyData);
    setMarket(marketData);
    setCampaigns(campaignData.campaigns);
    setOffers(offerData.offers);
  }
  useEffect(() => {
    void load();
  }, [activeProfileId]);

  async function createCampaign() {
    if (!campaignName.trim()) return;
    try {
      await api('/api/career/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: campaignName.trim(),
          ...(activeProfileId ? { profileId: activeProfileId } : {}),
        }),
      });
      setCampaignName('');
      setMessage('Search campaign started.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Campaign could not be created.');
    }
  }

  return (
    <>
      {message && <p className="status-message">{message}</p>}
      <section className="panel-card">
        <p className="eyebrow">Career intelligence</p>
        <h2>Skill-gap intelligence — last 90 days</h2>
        <p className="muted">
          Aggregated from jobs already analysed against your search profiles. “Not evidenced” means
          your Evidence Bank does not currently show the skill; it does not claim you lack it.
        </p>
        <div className="report-table">
          <div className="report-row header">
            <span>Requirement</span>
            <span>Frequency</span>
            <span>Missing</span>
            <span>Matched</span>
            <span>Evidence Bank</span>
          </div>
          {(gaps?.gaps ?? []).slice(0, 20).map((gap) => (
            <div className="report-row" key={gap.keyword}>
              <strong>{gap.keyword}</strong>
              <span>
                {percent(gap.frequency)} · {gap.jobs} jobs
              </span>
              <span>{gap.missingCount}</span>
              <span>{gap.matchedCount}</span>
              <span>{gap.evidenced ? 'Evidenced' : 'Not evidenced'}</span>
            </div>
          ))}
        </div>
        {gaps && <small>{gaps.jobsAnalyzed} analysed jobs in the sample.</small>}
      </section>

      <div className="report-split">
        <section className="panel-card">
          <p className="eyebrow">Market intelligence</p>
          <h2>Where demand is appearing</h2>
          <p>
            <strong>{market?.totalJobs ?? 0}</strong> jobs observed in the current 90-day window.
          </p>
          <h3>Repeated employers</h3>
          <ul className="plain-list">
            {(market?.topCompanies ?? []).slice(0, 8).map(([name, count]) => (
              <li key={name}>
                <span>{name}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
          <h3>Categories</h3>
          <ul className="plain-list">
            {(market?.categories ?? []).slice(0, 8).map(([name, count]) => (
              <li key={name}>
                <span>{name}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel-card">
          <p className="eyebrow">Application strategy</p>
          <h2>What has happened by CV and source</h2>
          <p className="muted">
            These are descriptive outcomes, not a claim that one CV or source caused the result.
          </p>
          <h3>CV versions</h3>
          {(strategy?.byCvVersion ?? []).slice(0, 8).map((row) => (
            <div className="source-row" key={row.key}>
              <div>
                <strong>{row.label}</strong>
                <small>{row.applications} applications</small>
              </div>
              <span>
                {row.responses} responses · {row.interviews} interviews · {row.offers} offers
              </span>
            </div>
          ))}
          <h3>Application sources</h3>
          {(strategy?.bySource ?? []).slice(0, 8).map((row) => (
            <div className="source-row" key={row.key}>
              <div>
                <strong>{row.label}</strong>
                <small>{row.applications} applications</small>
              </div>
              <span>
                {row.responses} responses · {row.interviews} interviews · {row.offers} offers
              </span>
            </div>
          ))}
        </section>
      </div>

      {offers.length > 0 && (
        <section className="panel-card">
          <p className="eyebrow">Offer comparison</p>
          <h2>Active offers — factual side by side</h2>
          <div className="report-table">
            <div className="report-row header">
              <span>Role</span>
              <span>Salary</span>
              <span>Housing</span>
              <span>Medical</span>
              <span>Visa</span>
            </div>
            {offers.map((offer) => (
              <div className="report-row" key={offer.id}>
                <strong>
                  {offer.application.job.title} · {offer.application.job.company?.name ?? '—'}
                </strong>
                <span>{offer.salary ? `${offer.salary} ${offer.currency ?? ''}` : '—'}</span>
                <span>{offer.housingText ?? '—'}</span>
                <span>{offer.medicalText ?? '—'}</span>
                <span>{offer.visaText ?? '—'}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Search history</p>
            <h2>Career-search campaigns</h2>
          </div>
          <div className="application-search">
            <input
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
              placeholder="e.g. UAE Teaching · Sep–Dec 2026"
            />
            <button onClick={() => void createCampaign()}>Start campaign</button>
          </div>
        </div>
        <div className="campaign-list">
          {campaigns.map(({ campaign, summary }) => (
            <div className="campaign-row" key={campaign.id}>
              <div>
                <strong>{campaign.name}</strong>
                <p className="muted">
                  {campaign.profile?.name ?? 'All profiles'} · started{' '}
                  {new Date(campaign.startedAt).toLocaleDateString()} · {campaign.status}
                </p>
              </div>
              <div>
                <strong>{summary.jobsDiscovered}</strong> discovered · {summary.shortlisted} saved ·{' '}
                {summary.applications} applied · {summary.responses} responses ·{' '}
                {summary.interviews} interviews · {summary.offers} offers
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
