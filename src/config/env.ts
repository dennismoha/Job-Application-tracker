import 'dotenv/config';

import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  SCHEDULER_ENABLED: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  SCHEDULER_TICK_MS: z.coerce.number().int().min(1000).default(60000),
  WORKER_TICK_MS: z.coerce.number().int().min(500).default(2000),
  WORKER_ID: z.string().min(1).default('local-worker'),
  RUN_STALE_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  N8N_INGESTION_SECRET: z.string().min(16).optional(),
  WEB_SEARCH_API_KEY: z.string().min(1).optional(),
  WEB_SEARCH_ENDPOINT: z.string().url().default('https://google.serper.dev/search'),
  // N8N_JOB_ANALYSIS_WEBHOOK_URL: z
  //   .string()
  //   .url()
  //   .default('https://job-intel.app.n8n.cloud/webhook-test/job-extract'),

  N8N_JOB_ANALYSIS_WEBHOOK_URL: z
    .string()
    .url()
    .default('https://job-intel.app.n8n.cloud/webhook/job-extract'),
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).default('gemini-2.5-flash'),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_MODEL: z.string().min(1).default('google/gemini-2.5-flash'),
  OPENROUTER_MODELS: z.string().optional(),
  OPENROUTER_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  OPENROUTER_SITE_URL: z.string().url().default('http://localhost:4000'),
  OPENROUTER_APP_NAME: z.string().min(1).default('Job Intelligence Platform'),
  AI_DEDUP_ENABLED: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  API_RATE_LIMIT_MAX: z.coerce.number().int().min(10).default(240),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
});

export const env = environmentSchema.parse(process.env);
