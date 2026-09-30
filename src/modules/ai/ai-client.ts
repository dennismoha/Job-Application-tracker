import { AiTaskType, type Prisma } from '@prisma/client';

import { env } from '../../config/env.js';
import { prisma } from '../../shared/prisma/prisma-client.js';

interface ResponsesApiPayload {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  output_text?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

function extractText(payload: ResponsesApiPayload): string {
  if (payload.output_text?.trim()) return payload.output_text.trim();
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === 'output_text' && content.text)
    .map((content) => content.text ?? '')
    .join('\n')
    .trim();
}

function parseJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const value = fenced ?? text;
  const start = Math.min(...['{', '['].map((token) => value.indexOf(token)).filter((index) => index >= 0));
  if (!Number.isFinite(start)) throw new Error('AI response did not contain JSON.');
  return JSON.parse(value.slice(start)) as T;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

export const aiClient = {
  configured(): boolean {
    return Boolean(env.AI_API_KEY);
  },

  async generateJson<T>(input: {
    task: AiTaskType;
    userId?: string;
    profileId?: string;
    jobId?: string;
    system: string;
    payload: unknown;
  }): Promise<T> {
    if (!env.AI_API_KEY) throw new Error('AI_API_KEY is not configured.');

    const response = await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/responses`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.AI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        input: [
          { role: 'system', content: input.system },
          { role: 'user', content: JSON.stringify(input.payload) },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`AI provider returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}.`);
    }

    const payload = (await response.json()) as ResponsesApiPayload;
    const text = extractText(payload);
    if (!text) throw new Error('AI provider returned no text output.');

    await prisma.aiUsage.create({
      data: {
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.profileId ? { profileId: input.profileId } : {}),
        ...(input.jobId ? { jobId: input.jobId } : {}),
        task: input.task,
        provider: env.AI_PROVIDER,
        model: env.AI_MODEL,
        ...(payload.usage?.input_tokens !== undefined ? { inputTokens: payload.usage.input_tokens } : {}),
        ...(payload.usage?.output_tokens !== undefined ? { outputTokens: payload.usage.output_tokens } : {}),
        metadata: jsonValue({ endpoint: `${env.AI_BASE_URL.replace(/\/$/, '')}/responses` }),
      },
    });

    return parseJson<T>(text);
  },
};
