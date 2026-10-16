import { EmptyState } from '../../components/UI';
import type { SearchProfileSummary } from '../../types/jobs';
import type { SearchResponse } from './interface';
import { ingestionValue, sourceRoot } from './helpers';

interface WebSearchTabProps {
  activeProfile?: SearchProfileSummary;
  keywords: string;
  setKeywords: (value: string) => void;
  skills: string;
  setSkills: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  experience: string;
  setExperience: (value: string) => void;
  countryCode: string;
  setCountryCode: (value: string) => void;
  searching: boolean;
  response: SearchResponse | null;
  error: string;
  onUseProfile: () => void;
  onRunSearch: () => Promise<void>;
  onNavigate: (page: 'jobs-new' | 'sites-all') => void;
}

/** Collects web-search criteria and displays the API's candidates and ingestion summary. */
export function WebSearchTab({
  activeProfile,
  keywords,
  setKeywords,
  skills,
  setSkills,
  location,
  setLocation,
  experience,
  setExperience,
  countryCode,
  setCountryCode,
  searching,
  response,
  error,
  onUseProfile,
  onRunSearch,
  onNavigate,
}: WebSearchTabProps) {
  const ingested = ingestionValue(response, 'newJobs');
  const duplicates = ingestionValue(response, 'duplicates');
  const quarantined = ingestionValue(response, 'quarantined');
  const known = response?.knownSources.length ?? 0;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 330px) minmax(0, 1fr)',
        gap: 24,
        alignItems: 'start',
      }}
    >
      <div
        className="data-card"
        style={{ borderRadius: 6, padding: 20, position: 'sticky', top: 20 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Search Parameters
          </div>
          <button
            disabled={!activeProfile}
            onClick={onUseProfile}
            style={{
              border: 0,
              background: 'none',
              color: activeProfile ? '#60a5fa' : '#334155',
              fontSize: 10,
              cursor: activeProfile ? 'pointer' : 'default',
            }}
          >
            Use active profile
          </button>
        </div>
        {[
          ['Keywords', keywords, setKeywords, 'Math Teacher, Backend Engineer...'],
          ['Skills / Subjects', skills, setSkills, 'Mathematics, Chemistry, React...'],
          ['Location', location, setLocation, 'Dubai, Remote, Nairobi...'],
        ].map(([label, value, setter, placeholder]) => (
          <label key={label as string} style={{ display: 'block', marginBottom: 14 }}>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 6 }}
            >
              {String(label).toUpperCase()}
            </span>
            <input
              value={value as string}
              onChange={(event) => (setter as (value: string) => void)(event.target.value)}
              placeholder={placeholder as string}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 5,
                color: '#e2e8f0',
                fontSize: 12,
                outline: 'none',
              }}
            />
          </label>
        ))}
        <div style={{ marginBottom: 14 }}>
          <span
            className="mono"
            style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 6 }}
          >
            EXPERIENCE
          </span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['Any', 'Junior', 'Mid', 'Senior', 'Staff'].map((item) => (
              <button
                key={item}
                onClick={() => setExperience(item)}
                style={{
                  padding: '5px 8px',
                  background: experience === item ? 'rgba(59,130,246,.14)' : 'transparent',
                  border: `1px solid ${experience === item ? '#3b82f6' : '#1a2540'}`,
                  color: experience === item ? '#60a5fa' : '#64748b',
                  borderRadius: 4,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span
            className="mono"
            style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 6 }}
          >
            COUNTRY CODE (OPTIONAL)
          </span>
          <input
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            placeholder="AE"
            maxLength={2}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: '#111c35',
              border: '1px solid #1a2540',
              borderRadius: 5,
              color: '#e2e8f0',
              fontSize: 12,
              outline: 'none',
              textTransform: 'uppercase',
            }}
          />
        </label>
        <div
          style={{
            padding: '10px 12px',
            border: '1px solid #1a2540',
            background: '#111c35',
            borderRadius: 5,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {activeProfile
              ? `Active profile: ${activeProfile.name}`
              : 'Searching across your general workspace'}
          </div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
            Accepted candidates enter your normal job inbox. Known jobs are attached as additional
            listings instead of duplicated.
          </div>
        </div>
        <button
          onClick={() => void onRunSearch()}
          disabled={searching}
          style={{
            width: '100%',
            padding: 10,
            background: searching ? '#1a2540' : '#3b82f6',
            border: 0,
            borderRadius: 5,
            color: searching ? '#64748b' : '#fff',
            fontWeight: 600,
            cursor: searching ? 'default' : 'pointer',
          }}
        >
          {searching ? '⟳ Searching the web…' : '⊕ Search the web'}
        </button>
        {error && (
          <div style={{ marginTop: 10, fontSize: 11, color: '#ef4444', lineHeight: 1.4 }}>
            {error}
          </div>
        )}
      </div>

      <div>
        {!response && !searching && (
          <EmptyState
            icon="⊕"
            title="Search beyond your monitored sites"
            desc="Use this when the sources you already monitor are not enough. Search results still pass through normalization, freshness checks and deduplication."
          />
        )}
        {searching && (
          <div style={{ display: 'grid', gap: 8 }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="data-card"
                style={{
                  borderRadius: 6,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  className="pulse"
                  style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6' }}
                />
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Searching and validating candidates…
                </span>
              </div>
            ))}
          </div>
        )}
        
        {response && !searching && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5,minmax(0,1fr))',
                gap: 10,
                marginBottom: 16,
              }}
            >
              {[
                ['Candidates', response.results.length, '#e2e8f0'],
                ['New jobs', ingested, '#06d6a0'],
                ['Matched existing', duplicates, '#8b5cf6'],
                ['Needs review', quarantined, '#f59e0b'],
                ['Known sources', known, '#3b82f6'],
              ].map(([label, value, color]) => (
                <div
                  key={String(label)}
                  className="data-card"
                  style={{ borderRadius: 6, padding: '14px 16px' }}
                >
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
                  <div
                    className="mono"
                    style={{
                      fontSize: 24,
                      color: String(color),
                      fontWeight: 700,
                      marginTop: 6,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid #1a2540',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}
                >
                  Search Results
                </span>
                <button
                  onClick={() => onNavigate('jobs-new')}
                  style={{
                    border: 0,
                    background: 'none',
                    color: '#60a5fa',
                    fontSize: 10,
                    cursor: 'pointer',
                  }}
                >
                  Review accepted jobs →
                </button>
              </div>
              {/* this is where responses are rendered after search */}
              {response.results.length === 0 ? (
                <EmptyState
                  title="No candidates returned"
                  desc="Try a broader query or remove some constraints."
                />
              ) : (
                response.results.map((result, index) => {
                  const href = result.link ?? result.url ?? '';
                  const domain =
                    result.domain ??
                    (() => {
                      try {
                        return new URL(href).hostname;
                      } catch {
                        return 'Unclassified Source';
                      }
                    })();
                  const ingestion = result.ingestion;
                  const ingestionResult = ingestion?.result;
                  const outcomeLabel = ingestionResult?.newJob
                    ? 'New job'
                    : ingestionResult?.duplicate
                      ? 'Matched existing'
                      : ingestion?.status === 'QUARANTINED'
                        ? 'Needs review'
                        : ingestion?.status === 'FAILED'
                          ? 'Ingestion failed'
                          : ingestion?.status ?? 'Outcome unavailable';
                  return (
                    <div
                      key={`${href}-${index}`}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid #1a2540',
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0,1fr) minmax(180px, auto)',
                        gap: 16,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            color: '#e2e8f0',
                            fontWeight: 600,
                            marginBottom: 3,
                          }}
                        >
                          {result.title ?? 'Untitled result'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                          {result.snippet ?? 'No preview available.'}
                        </div>
                        <div
                          className="mono"
                          style={{ fontSize: 9, color: '#334155', marginTop: 6 }}
                        >
                          {domain}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          <span
                            className="mono"
                            style={{
                              fontSize: 9,
                              color: outcomeLabel === 'Needs review' || outcomeLabel === 'Ingestion failed'
                                ? '#f59e0b'
                                : outcomeLabel === 'New job'
                                  ? '#06d6a0'
                                  : '#8b5cf6',
                              border: '1px solid #1a2540',
                              borderRadius: 3,
                              padding: '3px 6px',
                            }}
                          >
                            {outcomeLabel}
                          </span>
                          {ingestionResult && (
                            <span className="mono" style={{ fontSize: 9, color: '#64748b', padding: '3px 0' }}>
                              {[
                                ingestionResult.newJob ? 'new job' : null,
                                ingestionResult.newListing ? 'new listing' : null,
                                ingestionResult.updatedListing ? 'updated listing' : null,
                                ingestionResult.duplicate ? 'matched existing job' : null,
                              ].filter(Boolean).join(' · ')}
                              {` · ${Math.round(ingestionResult.confidence * 100)}% confidence`}
                            </span>
                          )}
                          {ingestion?.reasons?.length ? (
                            <span style={{ fontSize: 10, color: '#f59e0b' }}>
                              {ingestion.reasons.join(' ')}
                            </span>
                          ) : null}
                          {ingestion?.errorMessage && (
                            <span style={{ fontSize: 10, color: '#ef4444' }}>
                              {ingestion.errorMessage}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          onClick={() => {
                            sessionStorage.setItem('jobintel-add-source-url', sourceRoot(href));
                            sessionStorage.setItem('jobintel-add-source-name', domain);
                            onNavigate('sites-all');
                          }}
                          style={{
                            padding: '6px 9px',
                            background: 'none',
                            border: '1px solid #1a2540',
                            borderRadius: 4,
                            color: '#64748b',
                            fontSize: 10,
                            cursor: 'pointer',
                          }}
                        >
                          Track source
                        </button>
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #1a2540',
                            borderRadius: 4,
                            color: '#60a5fa',
                            fontSize: 11,
                            textDecoration: 'none',
                          }}
                        >
                          Open ↗
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
