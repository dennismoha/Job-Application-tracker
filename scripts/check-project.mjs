import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'eslint.config.mjs',
  '.prettierrc.json',
  '.env.example',
  '.env.production.example',
  'docker-compose.yml',
  'prisma/schema.prisma',
  'src/app.ts',
  'src/server.ts',
  'src/modules/auth/auth.routes.ts',
  'src/modules/profiles/profile.routes.ts',
  'src/modules/sources/source.routes.ts',
  'src/modules/scheduler/scheduler.routes.ts',
  'src/modules/acquisition/collectors/source-collector.executor.ts',
  'src/modules/ingestion/ingestion.service.ts',
  'src/modules/jobs/job.routes.ts',
  'src/modules/email-ingestion/email-ingestion.routes.ts',
  'src/modules/search/search.routes.ts',
  'src/modules/source-batches/source-batch.routes.ts',
  'src/modules/applications/application.routes.ts',
  'src/modules/risk/risk.routes.ts',
  'src/modules/reports/report.routes.ts',
  'src/modules/ai/ai.routes.ts',
  'src/modules/browser-companion/browser-companion.routes.ts',
  'src/modules/cvs/cv.routes.ts',
  'src/worker.ts',
  'docs/milestones/milestone-01/README.md',
  'docs/milestones/milestone-02/README.md',
  'docs/milestones/milestone-03/README.md',
  'docs/milestones/milestone-04/README.md',
  'docs/milestones/milestone-05/README.md',
  'docs/milestones/milestone-06/README.md',
  'docs/milestones/milestone-07/README.md',
  'docs/milestones/milestone-08/README.md',
  'docs/milestones/milestone-09/README.md',
  'docs/milestones/milestone-10/README.md',
  'docs/milestones/milestone-11/README.md',
  'docs/milestones/milestone-12/README.md',
  'docs/milestones/milestone-13/README.md',
  'docs/milestones/milestone-14/README.md',
  'docs/milestones/milestone-15/README.md',
  'docs/milestones/milestone-16/README.md',
  'docs/milestones/milestone-17/README.md',
  'docs/flows/milestone-01-foundation.mmd',
  'docs/flows/milestone-02-users-profiles.mmd',
  'docs/flows/milestone-03-source-registry.mmd',
  'docs/flows/milestone-04-scheduler.mmd',
  'docs/flows/milestone-05-collectors.mmd',
  'docs/flows/milestone-06-ingestion.mmd',
  'docs/flows/milestone-07-deduplication.mmd',
  'docs/flows/milestone-08-job-dashboard.mmd',
  'docs/flows/milestone-09-hybrid-acquisition.mmd',
  'docs/flows/milestone-10-application-tracker.mmd',
  'docs/flows/milestone-11-trust-risk.mmd',
  'docs/flows/milestone-12-reporting.mmd',
  'docs/flows/milestone-13-ai-intelligence.mmd',
  'docs/flows/milestone-14-production.mmd',
  'docs/flows/milestone-15-browser-companion.mmd',
  'docs/flows/milestone-16-hybrid-ui.mmd',
  'docs/flows/milestone-17-cv-intelligence.mmd',
  'docs/api-v1.md',
  'docs/deployment.md',
  'docs/operations.md',
  'docs/security.md',
  'docs/validation-v1.0.md',
  'prisma/migrations/README.md',
  'Dockerfile',
  'docker-compose.production.yml',
  'n8n/README.md',
  'docs/viewer/index.html',
  'web/package.json',
  'web/src/App.tsx',
];

for (const file of requiredFiles) {
  const path = resolve(file);
  const fileStat = await stat(path);

  if (!fileStat.isFile()) {
    throw new Error(`${file} is not a file.`);
  }
}

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const expectedScripts = [
  'dev',
  'build',
  'lint',
  'format:check',
  'test',
  'docs:dev',
  'research:import-sources',
];

for (const script of expectedScripts) {
  if (!packageJson.scripts?.[script]) {
    throw new Error(`Missing npm script: ${script}`);
  }
}

const schema = await readFile('prisma/schema.prisma', 'utf8');
const requiredModels = [
  'User',
  'UserSession',
  'SearchProfile',
  'Source',
  'SourceAudit',
  'SourceSchedule',
  'SourceSubscription',
  'SourceHealth',
  'AcquisitionRun',
  'JobIngestion',
  'Job',
  'JobListing',
  'JobListingRevision',
  'JobListingMatch',
  'Application',
  'RiskReport',
  'SourceBatch',
  'SourceBatchItem',
  'AiUsage',
  'Cv',
  'CvVersion',
  'CvProfileLink',
  'JobRequirement',
  'JobCvMatch',
  'JobCvMatchItem',
  'CvTailoringSession',
  'CvTailoringSuggestion',
];

for (const model of requiredModels) {
  if (!schema.includes(`model ${model} {`)) {
    throw new Error(`Missing Prisma model: ${model}`);
  }
}

const sourceRegistry = await readFile('research/source-audit/sources.csv', 'utf8');
const sourceRows = sourceRegistry.trim().split(/\r?\n/).length - 1;

if (sourceRows < 40) {
  throw new Error(`Expected at least 40 research sources, found ${sourceRows}.`);
}

console.log(`Project structure check passed with ${sourceRows} research sources.`);
