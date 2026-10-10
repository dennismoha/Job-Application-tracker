import { beforeEach, describe, expect, it, vi } from 'vitest';

const webhookUrl = 'https://job-intel.app.n8n.cloud/webhook-test/job-extract';
const fetchMock = vi.fn<typeof fetch>();
vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/job_test');
vi.stubEnv('N8N_JOB_ANALYSIS_WEBHOOK_URL', webhookUrl);
vi.stubGlobal('fetch', fetchMock);

const { aiClient } = await import('./n8n.js');

describe('n8n aiClient.generateJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the compact capture to the configured webhook and returns its JSON response', async () => {
    const payload = { page: { url: 'https://example.com/jobs/engineer' } };
    const result = { title: 'Platform Engineer' };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(result), { status: 200 }));

    await expect(
      aiClient.generateJson({
        task: 'BROWSER_PAGE_ANALYSIS',
        system: 'Extract the job listing.',
        payload,
      }),
    ).resolves.toEqual(result);

    const [requestedUrl, requestOptions] = fetchMock.mock.calls[0] ?? [];
    expect(requestedUrl).toBe(webhookUrl);
    expect(requestOptions).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('surfaces unsuccessful webhook responses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('workflow is not listening', {
        status: 404,
        statusText: 'Not Found',
      }),
    );

    await expect(
      aiClient.generateJson({
        task: 'BROWSER_PAGE_ANALYSIS',
        system: 'Extract the job listing.',
        payload: {},
      }),
    ).rejects.toThrow('n8n analysis webhook failed (404 Not Found): workflow is not listening');
  });

  it('surfaces malformed webhook JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('not json', { status: 200 }));

    await expect(
      aiClient.generateJson({
        task: 'BROWSER_PAGE_ANALYSIS',
        system: 'Extract the job listing.',
        payload: {},
      }),
    ).rejects.toThrow('n8n analysis webhook returned invalid JSON.');
  });
});
