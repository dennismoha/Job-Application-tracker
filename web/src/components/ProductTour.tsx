import { useEffect, useState } from 'react';

const steps = [
  {
    page: 'settings',
    title: 'Create your search profile',
    body: 'Profiles define roles, subjects, countries, locations, freshness and exclusions. The active profile scopes Jobs, Applications, CVs, Search and Analytics.',
  },
  {
    page: 'cvs',
    title: 'Add your CVs',
    body: 'Upload or build a master CV. Keep the original as the immutable format reference, then create job-specific versions without losing provenance.',
  },
  {
    page: 'sites-all',
    title: 'Add and understand Job Sources',
    body: 'Open a Job Source to see its jobs, organizations, applications, crawler configurations, run history and health. Found via and Applied via are tracked separately.',
  },
  {
    page: 'jobs-all',
    title: 'Review opportunities',
    body: 'Jobs are canonical vacancies with source provenance, freshness, saved/archive state, CV fit, profile fit, priority reasons and job history.',
  },
  {
    page: 'search',
    title: 'Discover beyond crawlers',
    body: 'Universal Search combines wider-web search, email alerts, manual source batches and Browser Companion capture.',
  },
  {
    page: 'apps-all',
    title: 'Use the Application Pack',
    body: 'Every application can retain its job snapshot, exact CV, cover letter, answers, contacts, follow-up actions, interview preparation and offer.',
  },
  {
    page: 'extension',
    title: 'Connect the Browser Companion',
    body: 'Capture the page you are viewing, compare a CV, prepare application answers, and explicitly open the application with the selected CV downloaded.',
  },
  {
    page: 'analytics',
    title: 'Learn from outcomes',
    body: 'Analytics now includes source effectiveness, skill gaps, market demand, CV/source strategy outcomes, offers and search-campaign history.',
  },
] as const;

const STORAGE_KEY = 'jobintel-product-tour-v17-career-v2';

export function ProductTour({ navigate }: { navigate(page: string): void }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  function close(completed = false) {
    if (completed) localStorage.setItem(STORAGE_KEY, 'completed');
    setOpen(false);
  }

  function go(nextIndex: number) {
    setIndex(nextIndex);
    navigate(steps[nextIndex].page);
  }

  if (!open)
    return (
      <button
        className="tour-restart-button"
        title="Restart product guide"
        onClick={() => {
          setIndex(0);
          setOpen(true);
        }}
      >
        ?
      </button>
    );
  const step = steps[index];

  return (
    <div className="tour-card" role="dialog" aria-label="Product guide">
      <div className="tour-progress">
        {index + 1} / {steps.length}
      </div>
      <h3>{step.title}</h3>
      <p>{step.body}</p>
      <div className="tour-actions">
        <button onClick={() => close(false)}>Explore myself</button>
        {index > 0 && <button onClick={() => go(index - 1)}>Back</button>}
        {index < steps.length - 1 ? (
          <button className="primary" onClick={() => go(index + 1)}>
            Next
          </button>
        ) : (
          <button className="primary" onClick={() => close(true)}>
            Finish tour
          </button>
        )}
      </div>
    </div>
  );
}
