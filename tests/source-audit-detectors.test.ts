import { describe, expect, it } from 'vitest';

import {
  detectAts,
  detectPageSignals,
  detectStructuredData,
} from '../src/modules/sources/source-audit.detectors.js';

describe('source audit detectors', () => {
  it('detects a known ATS and JobPosting JSON-LD', () => {
    const html = `
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"JobPosting","title":"Math Teacher"}
      </script>
      <a href="https://jobs.lever.co/example/123/apply">Apply</a>
    `;

    expect(detectAts('https://jobs.lever.co/example', html).provider).toBe('Lever');
    expect(detectStructuredData(html)).toMatchObject({ hasJsonLd: true, hasJobPosting: true });
    expect(detectPageSignals(html).applicationLinkSignal).toBe(true);
  });

  it('detects challenge pages without treating them as normal job content', () => {
    const signals = detectPageSignals('<html><body>Verify you are human CAPTCHA</body></html>');

    expect(signals.challengeSignal).toBe(true);
  });
});
