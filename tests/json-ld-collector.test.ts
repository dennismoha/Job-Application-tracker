import { describe, expect, it } from 'vitest';

import { extractJobPostingNodes } from '../src/modules/acquisition/collectors/json-ld.collector.js';

describe('JSON-LD collector', () => {
  it('extracts JobPosting nodes while ignoring unrelated structured data', () => {
    const html = `
      <script type="application/ld+json">{"@type":"Organization","name":"Example"}</script>
      <script type="application/ld+json">{
        "@context":"https://schema.org",
        "@type":"JobPosting",
        "title":"Chemistry Teacher",
        "datePosted":"2026-09-24"
      }</script>
    `;

    const jobs = extractJobPostingNodes(html);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.title).toBe('Chemistry Teacher');
  });
});
