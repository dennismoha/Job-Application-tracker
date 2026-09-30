import { BadRequestError } from '../../../shared/http/http-error.js';
import { assertPublicHttpUrl } from '../../../shared/network/public-url.js';

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_BYTES = 3_000_000;
const USER_AGENT = 'JobIntelligenceCollector/0.5 (+respectful public-job collector)';

export interface PublicFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  accept?: string;
}

export interface PublicFetchResult {
  response: Response;
  body: string;
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let body = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new BadRequestError('The collector response is larger than the configured safety limit.');
      }

      body += decoder.decode(value, { stream: true });
    }

    body += decoder.decode();
    return body;
  } finally {
    reader.releaseLock();
  }
}

export async function fetchPublicText(rawUrl: string, options: PublicFetchOptions = {}): Promise<PublicFetchResult> {
  let currentUrl = await assertPublicHttpUrl(rawUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    currentUrl = await assertPublicHttpUrl(currentUrl.toString());

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;

    try {
      response = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          accept: options.accept ?? 'text/html,application/xhtml+xml,application/json,application/xml,text/xml;q=0.9,*/*;q=0.5',
          'user-agent': USER_AGENT,
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');

      if (!location) {
        return { response, body: '' };
      }

      currentUrl = new URL(location, currentUrl);
      continue;
    }

    const contentLength = Number(response.headers.get('content-length') ?? '0');

    if (contentLength > maxBytes) {
      throw new BadRequestError('The collector response is larger than the configured safety limit.');
    }

    const body = await readLimitedBody(response, maxBytes);
    return { response, body };
  }

  throw new BadRequestError('The source redirected too many times.');
}

export async function sleepForSource(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
