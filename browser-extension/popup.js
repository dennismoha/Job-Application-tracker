const ext = globalThis.browser ?? globalThis.chrome;
let captured = null;
let analysis = null;
let cvs = [];
let currentMatch = null;
let improvedCv = null;
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
  console.log('API response:', { path, status: response ,body });
  if (!response.ok) throw new Error(body?.message ?? `Request failed (${response.status})`);
  return body;
}

async function capturePage() {
  const startedAt = performance.now();

  const cleanText = (value) =>
    String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const isVisible = (element) => {
    if (!(element instanceof Element)) return false;

    const style = window.getComputedStyle(element);

    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }

    const rect = element.getBoundingClientRect();

    return rect.width > 0 && rect.height > 0;
  };

  const cssPath = (element) => {
    if (!(element instanceof Element)) return null;

    const parts = [];
    let current = element;

    while (
      current &&
      current.nodeType === Node.ELEMENT_NODE &&
      parts.length < 8
    ) {
      let part = current.tagName.toLowerCase();

      if (current.id) {
        part += `#${CSS.escape(current.id)}`;
        parts.unshift(part);
        break;
      }

      const classes = [...current.classList]
        .filter(Boolean)
        .slice(0, 3);

      if (classes.length) {
        part += `.${classes.map(CSS.escape).join(".")}`;
      }

      const parent = current.parentElement;

      if (parent) {
        const siblings = [...parent.children].filter(
          (child) => child.tagName === current.tagName,
        );

        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
      }

      parts.unshift(part);
      current = parent;
    }

    return parts.join(" > ");
  };

  const attributes = (element) => {
    if (!(element instanceof Element)) return {};

    const result = {};

    for (const attribute of element.attributes) {
      const name = attribute.name;

      if (
        name === "class" ||
        name === "id" ||
        name.startsWith("data-") ||
        name.startsWith("aria-") ||
        name === "role" ||
        name === "name" ||
        name === "type" ||
        name === "href"
      ) {
        result[name] = attribute.value;
      }
    }

    return result;
  };

  const elementSummary = (element) => {
    const text = cleanText(
      element.innerText || element.textContent || "",
    );

    const rect = element.getBoundingClientRect();

    return {
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role"),
      id: element.id || null,
      className:
        typeof element.className === "string"
          ? element.className
          : null,
      attributes: attributes(element),
      heading:
        cleanText(
          element.querySelector("h1,h2,h3,h4,h5,h6")?.innerText ||
            (element.matches("h1,h2,h3,h4,h5,h6")
              ? element.innerText
              : ""),
        ) || null,
      text,
      textLength: text.length,
      rect: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      selector: cssPath(element),
    };
  };

  const uniqueElements = (elements) => {
    const seen = new Set();

    return elements.filter((element) => {
      if (seen.has(element)) return false;
      seen.add(element);
      return true;
    });
  };

  const semanticSelector =
    "main,article,section,[role='main'],[role='article']," +
    "[role='region'],[role='dialog'],[role='tabpanel'],aside";

  const headings = [
    ...document.querySelectorAll("h1,h2,h3,h4,h5,h6"),
  ]
    .filter(isVisible)
    .map((element) => ({
      level: Number(element.tagName.substring(1)),
      text: cleanText(element.innerText),
      selector: cssPath(element),
      attributes: attributes(element),
    }))
    .filter((item) => item.text)
    .slice(0, 150);

  const links = [...document.querySelectorAll("a")]
    .filter(isVisible)
    .map((element) => ({
      text: cleanText(element.innerText || element.textContent),
      href: element.href || null,
      target: element.target || null,
      rel: element.rel || null,
      selector: cssPath(element),
    }))
    .filter((item) => item.text || item.href)
    .slice(0, 300);

  const buttons = [
    ...document.querySelectorAll(
      "button,[role='button'],input[type='button'],input[type='submit']",
    ),
  ]
    .filter(isVisible)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      text: cleanText(
        element.innerText ||
          element.textContent ||
          element.getAttribute("aria-label") ||
          element.getAttribute("value") ||
          "",
      ),
      ariaLabel: element.getAttribute("aria-label"),
      type: element.getAttribute("type"),
      selector: cssPath(element),
      attributes: attributes(element),
    }))
    .filter((item) => item.text || item.ariaLabel)
    .slice(0, 150);

  const semanticElements = uniqueElements([
    ...document.querySelectorAll(semanticSelector),
  ]).filter(isVisible);

  const regions = semanticElements
    .map(elementSummary)
    .filter((region) => region.textLength >= 80)
    .sort((a, b) => b.textLength - a.textLength)
    .slice(0, 80);

  const jobSignalPattern = [
    /\babout the job\b/i,
    /\babout the role\b/i,
    /\bjob description\b/i,
    /\bposition overview\b/i,
    /\bkey responsibilities\b/i,
    /\bresponsibilities\b/i,
    /\bwhat you'll do\b/i,
    /\bwhat you will do\b/i,
    /\brequired qualifications\b/i,
    /\bpreferred qualifications\b/i,
    /\bqualifications\b/i,
    /\brequirements\b/i,
    /\bskills\b/i,
    /\bexperience\b/i,
    /\beducation\b/i,
    /\bapply\b/i,
    /\bsave\b/i,
    /\bfull-time\b/i,
    /\bpart-time\b/i,
    /\bcontract\b/i,
    /\bremote\b/i,
    /\bsalary\b/i,
    /\bcompensation\b/i,
    /\bposted\b/i,
  ];

  const candidateElements = uniqueElements([
    ...document.querySelectorAll(semanticSelector),
    ...document.querySelectorAll("h1,h2,h3"),
  ]).filter(isVisible);

  const jobCandidates = [];

  for (const element of candidateElements) {
    const text = cleanText(
      element.innerText || element.textContent || "",
    );

    if (text.length < 100) continue;

    const matchedSignals = jobSignalPattern.filter((pattern) =>
      pattern.test(text),
    );

    const heading =
      cleanText(
        element.querySelector("h1,h2,h3")?.innerText ||
          (element.matches("h1,h2,h3") ? element.innerText : ""),
      ) || null;

    const score =
      matchedSignals.length * 2 +
      (heading ? 3 : 0) +
      (/\bjob\b|\bengineer\b|\bdeveloper\b|\bteacher\b|\banalyst\b|\bmanager\b|\bspecialist\b|\bdirector\b/i.test(
        heading || "",
      )
        ? 4
        : 0) +
      (/\bapply\b/i.test(text) ? 2 : 0) +
      (/\brequirements\b|\bqualifications\b|\bresponsibilities\b/i.test(
        text,
      )
        ? 4
        : 0);

    if (score < 6) continue;

    const summary = elementSummary(element);

    summary.score = score;
    summary.matchedSignals = matchedSignals.map(
      (pattern) => pattern.source,
    );

    jobCandidates.push(summary);
  }

  jobCandidates.sort(
    (a, b) => b.score - a.score || b.textLength - a.textLength,
  );

  const structuredData = [
    ...document.querySelectorAll(
      'script[type="application/ld+json"]',
    ),
  ].map((script) => {
    const raw = script.textContent || "";

    try {
      return { parsed: true, data: JSON.parse(raw) };
    } catch {
      return { parsed: false, raw: raw.slice(0, 20000) };
    }
  });

  const extractJobPostingData = (blocks) => {
    const result = [];

    const visit = (value) => {
      if (!value || typeof value !== "object") return;

      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }

      const type = value["@type"];
      const types = Array.isArray(type) ? type : [type];

      if (
        types.some(
          (item) =>
            String(item).toLowerCase() === "jobposting",
        )
      ) {
        result.push(limitObject(value, 8000));
      }

      Object.values(value).forEach(visit);
    };

    blocks.forEach((block) => {
      if (block?.parsed) visit(block.data);
    });

    return result.slice(0, 3);
  };

  const limitObject = (value, maxCharacters) => {
    const seen = new WeakSet();

    const walk = (item) => {
      if (item == null || typeof item !== "object") return item;

      if (seen.has(item)) return "[Circular]";
      seen.add(item);

      if (Array.isArray(item)) {
        return item.slice(0, 50).map(walk);
      }

      const output = {};

      for (const [key, child] of Object.entries(item)) {
        if (["image", "logo", "sameAs"].includes(key)) continue;
        output[key] = walk(child);
      }

      return output;
    };

    const result = walk(value);
    const json = JSON.stringify(result);

    if (json.length <= maxCharacters) return result;

    return {
      truncated: true,
      text: json.slice(0, maxCharacters),
    };
  };

  const compactText = (value, maxCharacters) => {
    const text = String(value || "").trim();

    if (text.length <= maxCharacters) return text;

    const headLength = Math.floor(maxCharacters * 0.55);
    const tailLength = Math.floor(maxCharacters * 0.35);

    const head = text.slice(0, headLength);
    const tail = text.slice(-tailLength);

    const sectionChunks = extractImportantSectionChunks(
      text,
      maxCharacters - head.length - tail.length,
    );

    return (
      `${head}\n\n[...middle condensed...]\n\n` +
      `${sectionChunks}\n\n[...tail...]\n\n${tail}`
    );
  };

  const extractImportantSectionChunks = (text, budget) => {
    const sectionPattern =
      /(^|\n)\s*(about the job|about the role|job description|position overview|key responsibilities|responsibilities|what you'll do|what you will do|required qualifications|preferred qualifications|qualifications|requirements|skills|experience|education|benefits|compensation|about the company)\s*:?\s*/gi;

    const matches = [...text.matchAll(sectionPattern)];
    const chunks = [];

    for (let index = 0; index < matches.length; index += 1) {
      const start = matches[index].index ?? 0;
      const end = matches[index + 1]?.index ?? text.length;

      const chunk = text
        .slice(start, Math.min(end, start + 2600))
        .trim();

      if (chunk) chunks.push(chunk);
      if (chunks.join("\n\n").length >= budget) break;
    }

    return chunks.join("\n\n").slice(0, Math.max(0, budget));
  };

  const visibleBodyText = cleanText(
    document.body?.innerText || "",
  );

  const rawCapture = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    url: location.href,
    urlHostname: location.hostname,
    urlPathname: location.pathname,
    urlSearch: location.search,
    urlHash: location.hash,
    pageTitle: document.title,
    document: {
      readyState: document.readyState,
      bodyText: visibleBodyText,
      bodyTextLength: visibleBodyText.length,
      htmlLang: document.documentElement.lang || null,
    },
    headings,
    links,
    buttons,
    meta: [...document.querySelectorAll("meta")]
      .map((element) => ({
        name:
          element.getAttribute("name") ||
          element.getAttribute("property") ||
          element.getAttribute("http-equiv"),
        content: element.getAttribute("content"),
      }))
      .filter((item) => item.name && item.content)
      .slice(0, 150),
    structuredData,
    regions,
    jobCandidates,
    stats: {
      visibleTextCharacters: visibleBodyText.length,
      headingCount: headings.length,
      linkCount: links.length,
      buttonCount: buttons.length,
      regionCount: semanticElements.length,
      jobCandidateCount: jobCandidates.length,
      structuredDataBlockCount: structuredData.length,
      elapsedMs: Math.round(performance.now() - startedAt),
    },
  };

  // Build the compact payload that will be sent to the backend.
  const selected = rawCapture.jobCandidates[0] || null;

  const candidates = rawCapture.jobCandidates
    .slice(0, 5)
    .map((candidate, index) => ({
      rank: index + 1,
      score: candidate.score,
      heading: candidate.heading,
      tag: candidate.tag,
      role: candidate.role,
      selector: candidate.selector,
      matchedSignals: candidate.matchedSignals,
      text: compactText(
        candidate.text,
        index === 0 ? 10000 : 1200,
      ),
    }));

  const jobPostingData = extractJobPostingData(
    rawCapture.structuredData,
  );

  const selectedText = selected
    ? compactText(selected.text, 10000)
    : null;

  const compactCapture = {
    schemaVersion: 2,
    purpose: "GPT-ready job-page diagnostic input",
    page: {
      url: rawCapture.url,
      title: rawCapture.pageTitle,
      hostname: rawCapture.urlHostname,
      pathname: rawCapture.urlPathname,
    },
    selectedJobCandidate: selected
      ? {
          score: selected.score,
          heading: selected.heading,
          tag: selected.tag,
          role: selected.role,
          selector: selected.selector,
          matchedSignals: selected.matchedSignals,
          text: selectedText,
        }
      : null,
    alternativeCandidates: candidates.slice(1),
    headings: rawCapture.headings.slice(0, 80),
    jobPostingStructuredData: jobPostingData,
    pageSignals: {
      bodyTextLength: rawCapture.stats.visibleTextCharacters,
      candidateCount: rawCapture.stats.jobCandidateCount,
      structuredDataBlockCount:
        rawCapture.stats.structuredDataBlockCount,
    },
  };

  compactCapture.stats = {
    gptInputCharacters: JSON.stringify(compactCapture).length,
    selectedCandidateCharacters: selectedText?.length || 0,
  };

  console.log("Captured page data:", compactCapture);

  return compactCapture;
}
// function capturePage() {
//   const structuredData = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((node) => {
//     try { return [JSON.parse(node.textContent || '')]; } catch { return []; }
//   });
//   const selection = window.getSelection()?.toString().trim();
//   const main = document.querySelector('main, [role="main"], article');
//   const pageText = (main?.innerText || document.body.innerText || '').slice(0, 100000);
//   return { url: location.href, pageTitle: document.title, selectedText: selection || undefined, pageText, structuredData };
// }

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
  if (!captured?.page?.url) return;
  sourceContext = await api(`/api/browser-companion/sources?url=${encodeURIComponent(captured.page.url)}`);
  console.log('Loaded source context:', sourceContext);
  renderSources();
}

async function createSource() {
  const name = document.getElementById('source-name').value.trim();
  if (!name || !captured?.page?.url) return setMessage('Enter a Job Source name first.');
  let baseUrl = captured?.page?.url;
  try { const url = new URL(captured?.page?.url); baseUrl = `${url.protocol}//${url.host}`; } catch {}
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
  improvedCv = match?.improvedCv ?? null;
  document.getElementById('improve').disabled = !improvedCv;
  const panel = document.getElementById('match');
  panel.hidden = !match;
  if (!match) return;
  const items = Array.isArray(match.items) ? match.items : [];
  const total = items.length;
  document.getElementById('match-cv-name').textContent = match.cv?.name
    ? `${match.cv.name}${match.cv.versionNumber ? ` · v${match.cv.versionNumber}` : ''}`
    : 'Selected CV';
  const verdict = document.getElementById('match-verdict');
  verdict.textContent = match.verdict ? String(match.verdict).replaceAll('_', ' ') : '';
  verdict.hidden = !match.verdict;
  document.getElementById('match-score').textContent = `${match.score ?? 0}%`;
  document.getElementById('match-evidenced').textContent = match.evidencedCount ?? 0;
  document.getElementById('match-partial').textContent = match.partialCount ?? 0;
  document.getElementById('match-missing').textContent = match.notEvidencedCount ?? 0;
  document.getElementById('match-confirm').textContent = match.needsConfirmationCount ?? 0;
  document.getElementById('match-requirement-count').textContent = `${total} ${total === 1 ? 'requirement' : 'requirements'}`;
  document.getElementById('match-summary').textContent = match.summary
    || (total
      ? `${match.evidencedCount ?? 0} of ${total} requirements have clear evidence in this CV. Review each finding before deciding what to emphasize.`
      : 'No job requirements were available to compare with this CV.');

  const findings = document.getElementById('match-gaps');
  findings.replaceChildren();
  const statusLabels = {
    EVIDENCED: 'Evidenced',
    PARTIAL: 'Partial evidence',
    NOT_EVIDENCED: 'Not evidenced',
    NEEDS_CONFIRMATION: 'Confirm',
    NOT_APPLICABLE: 'Not applicable',
  };
  for (const item of items) {
    const article = document.createElement('article');
    article.className = `finding finding-${String(item.status ?? '').toLowerCase().replaceAll('_', '-')}`;

    const top = document.createElement('div');
    top.className = 'finding-top';
    const status = document.createElement('span');
    status.className = 'finding-status';
    status.textContent = statusLabels[item.status] ?? String(item.status ?? 'Review');
    const meta = document.createElement('span');
    meta.className = 'finding-meta';
    meta.textContent = [item.kind, item.priority != null ? `Priority ${item.priority}` : '']
      .filter(Boolean)
      .join(' · ');
    top.append(status, meta);

    const requirement = document.createElement('p');
    requirement.className = 'finding-requirement';
    requirement.textContent = item.requirementText ?? '';
    article.append(top, requirement);

    if (item.evidence) {
      const evidence = document.createElement('p');
      evidence.className = 'finding-evidence';
      evidence.textContent = `CV evidence: “${item.evidence}”`;
      article.append(evidence);
    }
    if (item.suggestion) {
      const suggestion = document.createElement('p');
      suggestion.className = 'finding-suggestion';
      suggestion.textContent = item.suggestion;
      article.append(suggestion);
    }
    findings.append(article);
  }
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
  document.getElementById('url').textContent = captured?.page?.url || '';
  console.log('Captured page data:', captured);
  try {
    await loadSources();
    analysis = await api('/api/browser-companion/analyze-page', { method: 'POST', body: JSON.stringify(captured) });
    console.log('analysis result:', analysis);
    renderAnalysis();
    if (analysis.isJob) {
      const cvResponse = await api('/api/browser-companion/cvs');
      cvs = cvResponse.cvs ?? [];
      renderCvs();
    }
    const context = await api(`/api/browser-companion/context?url=${encodeURIComponent(captured.page.url)}`);
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
  console.log('captured is ', captured);
  setMessage('Comparing this page with your CV…');

  const [tab] = await ext.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      throw new Error("Could not identify the active browser tab.");
    }

    if (!/^https?:\/\//i.test(tab.url || "")) {
      throw new Error(
        "This page cannot be inspected. Open a normal HTTP or HTTPS page.",
      );
    }
    console.log('analysis structure is ', analysis);
  try {
    const result = await api('/api/browser-companion/compare-page', {
      method: 'POST',
      body: JSON.stringify({ capture: captured, cvVersionId }),
    });

    renderMatch(result.match);
    console.log('===> compare result:', result);
    if (result.match) {
      setMessage('CV comparison complete. “Not evidenced” means the CV does not show it; it does not automatically mean you lack it.');
    } else {
      setMessage(`This page could not be compared as a job (${result.pageType ?? 'no page type'}${result.extracted ? '' : ', no extracted job'}).`);
    }
  } catch (error) {
    setMessage(error.message);
  }
}

async function save(action, includeCv = false) {
  setMessage('Checking this URL…');
  try {
    const context = await api(`/api/browser-companion/context?url=${encodeURIComponent(captured?.page?.url)}`);
    console.log('context result:', context);
    existingContext = context;
    if (context.found && (action === 'SAVE' || context.application)) {
      setMessage(context.application ? `Already tracked · ${context.application.stage.replaceAll('_', ' ')}` : `This URL is already saved as ${context.title}.`);
      return;
    }
    setMessage('Saving…');
    const note = document.getElementById('note').value.trim();
    const cvVersionId = includeCv ? selectedCvVersionId() : undefined;
    console.log(' the current structure of captured is ', captured);
    const result = await api('/api/browser-companion/capture', {
      method: 'POST',
      body: JSON.stringify({
        ...captured,
        url: captured?.page?.url,
        pageTitle: captured?.page?.pageTitle,
        selectedText: '',
        pageText: JSON.stringify(analysis),
        structuredData: null,
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

function createChatGPTUrl(payload) {
  const prompt = `${payload.system_prompt}\n\nCV content JSON:\n${JSON.stringify(payload.cv_content, null, 2)}\n\nReturn the completed CV as valid JSON, then provide a polished, print-ready version that I can save as a PDF.`;
  const url = new URL('https://chatgpt.com/');
  url.searchParams.set('q', prompt);
  return url.toString();
}

async function improveCv() {
  if (!improvedCv) {
    setMessage('Compare a CV with this job first to generate improved CV content.');
    return;
  }

  const payload = {
    system_prompt: `Convert the supplied CV JSON into a professionally formatted CV data object.\n\nRequirements:\n- Preserve the existing JSON structure.\n- Keep all existing keys.\n- Populate fields using only the supplied information.\n- Use concise, achievement-oriented descriptions.\n- Do not invent qualifications or experience.\n- use the plaintext key in the json. when done, produce a pdf version of it for the user to download.`,
    cv_content: improvedCv,
  };

  try {
    await ext.tabs.create({ url: createChatGPTUrl(payload) });
    setMessage('Opened the job-tailored CV prompt in ChatGPT.');
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

