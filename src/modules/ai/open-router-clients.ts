import type { AiTaskType, Prisma } from '@prisma/client';

import { env } from '../../config/env.js';
import { prisma } from '../../shared/prisma/prisma-client.js';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

type OpenRouterResponse = {
    choices?: Array<{ message?: { content?: string | null } }>;
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string; code?: number | string };
};

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

function configuredModels(): string[] {
    const modelList = env.OPENROUTER_MODELS
        ? env.OPENROUTER_MODELS.split(',').map((model) => model.trim()).filter(Boolean)
        : [env.OPENROUTER_MODEL];
    return [...new Set(modelList)];
}

function isRetryable(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status);
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const aiClient = {
    configured(): boolean {
        return Boolean(env.OPENROUTER_API_KEY);
    },

    async generateJson<T>(input: {
        task: AiTaskType;
        userId?: string;
        profileId?: string;
        jobId?: string;
        system: string;
        payload: unknown;
    }): Promise<T> {
        if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured.');

        const models = configuredModels();
        let lastError: unknown;
        let result: T | undefined;
        let successfulModel: string | undefined;
        let inputTokens: number | undefined;
        let outputTokens: number | undefined;
        let responseModel: string | undefined;

        for (const model of models) {
            for (let attempt = 1; attempt <= env.OPENROUTER_MAX_RETRIES + 1; attempt += 1) {
                try {
                    console.info(`[AI] OpenRouter task "${input.task}", model "${model}", attempt ${attempt}/${env.OPENROUTER_MAX_RETRIES + 1}.`);
                    const response = await fetch(OPENROUTER_ENDPOINT, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': env.OPENROUTER_SITE_URL,
                            'X-Title': env.OPENROUTER_APP_NAME,
                        },
                        body: JSON.stringify({
                            model,
                            messages: [
                                { role: 'system', content: input.system },
                                { role: 'user', content: JSON.stringify(input.payload) },
                            ],
                            temperature: 0,
                            response_format: { type: 'json_object' },
                        }),
                        signal: AbortSignal.timeout(120_000),
                    });

                    const body = await response.json() as OpenRouterResponse;
                    if (!response.ok) {
                        const message = body.error?.message ?? `OpenRouter request failed (${response.status}).`;
                        const error = Object.assign(new Error(message), { status: response.status });
                        if (!isRetryable(response.status) || attempt > env.OPENROUTER_MAX_RETRIES) throw error;
                        lastError = error;
                        await sleep(Math.min(30_000, 1_000 * 2 ** (attempt - 1)));
                        continue;
                    }

                    const text = body.choices?.[0]?.message?.content?.trim();
                    if (!text) throw new Error('AI provider returned no text output.');
                    result = parseJson<T>(text);
                    successfulModel = model;
                    responseModel = body.model;
                    inputTokens = body.usage?.prompt_tokens;
                    outputTokens = body.usage?.completion_tokens;
                    break;
                } catch (error) {
                    lastError = error;
                    const status = typeof (error as { status?: unknown })?.status === 'number'
                        ? (error as { status: number }).status
                        : 0;
                    console.error(`[AI] OpenRouter model "${model}" failed: ${errorMessage(error)}`);
                    if (attempt > env.OPENROUTER_MAX_RETRIES || !isRetryable(status)) break;
                    await sleep(Math.min(30_000, 1_000 * 2 ** (attempt - 1)));
                }
            }
            if (successfulModel) break;
        }

        if (!successfulModel) {
            throw new Error(`OpenRouter generation failed for configured models (${models.join(', ')}). Last error: ${errorMessage(lastError)}`, { cause: lastError });
        }

        try {
            await prisma.aiUsage.create({
                data: {
                    ...(input.userId ? { userId: input.userId } : {}),
                    ...(input.profileId ? { profileId: input.profileId } : {}),
                    ...(input.jobId ? { jobId: input.jobId } : {}),
                    task: input.task,
                    provider: 'openrouter',
                    model: successfulModel,
                    ...(inputTokens !== undefined ? { inputTokens } : {}),
                    ...(outputTokens !== undefined ? { outputTokens } : {}),
                    metadata: jsonValue({ endpoint: OPENROUTER_ENDPOINT, ...(responseModel ? { responseModel } : {}) }),
                },
            });
        } catch (error) {
            console.error(`[AI] Generation succeeded with OpenRouter model "${successfulModel}", but usage logging failed:`, error);
        }

        return result as T;
    },
};
