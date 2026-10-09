import { GoogleGenAI } from '@google/genai';
import type { AiTaskType, Prisma } from '@prisma/client';

import { env } from '../../config/env.js';
import { prisma } from '../../shared/prisma/prisma-client.js';

function parseJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const value = fenced ?? text;

  const start = Math.min(
    ...['{', '[']
      .map((token) => value.indexOf(token))
      .filter((index) => index >= 0),
  );

  if (!Number.isFinite(start)) {
    throw new Error('AI response did not contain JSON.');
  }

  return JSON.parse(value.slice(start)) as T;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);

  return Number.isInteger(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

const MAX_RETRIES = boundedInteger(
  process.env.AI_MAX_RETRIES,
  3,
  0,
  5,
);

const INITIAL_BACKOFF_MS = boundedInteger(
  process.env.AI_INITIAL_BACKOFF_MS,
  1_000,
  250,
  10_000,
);

const MAX_BACKOFF_MS = 30_000;

const DEFAULT_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
];

function configuredModels(): string[] {
  const fallbackModels = process.env.AI_MODELS
    ? process.env.AI_MODELS
        .split(',')
        .map((model) => model.trim())
        .filter(Boolean)
    : DEFAULT_MODELS;

  return [
    ...new Set([env.AI_MODEL, ...fallbackModels].filter(Boolean)),
  ];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorRecord(
  error: unknown,
): Record<string, unknown> | undefined {
  return error && typeof error === 'object'
    ? (error as Record<string, unknown>)
    : undefined;
}

function numericStatus(value: unknown): number | null {
  const status =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d{3}$/.test(value)
        ? Number(value)
        : NaN;

  return Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : null;
}

function getErrorStatus(
  error: unknown,
  depth = 0,
): number | null {
  if (depth > 4) return null;

  const value = errorRecord(error);

  if (!value) return null;

  const nestedError = errorRecord(value.error);
  const response = errorRecord(value.response);

  const candidates = [
    value.status,
    value.statusCode,
    value.code,
    response?.status,
    nestedError?.status,
    nestedError?.statusCode,
    nestedError?.code,
  ];

  for (const candidate of candidates) {
    const status = numericStatus(candidate);

    if (status !== null) return status;
  }

  // Some SDK errors include the provider's JSON error in message.
  const message =
    typeof value.message === 'string' ? value.message : '';

  const messageStatus = message.match(
    /"(?:code|statusCode)"\s*:\s*(\d{3})\b/i,
  );

  if (messageStatus) {
    const status = numericStatus(messageStatus[1]);

    if (status !== null) return status;
  }

  return (
    getErrorStatus(value.cause, depth + 1) ??
    getErrorStatus(value.error, depth + 1)
  );
}

function getErrorMessage(
  error: unknown,
  depth = 0,
): string {
  if (depth > 4) return '';

  if (typeof error === 'string') return error;

  const value = errorRecord(error);

  if (!value) {
    return error instanceof Error
      ? error.message
      : 'Unknown Gemini error.';
  }

  const nestedError = errorRecord(value.error);
  const response = errorRecord(value.response);
  const responseData = errorRecord(response?.data);

  const messages = [
    value.message,
    nestedError?.message,
    responseData?.message,
  ].filter(
    (message): message is string =>
      typeof message === 'string' && message.length > 0,
  );

  const causeMessage = getErrorMessage(value.cause, depth + 1);

  if (causeMessage && !messages.includes(causeMessage)) {
    messages.push(causeMessage);
  }

  if (messages.length > 0) {
    return [...new Set(messages)].join(' | ');
  }

  return error instanceof Error
    ? error.message
    : 'Unknown Gemini error.';
}

function isRetryableError(error: unknown): boolean {
  const status = getErrorStatus(error);

  if ([408, 429, 500, 502, 503, 504].includes(status ?? 0)) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  console.log('message is ', message);

  return /\b(503|unavailable|high demand|temporarily unavailable|service unavailable|resource_exhausted|deadline_exceeded|rate.?limit|overloaded|try again later)\b/.test(
    message,
  );
}

function retryDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    MAX_BACKOFF_MS,
    INITIAL_BACKOFF_MS * 2 ** (attempt - 1),
  );

  // Jitter helps prevent simultaneous retries from repeatedly
  // hitting an overloaded provider at the same time.
  return Math.min(
    MAX_BACKOFF_MS,
    Math.round(exponentialDelay * (0.5 + Math.random())),
  );
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
    if (!env.AI_API_KEY) {
      throw new Error('AI_API_KEY is not configured.');
    }

    const ai = new GoogleGenAI({
      apiKey: env.AI_API_KEY,
    });

    const models = configuredModels();

    if (models.length === 0) {
      throw new Error(
        'No Gemini model is configured. Set AI_MODEL.',
      );
    }

    const contents = JSON.stringify(input.payload);

    let lastError: unknown;

    let successfulModel: string | undefined;

    let result: T | undefined;

    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let modelVersion: string | undefined;

    // Try each model in order.
    for (const model of models) {
      let modelSucceeded = false;

      console.log("=============================== current model is ", model);

      // MAX_RETRIES is the number of retries, not the total attempts.
      for (
        let attempt = 1;
        attempt <= MAX_RETRIES + 1;
        attempt += 1
      ) {
        try {
          console.info(
            `[AI] Task "${input.task}", model "${model}", ` +
              `attempt ${attempt}/${MAX_RETRIES + 1}.`,
          );

          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: input.system,
              temperature: 0,
              responseMimeType: 'application/json',
              abortSignal: AbortSignal.timeout(60_000),
            },
          });

          const text = response.text?.trim();

          if (!text) {
            throw new Error(
              'AI provider returned no text output.',
            );
          }

          console.log('[AIIIIIIIIIIII] Raw response text:', text);

          // Parsing is part of the attempt. Invalid JSON prevents
          // this model from being considered successful.
          const parsedResult = parseJson<T>(text);

          // Store the successful response only after parsing succeeds.
          result = parsedResult;
          successfulModel = model;

          inputTokens =
            response.usageMetadata?.promptTokenCount;

          outputTokens =
            response.usageMetadata?.candidatesTokenCount;

          modelVersion = response.modelVersion;

          modelSucceeded = true;

          break;
        } catch (error) {
          lastError = error;

          const statusCode = getErrorStatus(error);
          const message = getErrorMessage(error);

          console.error(
            `[AI] Model "${model}" failed for task "${input.task}" ` +
              `(${statusCode ?? 'unknown'}): ${message}`,
          );

          const lastAttempt =
            attempt === MAX_RETRIES + 1;

          if (!isRetryableError(error) || lastAttempt) {
            console.warn(
              `[AI] Stopping retries for model "${model}".`,
            );

            break;
          }

          const waitMs = retryDelay(attempt);

          console.warn(
            `[AI] Transient Gemini error. Retrying model ` +
              `"${model}" in ${waitMs}ms.`,
          );

          await sleep(waitMs);
        }
      }

      if (modelSucceeded) {
        break;
      }

      console.warn(
        `[AI] Model "${model}" exhausted its attempts. ` +
          'Trying the next model.',
      );
    }

    if (!successfulModel) {
      throw new Error(
        `Gemini generation failed for all configured models ` +
          `(${models.join(', ')}). Last error: ` +
          getErrorMessage(lastError),
        { cause: lastError },
      );
    }

    // Generation has succeeded. Usage logging is a separate operation.
    // A database logging failure must not trigger another Gemini request
    // or discard an otherwise successful generation result.
    try {
      await prisma.aiUsage.create({
        data: {
          ...(input.userId ? { userId: input.userId } : {}),
          ...(input.profileId ? { profileId: input.profileId } : {}),
          ...(input.jobId ? { jobId: input.jobId } : {}),
          task: input.task,
          provider: 'gemini',
          model: successfulModel,

          ...(inputTokens !== undefined
            ? { inputTokens }
            : {}),

          ...(outputTokens !== undefined
            ? { outputTokens }
            : {}),

          metadata: jsonValue({
            endpoint: 'Gemini generateContent',
            ...(modelVersion ? { modelVersion } : {}),
          }),
        },
      });
    } catch (error) {
      console.log('============> here is wehere the rror happpens ', error);
      console.error(
        `[AI] Generation succeeded with model "${successfulModel}", ` +
          'but usage logging failed:',
        error,
      );
    }

    console.info(
      `[AI] Task "${input.task}" succeeded with model ` +
        `"${successfulModel}".`,
    );

    return result as T;
  },
};