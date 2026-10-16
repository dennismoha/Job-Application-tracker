import type { IngestionSummary, SearchResponse } from './interface';

/** Converts enum-like values such as `EMAIL_ALERT` into display text. */
export function human(value: string): string {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Returns a count only for the summary-shaped ingestion response. */
export function ingestionValue(
  response: SearchResponse | null,
  key: keyof IngestionSummary,
): number {
  if (!response || Array.isArray(response.ingestion)) return 0;
  return response.ingestion[key] ?? 0;
}

/** Reduces a result URL to its origin for the source-tracking handoff. */
export function sourceRoot(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return value;
  }
}
