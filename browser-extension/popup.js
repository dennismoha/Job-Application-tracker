const ext = globalThis.browser ?? globalThis.chrome;
let captured = null;
let analysis = null;
let cvs = [];
let currentMatch = null;
let sourceContext = null;
let existingContext = null;

async function settings() {
  return ext.storage.local.get(['apiBase', 'webAppBase', 'companionToken']);
}

async function api(path, options = {}) {
  const config = await settings();
  if (!config.apiBase || !config.companionToken) throw new Error('SETUP_REQUIRED');
  const response = await fetch(`${config.apiBase}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.companionToken}`,
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message ?? `Request failed (${response.status})`);
  return body;
}

function capturePage() {
  const structuredData = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((node) => {
    try { return [JSON.parse(node.textContent || '')]; } catch { return []; }
  });
  const selection = window.getSelection()?.toString().trim();
  const main = document.querySelector('main, [role="main"], article');
  const pageText = (main?.innerText || document.body.innerText || '').slice(0, 100000);
  return { url: location.href, pageTitle: document.title, selectedText: selection || undefined, pageText, structuredData };
}

function selectedSourceId() {
  return document.getElementById('source-select').value || undefined;
}

function renderSources() {
  const select = document.getElementById('source-select');
  const detection = document.getElementById('source-detection');
  select.innerHTML = '';
  for (const source of sourceContext?.sources ?? []) {
    const option = document.createElement('option');
    option.value = source.id;
    option.textContent = `${source.name} · ${(source.sourceType || 'OTHER').replaceAll('_', ' ')}`;
    select.append(option);
  }
  const preferred = sourceContext?.detectedSource?.id ?? sourceContext?.unclassified?.id;
  if (preferred) select.value = preferred;
  detection.textContent = sourceContext?.detectedSource
    ? `Detected from this domain: ${sourceContext.detectedSource.name}`
    : 'This domain is not yet classified. You can add a Job Source or keep Unclassified Source.';
}

async function loadSources() {
  if (!captured?.url) return;
  sourceContext = await api(`/api/browser-companion/sources?url=${encodeURIComponent(captured.url)}`);
  renderSources();
}

async function createSource() {
  const name = document.getElementById('source-name').value.trim();
  if (!name || !captured?.url) return setMessage('Enter a Job Source name first.');
  let baseUrl = captured.url;
  try { const url = new URL(captured.url); baseUrl = `${url.protocol}//${url.host}`; } catch {}
  setMessage('Creating Job Source…');
  try {
    const result = await api('/api/browser-companion/sources', {
      method: 'POST',
      body: JSON.stringify({ name, baseUrl, careersUrl: baseUrl, sourceType: document.getElementById('source-type').value, auditNow: true, defaultIntervalMinutes: 1440 }),
    });
    await loadSources();
    document.getElementById('source-select').value = result.source.id;
    document.getElementById('source-form').hidden = true;
    setMessage(`Job Source created: ${result.source.name}`);
  } catch (error) { setMessage(error.message); }
}

function selectedCvVersionId() {
  return document.getElementById('cv-select').value || undefined;
}

function setMessage(value) {
  document.getElementById('message').textContent = value;
}

function renderAnalysis() {
  const detection = document.getElementById('detection');
  const confidence = document.getElementById('confidence');
  const notJob = document.getElementById('not-job');
  const cvSection = document.getElementById('cv-section');
  const meta = document.getElementById('job-meta');

  detection.textContent = analysis?.isJob ? 'Job detected' : 'Job not confirmed';
  detection.className = `detection ${analysis?.isJob ? 'detected' : 'uncertain'}`;
  confidence.textContent = analysis?.confidence ? `${analysis.confidence.toLowerCase()} confidence` : '';
  notJob.hidden = Boolean(analysis?.isJob);
  cvSection.hidden = !analysis?.isJob;

  if (analysis?.extracted) {
    document.getElementById('title').textContent = analysis.extracted.title || captured?.pageTitle || 'Current page';
    meta.textContent = [analysis.extracted.company, analysis.extracted.location].filter(Boolean).join(' · ');
  }
}

function renderCvs() {
  const select = document.getElementById('cv-select');
  select.innerHTML = '';
  if (!cvs.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No CVs in library yet';
    select.append(option);
    document.getElementById('compare').disabled = true;
    document.getElementById('save-with-cv').disabled = true;
    document.getElementById('improve').disabled = true;
    return;
  }
  for (const cv of cvs) {
    if (!cv.latestVersion) continue;
    const option = document.createElement('option');
    option.value = cv.latestVersion.id;
    const linkedProfiles = (cv.profileLinks ?? []).map((link) => `${link.profile?.name ?? 'Profile'}${link.isDefault ? ' (default)' : ''}`);
    const profileLabel = linkedProfiles.length ? ` · ${linkedProfiles.join(', ')}` : '';
    option.textContent = `${cv.name} · v${cv.latestVersion.versionNumber}${cv.isMaster ? ' · Master' : ''}${profileLabel}`;
    select.append(option);
  }
}

function renderMatch(match) {
  currentMatch = match;
  const panel = document.getElementById('match');
  panel.hidden = !match;
  if (!match) return;
  document.getElementById('match-score').textContent = `${match.score}%`;
  document.getElementById('match-evidenced').textContent = match.evidencedCount;
  document.getElementById('match-partial').textContent = match.partialCount;
  document.getElementById('match-missing').textContent = match.notEvidencedCount;
  document.getElementById('match-confirm').textContent = match.needsConfirmationCount;
  const gaps = match.items.filter((item) => !['EVIDENCED', 'NOT_APPLICABLE'].includes(item.status)).slice(0, 4);
  document.getElementById('match-gaps').innerHTML = gaps.map((item) => `<div><span>${item.status.replaceAll('_', ' ')}</span><p>${escapeHtml(item.requirementText)}</p></div>`).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

async function init() {
  const config = await settings();
  if (!config.apiBase || !config.companionToken) {
    document.getElementById('loading').hidden = true;
    document.getElementById('setup').hidden = false;
    return;
  }

  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  const result = await ext.scripting.executeScript({ target: { tabId: tab.id }, func: capturePage });
  captured = result[0]?.result;
  document.getElementById('loading').hidden = true;
  document.getElementById('content').hidden = false;
  document.getElementById('title').textContent = captured?.pageTitle || 'Current page';
  document.getElementById('url').textContent = captured?.url || '';

  try {
    await loadSources();
    analysis = await api('/api/browser-companion/analyze-page', { method: 'POST', body: JSON.stringify(captured) });
    renderAnalysis();
    if (analysis.isJob) {
      const cvResponse = await api('/api/browser-companion/cvs');
      cvs = cvResponse.cvs ?? [];
      renderCvs();
    }
    const context = await api(`/api/browser-companion/context?url=${encodeURIComponent(captured.url)}`);
    existingContext = context;
    if (context.found) {
      const existing = document.getElementById('existing');
      existing.hidden = false;
      existing.textContent = context.application
        ? `Already tracked · ${context.application.stage.replaceAll('_', ' ')}`
        : `Already saved as ${context.title}`;
      document.getElementById('save').disabled = true;
      document.getElementById('save-with-cv').disabled = true;
      if (context.application) document.getElementById('applied').disabled = true;
    }
  } catch (error) {
    if (error.message !== 'SETUP_REQUIRED') setMessage(error.message);
  }
}

async function compareCv() {
  const cvVersionId = selectedCvVersionId();
  if (!cvVersionId || !captured) return;
  setMessage('Comparing this page with your CV…');
  try {
    const result = await api('/api/browser-companion/compare-page', {
      method: 'POST',
      body: JSON.stringify({ ...captured, cvVersionId }),
    });
    renderMatch(result.match);
    setMessage(result.match ? 'CV comparison complete. “Not evidenced” means the CV does not show it; it does not automatically mean you lack it.' : 'This page could not be compared as a job.');
  } catch (error) {
    setMessage(error.message);
  }
}

async function save(action, includeCv = false) {
  setMessage('Checking this URL…');
  try {
    const context = await api(`/api/browser-companion/context?url=${encodeURIComponent(captured.url)}`);
    existingContext = context;
    if (context.found && (action === 'SAVE' || context.application)) {
      setMessage(context.application ? `Already tracked · ${context.application.stage.replaceAll('_', ' ')}` : `This URL is already saved as ${context.title}.`);
      return;
    }
    setMessage('Saving…');
    const note = document.getElementById('note').value.trim();
    const cvVersionId = includeCv ? selectedCvVersionId() : undefined;
    const result = await api('/api/browser-companion/capture', {
      method: 'POST',
      body: JSON.stringify({
        ...captured,
        action,
        ...(note ? { note } : {}),
        ...(cvVersionId ? { cvVersionId } : {}),
        ...(selectedSourceId() ? { sourceId: selectedSourceId() } : {}),
        private: false,
      }),
    });
    if (result.cvMatch) renderMatch(result.cvMatch);
    setMessage(result.existingJob
      ? 'Matched an existing job and updated it.'
      : action === 'APPLIED'
        ? 'Saved and added to your application tracker.'
        : includeCv
          ? 'Saved with this CV and comparison for later preparation.'
          : 'Saved to your job inbox.');
  } catch (error) {
    setMessage(error.message === 'SETUP_REQUIRED' ? 'Open settings and connect this extension first.' : error.message);
  }
}

async function improveCv() {
  const cvVersionId = selectedCvVersionId();
  if (!cvVersionId || !captured) return;
  setMessage('Preparing the CV workspace…');
  try {
    const note = document.getElementById('note').value.trim();
    const result = await api('/api/browser-companion/prepare-cv', {
      method: 'POST',
      body: JSON.stringify({
        ...captured,
        cvVersionId,
        ...(selectedSourceId() ? { sourceId: selectedSourceId() } : {}),
        action: 'SAVE',
        ...(note ? { note } : {}),
        private: false,
      }),
    });
    const config = await settings();
    if (!config.webAppBase) throw new Error('Add the web app address in extension settings.');
    await ext.tabs.create({ url: `${config.webAppBase}/#/cv-tailor?sessionId=${encodeURIComponent(result.session.id)}` });
    setMessage('Tailoring workspace opened in a new tab.');
  } catch (error) {
    setMessage(error.message);
  }
}

async function openCvLibrary() {
  const config = await settings();
  if (!config.webAppBase) return ext.runtime.openOptionsPage();
  await ext.tabs.create({ url: `${config.webAppBase}/#/profiles?tab=cvs` });
}

document.getElementById('save').addEventListener('click', () => save('SAVE'));
document.getElementById('applied').addEventListener('click', () => save('APPLIED', Boolean(selectedCvVersionId())));
document.getElementById('compare').addEventListener('click', compareCv);
document.getElementById('save-with-cv').addEventListener('click', () => save('SAVE', true));
document.getElementById('improve').addEventListener('click', improveCv);
document.getElementById('open-cv-library').addEventListener('click', openCvLibrary);
document.getElementById('open-options').addEventListener('click', () => ext.runtime.openOptionsPage());
document.getElementById('cv-select').addEventListener('change', () => renderMatch(null));
document.getElementById('toggle-source-form').addEventListener('click', () => { const form = document.getElementById('source-form'); form.hidden = !form.hidden; });
document.getElementById('create-source').addEventListener('click', createSource);
void init();
