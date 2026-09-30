import type { Source } from '@prisma/client';

import { prisma } from '../../../shared/prisma/prisma-client.js';
import type { JobSourceCollector } from './collector.types.js';
import { GreenhouseCollector } from './greenhouse.collector.js';
import { JsonLdCollector } from './json-ld.collector.js';
import { LeverCollector } from './lever.collector.js';
import { RssCollector } from './rss.collector.js';
import { StaticHtmlCollector } from './static-html.collector.js';

const greenhouse = new GreenhouseCollector();
const lever = new LeverCollector();
const rss = new RssCollector();
const jsonLd = new JsonLdCollector();
const staticHtml = new StaticHtmlCollector();

export async function resolveCollector(source: Source): Promise<JobSourceCollector> {
  const audit = await prisma.sourceAudit.findFirst({
    where: { sourceId: source.id },
    orderBy: { auditedAt: 'desc' },
  });

  if (greenhouse.supports(source, audit?.atsProvider)) return greenhouse;
  if (lever.supports(source, audit?.atsProvider)) return lever;
  if (audit?.hasRss) return rss;
  if (audit?.hasJobPosting || audit?.hasJsonLd) return jsonLd;

  return staticHtml;
}
