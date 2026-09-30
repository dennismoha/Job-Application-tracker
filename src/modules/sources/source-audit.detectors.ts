export interface AtsDetection {
  provider: string | null;
  evidence: string[];
}

const ATS_PATTERNS: Array<[string, RegExp]> = [
  ['Greenhouse', /greenhouse\.io|greenhouse\.com|boards\.greenhouse/i],
  ['Lever', /jobs\.lever\.co|lever\.co/i],
  ['Ashby', /jobs\.ashbyhq\.com|ashbyhq/i],
  ['Workable', /apply\.workable\.com|workable\.com/i],
  ['SmartRecruiters', /smartrecruiters\.com/i],
  ['Workday', /myworkdayjobs\.com|workday\.com/i],
  ['Recruitee', /recruitee\.com/i],
  ['Personio', /personio\.de|personio\.com/i],
  ['SchoolRecruiter', /schoolrecruiter\.com/i],
  ['SuccessFactors', /successfactors\.com/i],
];

export function detectAts(url: string, html: string): AtsDetection {
  const haystack = `${url}\n${html}`;

  for (const [provider, pattern] of ATS_PATTERNS) {
    if (pattern.test(haystack)) {
      return { provider, evidence: [provider] };
    }
  }

  return { provider: null, evidence: [] };
}

export function detectStructuredData(html: string): {
  hasJsonLd: boolean;
  hasJobPosting: boolean;
  hasRss: boolean;
} {
  const hasJsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
  const hasJobPosting = /["']@type["']\s*:\s*["']JobPosting["']/i.test(html);
  const hasRss = /<link[^>]+type=["']application\/(rss\+xml|atom\+xml)["']/i.test(html);

  return { hasJsonLd, hasJobPosting, hasRss };
}

export function detectPageSignals(html: string): {
  scriptCount: number;
  visibleTextLength: number;
  isJavascriptHeavy: boolean;
  loginSignal: boolean;
  challengeSignal: boolean;
  emailAlertSignal: boolean;
  applicationLinkSignal: boolean;
} {
  const scriptCount = (html.match(/<script\b/gi) ?? []).length;
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const visibleTextLength = withoutScripts.length;
  const lower = withoutScripts.toLowerCase();
  const rawLower = html.toLowerCase();

  const challengeSignal = [
    'verify you are human',
    'checking your browser',
    'captcha',
    'cf-chl-',
    'unusual traffic',
    'access denied',
  ].some((value) => rawLower.includes(value));

  const loginSignal = /\b(sign in|log in|login|required to sign in|create an account)\b/i.test(lower);
  const emailAlertSignal = /\b(job alert|job alerts|email alert|email alerts|subscribe to jobs|job notification)\b/i.test(lower);
  const applicationLinkSignal = /href=["'][^"']*(apply|application|vacanc|job)[^"']*["']/i.test(html);
  const isJavascriptHeavy =
    (scriptCount >= 12 && visibleTextLength < 2500) ||
    /id=["'](__next|__next_data__|root)["']/i.test(html) && visibleTextLength < 1500;

  return {
    scriptCount,
    visibleTextLength,
    isJavascriptHeavy,
    loginSignal,
    challengeSignal,
    emailAlertSignal,
    applicationLinkSignal,
  };
}
