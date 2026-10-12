import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { BadRequestError } from '../http/http-error.js';

const TRACKING_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id',
  'gclid','fbclid','msclkid','trk','trackingid','ref','refid','origin','originalsubdomain',
]);

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts as [number, number, number, number];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

function isPrivateIpv6(address: string): boolean {
  const value = address.toLowerCase();
  return value === '::1' || value === '::' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb') || value.startsWith('::ffff:127.') || value.startsWith('::ffff:10.') || value.startsWith('::ffff:192.168.');
}

export function normalizeHostname(value: string): string | null {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
}

export function sourceBaseUrl(value: string): string {
  const url = new URL(value);
  if (!['http:','https:'].includes(url.protocol)) throw new BadRequestError('Only HTTP and HTTPS URLs are supported.');
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  return `${url.protocol}//${host}${url.port ? `:${url.port}` : ''}`;
}

export function normalizeJobUrl(value: string): string {
  const url = new URL(value);
  if (!['http:','https:'].includes(url.protocol)) throw new BadRequestError('Only HTTP and HTTPS job URLs are supported.');
  url.hash = '';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');

  // LinkedIn search-result pages often carry the actual vacancy id in currentJobId.
  // Store that as a stable job URL instead of a transient search query URL.
  if (url.hostname === 'linkedin.com') {
    const jobId = url.searchParams.get('currentJobId');
    if (jobId && /^\d+$/.test(jobId)) return `https://linkedin.com/jobs/view/${jobId}`;
  }

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) throw new BadRequestError('Local or private network URLs are not allowed.');
  if (isIP(host)) {
    if ((isIP(host) === 4 && isPrivateIpv4(host)) || (isIP(host) === 6 && isPrivateIpv6(host))) throw new BadRequestError('Local or private network URLs are not allowed.');
    return;
  }
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (!addresses.length) throw new BadRequestError('The domain could not be resolved.');
  for (const item of addresses) {
    if ((item.family === 4 && isPrivateIpv4(item.address)) || (item.family === 6 && isPrivateIpv6(item.address))) {
      throw new BadRequestError('The URL resolves to a private/internal network address and cannot be checked.');
    }
  }
}

export interface UrlVerificationResult {
  requestedUrl: string;
  normalizedUrl: string;
  finalUrl: string;
  statusCode: number | null;
  reachable: boolean;
  exists: boolean;
  restricted: boolean;
  redirected: boolean;
  message: string;
}

async function requestOnce(url: string, method: 'HEAD'|'GET') {
  const parsed = new URL(url);
  await assertPublicHost(parsed);
  return fetch(parsed, {
    method,
    redirect: 'manual',
    headers: method === 'GET'
      ? { 'user-agent': 'JobIntel-LinkVerifier/1.0', range: 'bytes=0-2047', accept: 'text/html,application/xhtml+xml,*/*;q=0.1' }
      : { 'user-agent': 'JobIntel-LinkVerifier/1.0' },
    signal: AbortSignal.timeout(8_000),
  });
}

export async function verifyPublicUrl(value: string): Promise<UrlVerificationResult> {
  const normalizedUrl = normalizeJobUrl(value);
  let current = normalizedUrl;
  let redirected = false;
  let response: Response | null = null;

  try {
    for (let hop = 0; hop <= 5; hop += 1) {
      response = await requestOnce(current, 'HEAD');
      if ([405, 501].includes(response.status)) response = await requestOnce(current, 'GET');
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) break;
        current = new URL(location, current).toString();
        redirected = true;
        continue;
      }
      break;
    }
  } catch (error) {
    return {
      requestedUrl: value,
      normalizedUrl,
      finalUrl: current,
      statusCode: null,
      reachable: false,
      exists: false,
      restricted: false,
      redirected,
      message: error instanceof Error ? error.message : 'The URL could not be reached.',
    };
  }

  const status = response?.status ?? null;
  const missing = status === 404 || status === 410;
  const restricted = status !== null && [401,403,429].includes(status);
  const exists = status !== null && !missing && status < 500;
  return {
    requestedUrl: value,
    normalizedUrl,
    finalUrl: current,
    statusCode: status,
    reachable: status !== null,
    exists,
    restricted,
    redirected,
    message: missing ? `The final URL returned HTTP ${status}.` : restricted ? `The site exists but automated access returned HTTP ${status}.` : status ? `The final URL returned HTTP ${status}.` : 'The URL could not be verified.',
  };
}

export async function assertSavableUrl(value: string, label = 'URL'): Promise<UrlVerificationResult> {
  const result = await verifyPublicUrl(value);
  if (result.statusCode === 404 || result.statusCode === 410) throw new BadRequestError(`${label} does not exist anymore (${result.statusCode}).`);
  if (!result.reachable && /resolve|private|internal|ENOTFOUND|EAI_AGAIN/i.test(result.message)) throw new BadRequestError(`${label} could not be resolved.`);
  return result;
}
