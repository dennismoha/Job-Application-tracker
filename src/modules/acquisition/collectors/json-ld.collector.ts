import { ExtractionMethod, type Source } from '@prisma/client';

import { fetchPublicText } from './http-client.js';
import { stripHtml } from './html-utils.js';
import type { CollectorResult, JobSourceCollector, RawJobListing } from './collector.types.js';

function flattenJsonLd(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== 'object') return [];

  const object = value as Record<string, unknown>;
  const graph = Array.isArray(object['@graph']) ? object['@graph'] : [];
  return [object, ...graph.flatMap(flattenJsonLd)];
}

export function extractJobPostingNodes(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const scriptPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(scriptPattern)) {
    const payload = match[1]?.trim();
    if (!payload) continue;

    try {
      const parsed = JSON.parse(payload) as unknown;
      for (const candidate of flattenJsonLd(parsed)) {
        if (!candidate || typeof candidate !== 'object') continue;
        const object = candidate as Record<string, unknown>;
        const type = object['@type'];
        const types = Array.isArray(type) ? type.map(String) : [String(type ?? '')];
        if (types.some((item) => item.toLowerCase() === 'jobposting')) nodes.push(object);
      }
    } catch {
      // Invalid JSON-LD on one script should not prevent other valid job blocks from being used.
    }
  }

  return nodes;
}

function textValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function nestedText(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return textValue((value as Record<string, unknown>)[key]);
}

function readLocation(node: Record<string, unknown>): string | undefined {
  const value = node.jobLocation;
  const locations = Array.isArray(value) ? value : value ? [value] : [];

  for (const location of locations) {
    if (!location || typeof location !== 'object') continue;
    const address = (location as Record<string, unknown>).address;
    if (!address || typeof address !== 'object') continue;
    const record = address as Record<string, unknown>;
    const parts = [record.addressLocality, record.addressRegion, record.addressCountry]
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
    if (parts.length) return parts.join(', ');
  }

  return undefined;
}

function readSalary(node: Record<string, unknown>): string | undefined {
  const salary = node.baseSalary;
  if (!salary || typeof salary !== 'object') return undefined;
  try {
    return JSON.stringify(salary);
  } catch {
    return undefined;
  }
}

export function jobPostingToRaw(source: Source, node: Record<string, unknown>, fallbackUrl: string): RawJobListing {
  const hiringOrganization = node.hiringOrganization;
  const identifier = node.identifier;
  const identifierValue =
    typeof identifier === 'object' && identifier !== null
      ? textValue((identifier as Record<string, unknown>).value)
      : textValue(identifier);

  return {
    sourceId: source.id,
    externalId: identifierValue,
    requisitionId: identifierValue,
    sourceUrl: textValue(node.url) ?? fallbackUrl,
    applyUrl: textValue(node.url) ?? fallbackUrl,
    title: textValue(node.title),
    company: nestedText(hiringOrganization, 'name'),
    location: readLocation(node),
    description: textValue(node.description) ? stripHtml(String(node.description)) : undefined,
    salary: readSalary(node),
    postedAt: textValue(node.datePosted),
    expiresAt: textValue(node.validThrough),
    employmentType: Array.isArray(node.employmentType)
      ? node.employmentType.map(String).join(', ')
      : textValue(node.employmentType),
    extractionMethod: ExtractionMethod.JSON_LD,
    discoveredAt: new Date(),
    rawPayload: node,
  };
}

export class JsonLdCollector implements JobSourceCollector {
  name = 'json-ld';

  supports(_source: Source): boolean {
    return true;
  }

  async collect(source: Source): Promise<CollectorResult> {
    const targetUrl = source.careersUrl ?? source.baseUrl;
    const { response, body } = await fetchPublicText(targetUrl);
    if (!response.ok) {
      return {
        listings: [],
        pagesRequested: 1,
        httpStatus: response.status,
        metadata: { collector: this.name, jobPostingNodes: 0 },
      };
    }

    const listings = extractJobPostingNodes(body).map((node) => jobPostingToRaw(source, node, response.url));

    return {
      listings,
      pagesRequested: 1,
      httpStatus: response.status,
      metadata: { collector: this.name, jobPostingNodes: listings.length },
    };
  }
}
