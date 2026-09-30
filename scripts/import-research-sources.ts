import 'dotenv/config';

import { readFile } from 'node:fs/promises';

import { CollectionCapability, PrismaClient, SourceHealthStatus, SourceType } from '@prisma/client';

const prisma = new PrismaClient();

interface ResearchSource {
  name: string;
  sourceType: SourceType;
  url: string;
  collectionCapability: CollectionCapability;
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === ',' && !quoted) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function sourceType(value: string): SourceType {
  if (value === 'recruiter' || value === 'recruitment_platform') {
    return SourceType.RECRUITER;
  }

  if (value === 'education_group' || value === 'school' || value === 'school_group') {
    return SourceType.COMPANY_CAREERS;
  }

  return SourceType.JOB_BOARD;
}

function collectionCapability(value: string): CollectionCapability {
  if (value.includes('CRAWLABLE')) return CollectionCapability.CRAWLABLE;
  if (value.includes('EMAIL_ONLY') || value.includes('ACCOUNT')) return CollectionCapability.EMAIL_ONLY;
  if (value.includes('SEARCH')) return CollectionCapability.SEARCH_ONLY;
  if (value.includes('MANUAL')) return CollectionCapability.MANUAL_ONLY;
  if (value.includes('RESTRICTED')) return CollectionCapability.RESTRICTED;
  return CollectionCapability.MANUAL_ONLY;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

async function loadResearchSources(): Promise<ResearchSource[]> {
  const text = await readFile('research/source-audit/sources.csv', 'utf8');
  const [, ...lines] = text.trim().split(/\r?\n/);

  return lines.map((line) => {
    const columns = splitCsvLine(line);
    return {
      name: columns[1] ?? 'Unknown Source',
      sourceType: sourceType(columns[2] ?? ''),
      url: columns[3] ?? '',
      collectionCapability: collectionCapability(columns[5] ?? ''),
    };
  });
}

async function main(): Promise<void> {
  const sources = await loadResearchSources();
  const ownerEmail = process.env.RESEARCH_SOURCE_OWNER_EMAIL?.trim().toLowerCase();
  const owner = ownerEmail
    ? await prisma.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    : null;

  if (ownerEmail && !owner) {
    throw new Error(`RESEARCH_SOURCE_OWNER_EMAIL does not match a registered user: ${ownerEmail}`);
  }

  for (const research of sources) {
    if (!research.url) continue;

    const source = await prisma.source.upsert({
      where: { slug: slugify(research.name) },
      create: {
        name: research.name,
        slug: slugify(research.name),
        sourceType: research.sourceType,
        collectionCapability: research.collectionCapability,
        baseUrl: research.url,
        careersUrl: research.url,
        ...(owner ? { createdByUserId: owner.id } : {}),
      },
      update: {
        sourceType: research.sourceType,
        collectionCapability: research.collectionCapability,
        baseUrl: research.url,
        careersUrl: research.url,
        ...(owner ? { createdByUserId: owner.id } : {}),
      },
    });

    await prisma.sourceSchedule.upsert({
      where: { sourceId: source.id },
      create: {
        sourceId: source.id,
        enabled: false,
        intervalMinutes: source.defaultIntervalMinutes,
        nextRunAt: null,
      },
      update: {},
    });

    await prisma.sourceHealth.upsert({
      where: { sourceId: source.id },
      create: { sourceId: source.id, status: SourceHealthStatus.UNKNOWN },
      update: {},
    });
  }

  console.log(`Imported ${sources.length} research sources.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
