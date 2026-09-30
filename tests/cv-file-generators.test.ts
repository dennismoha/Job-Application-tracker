import { describe, expect, it } from 'vitest';

import { createSimpleDocx, createSimplePdf } from '../src/modules/cvs/cv-file.service.js';

describe('CV document exports', () => {
  const sample = 'JANE EXAMPLE\nMathematics Teacher\n\nPROFILE\nExperienced Mathematics teacher.';

  it('creates a PDF file signature', () => {
    const pdf = createSimplePdf(sample);
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(500);
  });

  it('creates a DOCX/ZIP file signature', () => {
    const docx = createSimpleDocx(sample);
    expect(docx.subarray(0, 2).toString('latin1')).toBe('PK');
    expect(docx.includes(Buffer.from('word/document.xml'))).toBe(true);
  });
});
