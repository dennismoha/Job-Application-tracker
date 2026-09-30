import { prisma } from '../src/shared/prisma/prisma-client.js';
import { normalizeHostname, normalizeJobUrl } from '../src/shared/urls/url-integrity.js';

async function main() {
  let sourceUpdated = 0;
  let listingUpdated = 0;
  let conflicts = 0;

  const sources = await prisma.source.findMany({ orderBy: { createdAt: 'asc' } });
  for (const source of sources) {
    if (source.normalizedDomain) continue;
    const domain = normalizeHostname(source.baseUrl);
    if (!domain) continue;
    const existing = await prisma.source.findFirst({ where: { normalizedDomain: domain, id: { not: source.id } }, select: { id: true, name: true } });
    if (existing) { conflicts += 1; console.warn(`Source domain conflict: ${source.name} and ${existing.name} -> ${domain}`); continue; }
    await prisma.source.update({ where: { id: source.id }, data: { normalizedDomain: domain } });
    sourceUpdated += 1;
  }

  const listings = await prisma.jobListing.findMany({ where: { normalizedUrl: null }, orderBy: { createdAt: 'asc' } });
  for (const listing of listings) {
    const raw = listing.sourceUrl ?? listing.applyUrl;
    if (!raw) continue;
    let normalized: string;
    try { normalized = normalizeJobUrl(raw); } catch { continue; }
    const existing = await prisma.jobListing.findFirst({ where: { normalizedUrl: normalized, id: { not: listing.id } }, select: { id: true } });
    if (existing) { conflicts += 1; console.warn(`Listing URL conflict: ${listing.id} and ${existing.id} -> ${normalized}`); continue; }
    await prisma.jobListing.update({ where: { id: listing.id }, data: { normalizedUrl: normalized } });
    listingUpdated += 1;
  }

  console.log(JSON.stringify({ sourceUpdated, listingUpdated, conflicts }, null, 2));
}

main().finally(async () => prisma.$disconnect());
