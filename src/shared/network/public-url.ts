import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { BadRequestError } from '../http/http-error.js';

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.')
  );
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);

  if (version === 4) {
    return isPrivateIpv4(address);
  }

  if (version === 6) {
    return isPrivateIpv6(address);
  }

  return true;
}

/**
 * Source audits make outbound requests to user-supplied URLs. Resolve the host
 * first and reject local/private networks so this feature cannot be used as an
 * SSRF tunnel into the machine or hosting provider's internal network.
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestError('A valid source URL is required.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new BadRequestError('Only HTTP and HTTPS source URLs are supported.');
  }

  if (url.username || url.password) {
    throw new BadRequestError('Source URLs cannot contain embedded credentials.');
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new BadRequestError('Local network URLs cannot be audited.');
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true }).catch(() => []);

  if (addresses.length === 0) {
    throw new BadRequestError('The source hostname could not be resolved.');
  }

  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new BadRequestError('Private or local network URLs cannot be audited.');
  }

  return url;
}
