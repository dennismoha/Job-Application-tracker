import { CollectionCapability, AuditConfidence, SourceAccessState } from '@prisma/client';

import { BadRequestError } from '../../shared/http/http-error.js';
import { assertPublicHttpUrl } from '../../shared/network/public-url.js';
import { detectAts, detectPageSignals, detectStructuredData } from './source-audit.detectors.js';

const AUDIT_TIMEOUT_MS = 15_000;
const USER_AGENT = 'JobIntelligenceSourceAudit/0.1 (+respectful source capability check)';
const MAX_HTML_BYTES = 2_000_000;

export interface SourceAuditResult {
  targetUrl: string;
  finalUrl?: string | undefined;
  httpStatus?: number | undefined;
  responseTimeMs?: number | undefined;
  robotsAvailable?: boolean | undefined;
  robotsAllows?: boolean | undefined;
  atsProvider?: string | undefined;
  hasApi: boolean;
  hasRss: boolean;
  hasJsonLd: boolean;
  hasJobPosting: boolean;
  isJavascriptHeavy: boolean;
  requiresLogin: boolean;
  challengeDetected: boolean;
  emailAlertsAvailable: boolean;
  applicationLinksFound: boolean;
  recommendedCapability: CollectionCapability;
  confidence: AuditConfidence;
  accessState: SourceAccessState;
  notes: string[];
  metadata: Record<string, unknown>;
}

async function fetchWithTimeout(initialUrl: URL): Promise<Response> {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    // Validate every redirect target as well as the original URL. A public page
    // must not be able to redirect the audit worker into a private network.
    currentUrl = await assertPublicHttpUrl(currentUrl.toString());

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUDIT_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5',
          'user-agent': USER_AGENT,
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get('location');

    if (!location) {
      return response;
    }

    currentUrl = new URL(location, currentUrl);
  }

  throw new BadRequestError('The source redirected too many times during the audit.');
}

function parseRobotsForWildcard(robots: string, pathname: string): boolean | undefined {
  const lines = robots.split(/\r?\n/).map((line) => line.split('#')[0]?.trim() ?? '');
  let wildcardBlock = false;
  const disallows: string[] = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }

    const [rawKey, ...rawValue] = line.split(':');
    const key = rawKey?.trim().toLowerCase();
    const value = rawValue.join(':').trim();

    if (key === 'user-agent') {
      wildcardBlock = value === '*';
      continue;
    }

    if (wildcardBlock && key === 'disallow' && value) {
      disallows.push(value);
    }
  }

  if (disallows.length === 0) {
    return true;
  }

  return !disallows.some((path) => path === '/' || pathname.startsWith(path));
}

function recommendMode(input: {
  status?: number;
  challengeDetected: boolean;
  requiresLogin: boolean;
  emailAlertsAvailable: boolean;
  robotsAllows?: boolean | undefined;
  hasStructuredData: boolean;
}): { mode: CollectionCapability; confidence: AuditConfidence; accessState: SourceAccessState } {
  if (input.challengeDetected || input.status === 403 || input.status === 429) {
    return {
      mode: input.emailAlertsAvailable ? CollectionCapability.EMAIL_ONLY : CollectionCapability.RESTRICTED,
      confidence: AuditConfidence.HIGH,
      accessState: SourceAccessState.CHALLENGED,
    };
  }

  if (input.requiresLogin) {
    return {
      mode: input.emailAlertsAvailable ? CollectionCapability.EMAIL_ONLY : CollectionCapability.MANUAL_ONLY,
      confidence: AuditConfidence.MEDIUM,
      accessState: SourceAccessState.REQUIRES_LOGIN,
    };
  }

  if (input.robotsAllows === false) {
    return {
      mode: input.emailAlertsAvailable ? CollectionCapability.EMAIL_ONLY : CollectionCapability.SEARCH_ONLY,
      confidence: AuditConfidence.HIGH,
      accessState: SourceAccessState.OPEN,
    };
  }

  if (input.status && input.status >= 200 && input.status < 400) {
    return {
      mode: CollectionCapability.CRAWLABLE,
      confidence: input.hasStructuredData ? AuditConfidence.HIGH : AuditConfidence.MEDIUM,
      accessState: SourceAccessState.OPEN,
    };
  }

  return {
    mode: input.emailAlertsAvailable ? CollectionCapability.EMAIL_ONLY : CollectionCapability.MANUAL_ONLY,
    confidence: AuditConfidence.LOW,
    accessState: SourceAccessState.UNKNOWN,
  };
}

export const sourceAuditService = {
  async analyze(rawUrl: string): Promise<SourceAuditResult> {
    const url = await assertPublicHttpUrl(rawUrl);
    const notes: string[] = [];

    let robotsAvailable: boolean | undefined;
    let robotsAllows: boolean | undefined;

    try {
      const robotsUrl = new URL('/robots.txt', url.origin);
      const robotsResponse = await fetchWithTimeout(robotsUrl);
      robotsAvailable = robotsResponse.ok;

      if (robotsResponse.ok) {
        const robotsText = await robotsResponse.text();
        robotsAllows = parseRobotsForWildcard(robotsText, url.pathname);
      }
    } catch {
      robotsAvailable = false;
      notes.push('robots.txt could not be read during this audit.');
    }

    const startedAt = Date.now();
    let response: Response;

    try {
      response = await fetchWithTimeout(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown network error.';
      notes.push(`The source could not be reached during this audit: ${message}`);

      return {
        targetUrl: url.toString(),
        responseTimeMs: Date.now() - startedAt,
        robotsAvailable,
        robotsAllows,
        hasApi: false,
        hasRss: false,
        hasJsonLd: false,
        hasJobPosting: false,
        isJavascriptHeavy: false,
        requiresLogin: false,
        challengeDetected: false,
        emailAlertsAvailable: false,
        applicationLinksFound: false,
        recommendedCapability: CollectionCapability.MANUAL_ONLY,
        confidence: AuditConfidence.LOW,
        accessState: SourceAccessState.UNKNOWN,
        notes,
        metadata: { networkError: message },
      };
    }

    const responseTimeMs = Date.now() - startedAt;
    const contentLength = Number(response.headers.get('content-length') ?? '0');

    if (contentLength > MAX_HTML_BYTES) {
      throw new BadRequestError('The source response is too large for a capability audit.');
    }

    const contentType = response.headers.get('content-type') ?? '';
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const structured = detectStructuredData(html);
    const signals = detectPageSignals(html);
    const ats = detectAts(response.url, html);
    const challengeDetected = signals.challengeSignal || response.status === 403 || response.status === 429;
    const recommendation = recommendMode({
      status: response.status,
      challengeDetected,
      requiresLogin: signals.loginSignal && signals.visibleTextLength < 3000,
      emailAlertsAvailable: signals.emailAlertSignal,
      robotsAllows,
      hasStructuredData: structured.hasJobPosting || structured.hasJsonLd || Boolean(ats.provider),
    });

    if (signals.isJavascriptHeavy) {
      notes.push('The public page appears JavaScript-heavy; a browser-capable collector may be needed later.');
    }

    if (challengeDetected) {
      notes.push('An automated-access challenge or access-denied response was observed; no bypass was attempted.');
    }

    if (robotsAllows === false) {
      notes.push('The wildcard robots.txt rules appear to disallow this path.');
    }

    return {
      targetUrl: url.toString(),
      finalUrl: response.url,
      httpStatus: response.status,
      responseTimeMs,
      robotsAvailable,
      robotsAllows,
      atsProvider: ats.provider ?? undefined,
      hasApi: contentType.toLowerCase().includes('application/json'),
      hasRss: structured.hasRss,
      hasJsonLd: structured.hasJsonLd,
      hasJobPosting: structured.hasJobPosting,
      isJavascriptHeavy: signals.isJavascriptHeavy,
      requiresLogin: recommendation.accessState === SourceAccessState.REQUIRES_LOGIN,
      challengeDetected,
      emailAlertsAvailable: signals.emailAlertSignal,
      applicationLinksFound: signals.applicationLinkSignal,
      recommendedCapability: recommendation.mode,
      confidence: recommendation.confidence,
      accessState: recommendation.accessState,
      notes,
      metadata: {
        scriptCount: signals.scriptCount,
        visibleTextLength: signals.visibleTextLength,
        contentType,
      },
    };
  },
};
