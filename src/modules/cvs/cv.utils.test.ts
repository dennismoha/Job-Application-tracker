import { describe, expect, it } from 'vitest';

import {
  cleanJobDescription,
  compareRequirementToCv,
  extractJobComparisonContent,
} from './cv.utils.js';

const responsibilities = [
  'Design and build reliable services used by customers.',
  'Collaborate with product and engineering teams to deliver improvements.',
].join('\n');
const requirements = [
  'Required: 5+ years of software engineering experience.',
  'Strong experience with TypeScript and cloud infrastructure.',
].join('\n');

describe('extractJobComparisonContent', () => {
  it('retains job title and labeled job sections', () => {
    const result = extractJobComparisonContent({
      pageTitle: 'Senior Software Engineer | Example',
      pageText: `Senior Software Engineer\nCompany\nExample Ltd\nJob Description\nBuild customer-focused software.\nResponsibilities\n${responsibilities}\nRequirements\n${requirements}`,
    });

    expect(result.hasJobContent).toBe(true);
    expect(result.description).toContain('Job Title\nSenior Software Engineer');
    expect(result.description).toContain(`Responsibilities\n${responsibilities}`);
    expect(result.description).toContain(`Requirements\n${requirements}`);
  });

  it('prioritizes job sections after company information', () => {
    const result = extractJobComparisonContent({
      pageTitle: 'Senior Software Engineer',
      pageText: `About Company\nCompany Mission\nWe are transforming the future of work.\nOur Mission\nOur ambition is to redefine the industry.\nJob Title\nSenior Software Engineer\nJob Description\nBuild services used by customers.\nRequirements\n${requirements}`,
    });

    expect(result.description).toContain('Build services used by customers.');
    expect(result.description).toContain('Required: 5+ years');
    expect(result.description).not.toContain('transforming the future');
    expect(result.description).not.toContain('redefine the industry');
  });

  it('does not let company information after job content replace the listing', () => {
    const result = extractJobComparisonContent({
      pageTitle: 'Senior Software Engineer',
      pageText: `Senior Software Engineer\nJob Description\nBuild software for customers.\nResponsibilities\n${responsibilities}\nRequirements\n${requirements}\nAbout Us\nWe are a fast-growing company redefining home.`,
    });

    expect(result.description).toContain('Build software for customers.');
    expect(result.description).toContain('Strong experience with TypeScript');
    expect(result.description).not.toContain('fast-growing company');
  });

  it('prefers and extracts JobPosting structured fields', () => {
    const result = extractJobComparisonContent({
      pageTitle: 'Careers | Example',
      pageText: 'Unrelated company page content',
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: 'Platform Engineer',
          description:
            '<p>Build and operate cloud services for customers around the world. Collaborate closely with product, engineering, and security teams to deliver reliable, scalable, and well-documented platform capabilities.</p>',
          hiringOrganization: { '@type': 'Organization', name: 'Example Ltd' },
          jobLocation: [{ address: { addressLocality: 'London', addressCountry: 'UK' } }],
          employmentType: 'FULL_TIME',
          jobLocationType: 'TELECOMMUTE',
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'USD',
            value: {
              '@type': 'QuantitativeValue',
              minValue: 100000,
              maxValue: 120000,
              unitText: 'YEAR',
            },
          },
          qualifications: 'Experience with distributed systems',
          responsibilities: 'Operate reliable cloud infrastructure',
        },
      ],
    });

    expect(result.title).toBe('Platform Engineer');
    expect(result.company).toBe('Example Ltd');
    expect(result.location).toBe('London, UK');
    expect(result.employmentType).toBe('FULL_TIME');
    expect(result.workMode).toBe('TELECOMMUTE');
    expect(result.salary).toBe('USD 100000–120000 YEAR');
    expect(result.description).toContain('Operate reliable cloud infrastructure');
    expect(result.description).toContain('Experience with distributed systems');
    expect(result.description).toContain('Build and operate cloud services');
    expect(result.confidence).toBe('HIGH');
  });

  it('decodes common HTML entities and removes markup', () => {
    expect(cleanJobDescription('<p>Our market&apos;s growing &amp; changing</p>')).toBe(
      "Our market's growing & changing",
    );
  });

  it('marks a short captured job section as uncertain rather than complete', () => {
    const result = extractJobComparisonContent({
      pageTitle: 'Software Engineer',
      pageText: 'Software Engineer\nRequirements\nSome experience required.',
    });

    expect(result.hasJobContent).toBe(true);
    expect(result.confidence).toBe('LOW');
    expect(result.description).toContain('Some experience required.');
  });

  it('does not manufacture job requirements from a company page', () => {
    const result = extractJobComparisonContent({
      pageTitle: 'About Venn',
      pageText:
        'Venn is a fast-growing technology company transforming the relationship between renters and multifamily operators.\nOur ambition is to redefine the experience of home.',
    });

    expect(result.hasJobContent).toBe(false);
    expect(result.description).toBe('Job Title\nAbout Venn');
  });

  it('does not treat a title alone as job content', () => {
    const result = extractJobComparisonContent({
      pageTitle: 'Senior Software Engineer',
      pageText: 'Senior Software Engineer',
    });

    expect(result.hasJobContent).toBe(false);
    expect(result.confidence).toBe('LOW');
  });

  it('preserves the existing CV requirement comparison utility', () => {
    expect(
      compareRequirementToCv('TypeScript cloud infrastructure', 'TypeScript cloud infrastructure')
        .status,
    ).toBe('EVIDENCED');
  });
});
