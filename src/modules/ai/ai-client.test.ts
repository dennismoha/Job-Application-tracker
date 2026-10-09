import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiTaskType } from '@prisma/client';

type GeminiTestRequest = {
  model: string;
  contents: string;
  config?: {
    systemInstruction?: string;
    temperature?: number;
    responseMimeType?: string;
  };
};

type GeminiTestResponse = {
  text?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  modelVersion?: string;
};

const { generateContent, createUsage } = vi.hoisted(() => ({
  generateContent: vi.fn<(request: GeminiTestRequest) => Promise<GeminiTestResponse>>(),
  createUsage: vi.fn<(input: { data: Record<string, unknown> }) => Promise<unknown>>(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: { generateContent },
  })),
}));

vi.mock('../../shared/prisma/prisma-client.js', () => ({
  prisma: { aiUsage: { create: createUsage } },
}));

vi.stubEnv('DATABASE_URL', 'postgresql://user:password@localhost:5432/job_test');
vi.stubEnv('AI_API_KEY', 'gemini-test-key');
const { aiClient } = await import('./ai-client.js');

describe('aiClient.generateJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createUsage.mockResolvedValue({});
  });

  it('calls Gemini in JSON mode and records Gemini usage metadata', async () => {
    generateContent.mockResolvedValue({
      text: '{"isJob":true}',
      usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 24 },
      modelVersion: 'gemini-test',
    });

    const result = await aiClient.generateJson<{ isJob: boolean }>({
      task: AiTaskType.BROWSER_PAGE_ANALYSIS,
      userId: 'user-1',
      system: 'Extract a job listing.',
      payload: { title: 'Platform Engineer' },
    });

    const request = generateContent.mock.calls[0]?.[0];
    expect(request?.contents).toBe('{"title":"Platform Engineer"}');
    expect(request?.config?.systemInstruction).toBe('Extract a job listing.');
    expect(request?.config?.temperature).toBe(0);
    expect(request?.config?.responseMimeType).toBe('application/json');
    expect(result).toEqual({ isJob: true });
    const usage = createUsage.mock.calls[0]?.[0]?.data;
    expect(usage?.provider).toBe('gemini');
    expect(usage?.inputTokens).toBe(120);
    expect(usage?.outputTokens).toBe(24);
    expect(usage?.metadata).toEqual({
      endpoint: 'Gemini generateContent',
      modelVersion: 'gemini-test',
    });
  });

  it('fails explicitly when Gemini returns no text', async () => {
    generateContent.mockResolvedValue({ usageMetadata: {} });

    await expect(
      aiClient.generateJson({
        task: AiTaskType.BROWSER_PAGE_ANALYSIS,
        system: 'Extract a job listing.',
        payload: {},
      }),
    ).rejects.toThrow('AI provider returned no text output.');
    expect(createUsage).not.toHaveBeenCalled();
  });
});
