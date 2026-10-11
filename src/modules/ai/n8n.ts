import type { AiTaskType } from '@prisma/client';

import { env } from '../../config/env.js';

export const aiClient = {
  configured(): boolean {
    return Boolean(env.N8N_JOB_ANALYSIS_WEBHOOK_URL);
  },

  async generateJson<T>(input: {
    task: AiTaskType;
    userId?: string;
    profileId?: string;
    jobId?: string;
    system: string;
    payload: unknown;
    mode?: 'extract' | 'both';
    cvText?: string;
  }): Promise<T> {
    // const response = await fetch(env.N8N_JOB_ANALYSIS_WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(input.payload),
    //   signal: AbortSignal.timeout(60_000),
    // });

    console.log('=++++++++++++>>>>>>>>>>>>=comparePage input:', input);

    const response = await fetch(env.N8N_JOB_ANALYSIS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        input.mode === 'both'
          ? {
              mode: 'both',
              capture: input.payload,
              cvText: input.cvText ?? '',
            }
          : {
              mode: 'extract',
              capture: input.payload, // the CompactBrowserCapture
            },
      ),
      signal: AbortSignal.timeout(60_000),
    });
    const responseBody = await response.text();
    console.log('n8n analysis webhook response:', responseBody);
    if (!response.ok) {
      throw new Error(
        `n8n analysis webhook failed (${response.status} ${response.statusText}): ${responseBody}`,
      );
    }

    try {
      return JSON.parse(responseBody) as T;
    } catch (error) {
      throw new Error('n8n analysis webhook returned invalid JSON.', { cause: error });
    }
  },
};
