import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';

import {
  createCvPdfFromTemplate,
  createSimplePdf,
  extractCvPreviewSections,
} from './cv-file.service.js';

describe('CV PDF layout', () => {
  it('keeps text before the first recognized section heading', () => {
    const sections = extractCvPreviewSections([
      'JANE DOE',
      'Platform Engineer',
      'A short profile before any section heading.',
      'EXPERIENCE',
      'Built and maintained cloud services.',
    ].join('\n'));

    expect(sections).toContainEqual({
      heading: 'PROFILE',
      lines: ['A short profile before any section heading.'],
    });
    expect(sections).toContainEqual({
      heading: 'EXPERIENCE',
      lines: ['Built and maintained cloud services.'],
    });
  });

  it('does not treat a leading section heading or its first line as a name and role', () => {
    const sections = extractCvPreviewSections([
      'SUMMARY',
      'Designed reliable distributed systems.',
      'EXPERIENCE',
      'Built cloud services.',
    ].join('\n'));

    expect(sections).toContainEqual({
      heading: 'SUMMARY',
      lines: ['Designed reliable distributed systems.'],
    });
  });

  it('continues an oversized section onto another PDF page without dropping its last line', async () => {
    const finalLine = 'FINAL-CV-LINE-THAT-MUST-REMAIN-IN-THE-PDF';
    const text = [
      'JANE DOE',
      'Platform Engineer',
      'EXPERIENCE',
      ...Array.from({ length: 140 }, (_, index) =>
        `Delivered reliable platform capability ${index + 1} across production systems.`,
      ),
      finalLine,
    ].join('\n');

    const pdf = createSimplePdf(text);
    const document = await PDFDocument.load(pdf);
    const serialized = pdf.toString('latin1');

    expect(document.getPageCount()).toBeGreaterThan(1);
    expect(serialized).toContain(finalLine);
  });

  it('continues long sidebar content in both PDF layouts', async () => {
    const finalLine = 'FINAL-SIDEBAR-SKILL-THAT-MUST-REMAIN';
    const text = [
      'JANE DOE',
      'Platform Engineer',
      'CORE SKILLS',
      ...Array.from({ length: 100 }, (_, index) => `Platform capability ${index + 1}`),
      finalLine,
    ].join('\n');
    const simplePdf = createSimplePdf(text);
    const simpleDocument = await PDFDocument.load(simplePdf);
    const template = await PDFDocument.create();
    template.addPage([595, 842]);
    const templatePdf = await createCvPdfFromTemplate(text, Buffer.from(await template.save()));
    const templateDocument = await PDFDocument.load(templatePdf);

    expect(simpleDocument.getPageCount()).toBeGreaterThan(1);
    expect(simplePdf.toString('latin1')).toContain(finalLine);
    expect(templateDocument.getPageCount()).toBeGreaterThan(1);
  });
});
