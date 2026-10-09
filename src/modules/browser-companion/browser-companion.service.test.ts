import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getVersion, configured, generateJson, resolveByUrl } = vi.hoisted(() => ({
  getVersion: vi.fn(),
  configured: vi.fn(() => false),
  generateJson: vi.fn(),
  resolveByUrl: vi.fn(),
}));

vi.mock('../cvs/cv.service.js', () => ({
  cvService: { getVersion },
}));

vi.mock('../ai/ai-client.js', () => ({
  aiClient: { configured, generateJson },
}));

vi.mock('../sources/source.service.js', () => ({
  sourceService: { resolveByUrl },
}));

vi.stubEnv('DATABASE_URL', 'postgresql://user:password@localhost:5432/job_test');
const { browserCompanionService } = await import('./browser-companion.service.js');

function compactCapture(text: string, jobPostingStructuredData: unknown[] = []) {
  return {
    schemaVersion: 2 as const,
    purpose: 'GPT-ready job-page diagnostic input',
    page: {
      url: 'https://example.com/jobs/engineer',
      title: 'Platform Engineer',
      hostname: 'example.com',
      pathname: '/jobs/engineer',
    },
    selectedJobCandidate: text
      ? {
          score: 90,
          heading: 'Platform Engineer',
          tag: 'article',
          role: null,
          selector: 'main > article',
          matchedSignals: ['requirements'],
          text,
        }
      : null,
    alternativeCandidates: [],
    headings: [],
    jobPostingStructuredData,
    pageSignals: {
      bodyTextLength: text.length,
      candidateCount: text ? 1 : 0,
      structuredDataBlockCount: jobPostingStructuredData.length,
    },
    stats: {
      gptInputCharacters: 300,
      selectedCandidateCharacters: text.length,
    },
  };
}

describe('browserCompanionService.comparePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configured.mockReturnValue(false);
    resolveByUrl.mockResolvedValue({
      source: { id: 'source-1', name: 'Example', sourceType: 'COMPANY_CAREERS' },
      matched: true,
    });
    getVersion.mockResolvedValue({
      id: 'cv-version-1',
      versionNumber: 1,
      plainText: 'TypeScript cloud infrastructure experience',
      cv: { id: 'cv-1', name: 'Engineering CV' },
    });
  });

  it('uses the selected CV version with extracted job requirements', async () => {
    const result = await browserCompanionService.comparePage('user-1', {
      capture: compactCapture(
        'Platform Engineer\nRequirements\nRequired: TypeScript, cloud infrastructure, and production experience.',
      ),
      cvVersionId: 'cv-version-1',
    });

    expect(getVersion).toHaveBeenCalledWith('user-1', 'cv-version-1');
    expect(result.match?.cv.versionId).toBe('cv-version-1');
    expect(result.match?.items[0]?.requirementText).toContain('cloud infrastructure');
  });

  it('does not compare a structured job title without job content', async () => {
    const result = await browserCompanionService.comparePage('user-1', {
      capture: compactCapture('', [{ '@type': 'JobPosting', title: 'Platform Engineer' }]),
      cvVersionId: 'cv-version-1',
    });

    expect(result.isJob).toBe(false);
    expect(result.match).toBeNull();
    expect(getVersion).not.toHaveBeenCalled();
  });
});

describe('browserCompanionService.analyzePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configured.mockReturnValue(true);
    resolveByUrl.mockResolvedValue({
      source: { id: 'source-1', name: 'Example', sourceType: 'COMPANY_CAREERS' },
      matched: true,
    });
    generateJson.mockResolvedValue({
      pageType: 'JOB_DETAIL',
      title: 'Platform Engineer',
      company: 'Example Ltd',
      location: 'London',
      remote: false,
      workMode: 'Hybrid',
      employmentType: 'FULL_TIME',
      salaryRaw: '£70,000–£85,000',
      responsibilities: ['Build reliable platform services.'],
      qualifications: ['Experience with TypeScript and cloud infrastructure.'],
      skills: ['TypeScript'],
      education: [],
      benefits: [],
      description: 'Join the platform team to build scalable services.',
      extractionNotes: [],
    });
  });

  it('sends the compact capture to AI and returns the extracted job with source resolution', async () => {
    const capture = {
      schemaVersion: 2 as const,
      purpose: 'GPT-ready job-page diagnostic input',
      page: {
        url: 'https://example.com/jobs/platform-engineer',
        title: 'Platform Engineer',
        hostname: 'example.com',
        pathname: '/jobs/platform-engineer',
      },
      selectedJobCandidate: {
        score: 90,
        heading: 'Platform Engineer',
        tag: 'article',
        role: null,
        selector: 'main > article',
        matchedSignals: ['requirements'],
        text: 'Platform Engineer\nRequirements\nExperience with TypeScript and cloud infrastructure.',
      },
      alternativeCandidates: [],
      headings: [],
      jobPostingStructuredData: [],
      pageSignals: {
        bodyTextLength: 150,
        candidateCount: 1,
        structuredDataBlockCount: 0,
      },
      stats: {
        gptInputCharacters: 300,
        selectedCandidateCharacters: 100,
      },
    };

    const result = await browserCompanionService.analyzePage('user-1', capture);

    expect(generateJson).toHaveBeenCalledWith(
      expect.objectContaining({
        task: 'BROWSER_PAGE_ANALYSIS',
        userId: 'user-1',
        payload: capture,
      }),
    );
    expect(resolveByUrl).toHaveBeenCalledWith(capture.page.url);
    expect(result.isJob).toBe(true);
    expect(result.extracted?.description).toContain('Requirements');
    expect(result.detectedSource).toEqual({
      id: 'source-1',
      name: 'Example',
      sourceType: 'COMPANY_CAREERS',
    });
  });

  it('normalizes null optional fields in a valid Gemini extraction result', async () => {
    generateJson.mockResolvedValue({
      pageType: 'JOB_DETAIL',
      title: 'Platform Engineer',
      company: null,
      location: null,
      remote: null,
      workMode: null,
      employmentType: null,
      salaryRaw: null,
      postedDate: null,
      applicationMethod: null,
      responsibilities: 'Work with engineering teams to deliver reliable platform capabilities.',
      qualifications: [
        'Build reliable services and collaborate closely with product teams to deliver scalable customer-facing platform features.',
      ],
      skills: null,
      education: null,
      benefits: null,
      description: null,
      extractionNotes: 'Some optional details were not present in the captured page.',
    });

    const capture = compactCapture(
      'Platform Engineer\nQualifications\nBuild reliable services and collaborate closely with product teams to deliver scalable customer-facing platform features.',
    );
    const result = await browserCompanionService.analyzePage('user-1', capture);

    expect(result.isJob).toBe(true);
    expect(result.extracted?.company).toBeNull();
    expect(result.extracted?.description).toContain('Requirements');
    expect(result.extractionNotes).toEqual([
      'Some optional details were not present in the captured page.',
    ]);
  });
});
