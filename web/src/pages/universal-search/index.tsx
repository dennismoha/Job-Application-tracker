import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { api } from '../../api/client';
import { useToast } from '../../components/Toast';
import type { SearchResponse, Tab, UniversalSearchProps } from './interface';
import { BatchesTab } from './BatchesTab';
import { BrowserCaptureTab } from './BrowserCaptureTab';
import { EmailTab } from './EmailTab';
import { WebSearchTab } from './WebSearchTab';
import { useDiscoveryData } from './useDiscoveryData';

/** Coordinates the discovery tabs and owns the search and batch actions they share. */
export default function UniversalSearch({ activeProfileId, profiles, onNavigate }: UniversalSearchProps) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('web');
  const [keywords, setKeywords] = useState('');
  const [skills, setSkills] = useState('');
  const [location, setLocation] = useState('');
  const [experience, setExperience] = useState('Any');
  const [countryCode, setCountryCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');
  const [batchName, setBatchName] = useState('Manual source batch');
  const [batchDescription, setBatchDescription] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const discovery = useDiscoveryData(tab === 'email' || tab === 'batches');

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  const query = useMemo(
    () => [experience !== 'Any' ? experience : '', keywords, skills, location].filter(Boolean).join(' ').trim(),
    [experience, keywords, skills, location],
  );

  function useProfile() {
    if (!activeProfile) {
      toast.warn('Choose an active search profile first.');
      return;
    }
    const categoryNames = activeProfile.categories?.map((category) => category.name) ?? [];
    setKeywords(activeProfile.keywords.join(' '));
    setSkills(categoryNames.join(' '));
    setLocation(activeProfile.locations.join(' ') || activeProfile.countries.join(' '));
    const firstCountry = activeProfile.countries[0];
    if (firstCountry?.length === 2) setCountryCode(firstCountry.toUpperCase());
    toast.success(`Search filled from ${activeProfile.name}.`);
  }

  async function runSearch() {
    if (query.length < 3) {
      toast.warn('Add a role, skill or location before searching.');
      return;
    }
    setSearching(true);
    setError('');
    try {
      const result = await api<SearchResponse>('/api/search', {
        method: 'POST',
        body: JSON.stringify({
          query,
          ...(activeProfileId ? { profileId: activeProfileId } : {}),
          ...(countryCode.trim() ? { countryCode: countryCode.trim().slice(0, 2).toUpperCase() } : {}),
          languageCode: 'en',
          // limit: 20,
        }),
      });
      console.log('Search result:', result);
      setResponse(result);
      toast.success(`Search completed. ${result.results.length} candidates inspected.`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Search failed.';
      setError(message);
      toast.error(message);
    } finally {
      setSearching(false);
    }
  }

  async function extractEmail(id: string) {
    try {
      const result = await api<{ jobsExtracted: number }>(`/api/ai/email-ingestions/${id}/extract`, {
        method: 'POST',
      });
      toast.success(`${result.jobsExtracted} job${result.jobsExtracted === 1 ? '' : 's'} extracted from the email.`);
      await discovery.refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Email extraction failed.');
    }
  }

  async function acknowledgeEmail(id: string, label: 'RECENT' | 'OLD' | 'MIXED') {
    try {
      await api(`/api/email-ingestions/${id}/label-acknowledged`, {
        method: 'POST',
        body: JSON.stringify({ label }),
      });
      toast.success(`Email marked ${label.charAt(0) + label.slice(1).toLowerCase()}.`);
      await discovery.refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Email could not be updated.');
    }
  }

  async function createBatch(event: FormEvent) {
    event.preventDefault();
    if (!batchName.trim() || selectedSourceIds.length === 0) {
      toast.warn('Give the batch a name and select at least one source.');
      return;
    }
    try {
      await api('/api/source-batches', {
        method: 'POST',
        body: JSON.stringify({
          name: batchName.trim(),
          ...(batchDescription.trim() ? { description: batchDescription.trim() } : {}),
          sourceIds: selectedSourceIds,
        }),
      });
      setSelectedSourceIds([]);
      setBatchDescription('');
      toast.success('Manual source batch created.');
      await discovery.refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Batch could not be created.');
    }
  }

  async function runBatch(batchId: string) {
    try {
      const result = await api<{ queued: unknown[] }>(`/api/source-batches/${batchId}/run`, {
        method: 'POST',
      });
      toast.success(`${result.queued.length} source run${result.queued.length === 1 ? '' : 's'} queued.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Batch could not be queued.');
    }
  }

  async function deleteBatch(batchId: string) {
    try {
      await api(`/api/source-batches/${batchId}`, { method: 'DELETE' });
      toast.success('Batch removed.');
      await discovery.refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Batch could not be removed.');
    }
  }

  const tabs: Array<[Tab, string, string]> = [
    ['web', 'Web Search', 'Search beyond monitored sources'],
    ['email', 'Email Alerts', 'Process n8n / inbox discoveries'],
    ['batches', 'Manual Batches', 'Run selected sources together'],
    ['browser', 'Browser Capture', 'Continue from a job you are viewing'],
  ];

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
          Universal Search
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
          Every discovery route feeds the same ingestion, freshness and deduplication engine.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {tabs.map(([key, label, description]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            title={description}
            style={{
              padding: '7px 11px',
              border: `1px solid ${tab === key ? '#3b82f6' : '#1a2540'}`,
              background: tab === key ? 'rgba(59,130,246,.12)' : '#0d1425',
              color: tab === key ? '#60a5fa' : '#64748b',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'web' && (
        <WebSearchTab
          activeProfile={activeProfile}
          keywords={keywords}
          setKeywords={setKeywords}
          skills={skills}
          setSkills={setSkills}
          location={location}
          setLocation={setLocation}
          experience={experience}
          setExperience={setExperience}
          countryCode={countryCode}
          setCountryCode={setCountryCode}
          searching={searching}
          response={response}
          error={error}
          onUseProfile={useProfile}
          onRunSearch={runSearch}
          onNavigate={(page) => onNavigate(page)}
        />
      )}
      {tab === 'email' && (
        <EmailTab
          emails={discovery.emails}
          loading={discovery.loading}
          refresh={discovery.refresh}
          onExtract={extractEmail}
          onAcknowledge={acknowledgeEmail}
        />
      )}
      {tab === 'batches' && (
        <BatchesTab
          batches={discovery.batches}
          sources={discovery.sources}
          batchName={batchName}
          setBatchName={setBatchName}
          batchDescription={batchDescription}
          setBatchDescription={setBatchDescription}
          selectedSourceIds={selectedSourceIds}
          setSelectedSourceIds={setSelectedSourceIds}
          onCreateBatch={createBatch}
          onRunBatch={runBatch}
          onDeleteBatch={deleteBatch}
        />
      )}
      {tab === 'browser' && <BrowserCaptureTab onNavigate={onNavigate} />}
    </div>
  );
}
