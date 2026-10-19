
import { BadRequestError } from '../../shared/http/http-error.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PDFDict, PDFName, PDFRawStream } from 'pdf-lib/cjs/core/index.js';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function decodeBase64(value: string): Buffer {
  const normalized = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
  const buffer = Buffer.from(normalized, 'base64');
  if (!buffer.length) throw new BadRequestError('The uploaded CV file is empty.');
  if (buffer.length > MAX_FILE_BYTES) throw new BadRequestError('CV files must be 8 MB or smaller.');
  return buffer;
}

function extension(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() ?? '';
}

export async function extractTextFromCvUpload(input: {
  fileName: string;
  mimeType?: string;
  contentBase64: string;
}): Promise<{ buffer: Buffer; text: string; mimeType: string }> {
  const buffer = decodeBase64(input.contentBase64);
  const ext = extension(input.fileName);
  const mimeType = input.mimeType || (ext === 'pdf'
    ? 'application/pdf'
    : ext === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'text/plain');

  if (mimeType.startsWith('text/') || ['txt', 'md'].includes(ext)) {
    const text = buffer.toString('utf8').trim();
    if (!text) throw new BadRequestError('No text could be read from the uploaded CV.');
    return { buffer, text, mimeType };
  }

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    try {
      const module = await import('pdf-parse');
      const parse = module.default;
      const result = await parse(buffer);
      const text = result.text?.replaceAll(String.fromCharCode(0), '').trim() ?? '';
      if (!text) throw new Error('empty text');
      return { buffer, text, mimeType: 'application/pdf' };
    } catch {
      throw new BadRequestError('The PDF could not be converted to text. Try a text-based PDF or upload the DOCX version.');
    }
  }

  if (mimeType.includes('wordprocessingml') || ext === 'docx') {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value?.trim() ?? '';
      if (!text) throw new Error('empty text');
      return { buffer, text, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    } catch {
      throw new BadRequestError('The DOCX file could not be converted to text.');
    }
  }

  throw new BadRequestError('Unsupported CV file. Upload PDF, DOCX, TXT or Markdown.');
}

function wrapText(value: string, width = 88): string[] {
  const output: string[] = [];
  for (const sourceLine of value.replace(/\r/g, '').split('\n')) {
    const line = sourceLine.trimEnd();
    if (!line) { output.push(''); continue; }
    let remaining = line;
    while (remaining.length > width) {
      let cut = remaining.lastIndexOf(' ', width);
      if (cut < width * 0.55) cut = width;
      output.push(remaining.slice(0, cut).trimEnd());
      remaining = remaining.slice(cut).trimStart();
    }
    output.push(remaining);
  }
  return output;
}

function pdfEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .split('')
    .map((character) => {
      const code = character.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)
        ? character
        : '?';
    })
    .join('');
}

const SIDEBAR_SECTIONS = new Set(['CONTACT', 'BIO DATA', 'CORE SKILLS', 'INTERESTS']);
const SECTION_HEADINGS = new Set([
  ...SIDEBAR_SECTIONS,
  'PROFILE', 'SUMMARY', 'PROFESSIONAL SUMMARY', 'TEACHING EXPERIENCE', 'WORK EXPERIENCE',
  'EXPERIENCE', 'ADDITIONAL PROFESSIONAL EXPERIENCE', 'EDUCATION', 'PROFESSIONAL STRENGTHS',
  'AWARDS & ACTIVITIES', 'AWARDS AND ACTIVITIES', 'REFEREES', 'REFERENCES', 'CERTIFICATIONS',
  'PROJECTS', 'VOLUNTEER EXPERIENCE',
]);
const SIDEBAR_FIELD_LABELS = new Set(['TEL', 'TELEPHONE', 'PHONE', 'EMAIL', 'NATIONALITY', 'LOCATION', 'AVAILABILITY']);

type CvSection = { heading: string; lines: string[] };

function isSectionHeading(line: string): boolean {
  const normalized = line.trim().replace(/:$/, '').toUpperCase();
  if (SIDEBAR_FIELD_LABELS.has(normalized)) return false;
  return SECTION_HEADINGS.has(normalized);
}

function parseCvLayout(text: string): { name: string; role: string; sidebar: CvSection[]; main: CvSection[] } {
  const lines = text.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const nameIndex = lines.findIndex(isLikelyNameForLayout);
  const name = nameIndex >= 0 ? lines[nameIndex]! : 'Professional Profile';
  const roleLine = nameIndex >= 0 ? lines[nameIndex + 1] : undefined;
  const role = roleLine && !isSectionHeading(roleLine) ? roleLine : '';
  const mainStart = nameIndex >= 0 ? nameIndex + (role ? 2 : 1) : 0;

  // PDF text extraction includes the sidebar once per source page. Keep only its first copy.
  const sidebar: CvSection[] = [];
  const seenSidebarHeadings = new Set<string>();
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index]!.replace(/:$/, '').trim();
    const normalized = heading.toUpperCase();
    if (!SIDEBAR_SECTIONS.has(normalized) || seenSidebarHeadings.has(normalized)) continue;
    seenSidebarHeadings.add(normalized);
    const section: CvSection = { heading, lines: [] };
    for (let bodyIndex = index + 1; bodyIndex < lines.length; bodyIndex += 1) {
      const bodyLine = lines[bodyIndex]!;
      if (isLikelyNameForLayout(bodyLine) || isSectionHeading(bodyLine)) break;
      section.lines.push(bodyLine);
    }
    sidebar.push(section);
  }

  const main: CvSection[] = [];
  let current: CvSection | null = null;
  let skippingSidebar = false;
  for (const line of lines.slice(mainStart)) {
    if (isSectionHeading(line)) {
      const heading = line.replace(/:$/, '').trim();
      if (SIDEBAR_SECTIONS.has(heading.toUpperCase())) {
        skippingSidebar = true;
        current = null;
        continue;
      }
      skippingSidebar = false;
      current = { heading, lines: [] };
      main.push(current);
      continue;
    }
    if (!skippingSidebar) {
      if (!current) {
        current = { heading: 'PROFILE', lines: [] };
        main.push(current);
      }
      current.lines.push(line);
    }
  }
  return { name, role, sidebar, main };
}

export function extractCvPreviewSections(text: string): Array<{ heading: string; lines: string[] }> {
  const layout = parseCvLayout(text);
  return [...layout.sidebar, ...layout.main].map((section) => ({
    heading: section.heading,
    lines: [...section.lines],
  }));
}

function isLikelyNameForLayout(line: string): boolean {
  const normalized = line.trim();
  const words = normalized.split(/\s+/);
  return words.length >= 2 && words.length <= 6 && /^[A-Z][A-Z .'-]+$/.test(normalized) &&
    !SIDEBAR_SECTIONS.has(normalized.toUpperCase()) && !SECTION_HEADINGS.has(normalized.toUpperCase());
}

function splitPdfLine(value: string, maxChars: number): string[] {
  const words = value.replace(/^[•●▪]\s*/, '').split(/\s+/).filter(Boolean);
  const output: string[] = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > maxChars) {
      output.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) output.push(line);
  return output.length ? output : [''];
}

function paginateSimpleSidebar(sections: CvSection[]): CvSection[][] {
  const pages: CvSection[][] = [[]];
  let used = 0;
  let capacity = 600;
  let pageSection: CvSection | undefined;

  for (const section of sections) {
    pageSection = undefined;
    const lines = section.lines.flatMap((sourceLine) => {
      const bullet = /^[•●▪]/.test(sourceLine);
      return splitPdfLine(sourceLine, bullet ? 29 : 31).map((line, index) =>
        `${bullet && index === 0 ? '• ' : ''}${line}`,
      );
    });
    for (const line of lines) {
      const headingCost = pageSection ? 0 : 17;
      if (used + headingCost + 11 > capacity && pages[pages.length - 1]!.length) {
        pages.push([]);
        used = 0;
        capacity = 720;
        pageSection = undefined;
      }
      if (!pageSection) {
        pageSection = { heading: section.heading, lines: [] };
        pages[pages.length - 1]!.push(pageSection);
        used += 17;
      }
      pageSection.lines.push(line);
      used += 11;
    }
    if (pageSection) used += 6;
    else {
      if (used + 23 > capacity && pages[pages.length - 1]!.length) {
        pages.push([]);
        used = 0;
        capacity = 720;
      }
      pages[pages.length - 1]!.push({ heading: section.heading, lines: [] });
      used += 23;
    }
  }
  return pages;
}

function makeTemplatePage(
  laidOut: ReturnType<typeof parseCvLayout>,
  mainSections: CvSection[],
  sidebarSections: CvSection[],
  firstPage: boolean,
): string {
  const ops = [
    'q', '0.09 0.23 0.34 rg', '48 40 140 762 re f', 'Q',
    '0.12 0.29 0.43 rg', '210 40 3 762 re f',
  ];
  let ySide = firstPage ? 788 : 790;
  let yMain = 788;
  const sideX = 62;
  const mainX = 226;
  const sidebarWidth = 112;
  const mainWidth = 330;
  const textAt = (x: number, y: number, value: string, size = 8.3, font = 'F1', color = '0.14 0.19 0.23') => {
    ops.push(`${color} rg`, 'BT', `/${font} ${size} Tf`, `${x.toFixed(1)} ${y.toFixed(1)} Td`, `(${pdfEscape(value)}) Tj`, 'ET');
  };
  const sideColor = '1 1 1';
  const writeSidebar = (section: CvSection) => {
    if (ySide < 57) return;
    ySide -= 4;
    textAt(sideX, ySide, section.heading.toUpperCase(), 9, 'F2', sideColor);
    ySide -= 13;
    for (const source of section.lines) {
      const bullet = /^[•●▪]/.test(source);
      const lines = splitPdfLine(source, bullet ? 29 : 31);
      for (let index = 0; index < lines.length; index += 1) {
        if (ySide < 52) return;
        textAt(sideX + (bullet ? 1 : 0), ySide, `${bullet && index === 0 ? '• ' : ''}${lines[index]}`, 7.1, 'F1', sideColor);
        ySide -= 9;
      }
      ySide -= 2;
    }
    ySide -= 6;
  };

  if (firstPage) {
    const initials = laidOut.name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
    ops.push('0.88 0.93 0.95 rg', '82 692 72 72 re f');
    textAt(100, 721, initials || 'CV', 21, 'F2', '0.09 0.23 0.34');
    ySide = 674;
  }
  for (const section of sidebarSections) writeSidebar(section);
  if (firstPage) {
    textAt(mainX, yMain, laidOut.name.toUpperCase(), 18, 'F2', '0.09 0.23 0.34');
    yMain -= 17;
    if (laidOut.role) {
      const roleLines = splitPdfLine(laidOut.role.toUpperCase(), 56);
      for (const line of roleLines) { textAt(mainX, yMain, line, 8.2, 'F1', '0.36 0.41 0.45'); yMain -= 11; }
    }
    yMain -= 8;
  }
  const drawSection = (section: CvSection) => {
    if (yMain < 65) return false;
    yMain -= 1;
    textAt(mainX, yMain, section.heading.toUpperCase(), 10.2, 'F2', '0.09 0.23 0.34');
    yMain -= 14;
    for (const source of section.lines) {
      const bullet = /^[•●▪]/.test(source);
      const isRole = !bullet && /\s\|\s/.test(source);
      const lines = splitPdfLine(source, bullet ? 64 : 68);
      for (let index = 0; index < lines.length; index += 1) {
        if (yMain < 53) return false;
        const value = `${bullet && index === 0 ? '• ' : ''}${lines[index]}`;
        textAt(mainX + (bullet ? 3 : 0), yMain, value, isRole ? 8.4 : 8.1, isRole ? 'F2' : 'F1', isRole ? '0.18 0.23 0.27' : '0.16 0.2 0.23');
        yMain -= 10;
      }
      yMain -= bullet ? 1.5 : 3;
    }
    yMain -= 7;
    return true;
  };
  for (const section of mainSections) {
    if (!drawSection(section)) break;
  }
  return ops.join('\n');
}

export function createSimplePdf(text: string): Buffer {
  const laidOut = parseCvLayout(text);
  const roleLineCount = laidOut.role
    ? splitPdfLine(laidOut.role.toUpperCase(), 56).length
    : 0;
  const pageLimit = 690;
  const pages: CvSection[][] = [[]];
  const sidebarPages = paginateSimpleSidebar(laidOut.sidebar);
  let used = 25 + roleLineCount * 11;
  for (const section of laidOut.main) {
    let pageSection: CvSection | undefined;
    for (const sourceLine of section.lines) {
      const bullet = /^[•●▪]/.test(sourceLine);
      const wrapped = splitPdfLine(sourceLine, bullet ? 64 : 68);
      for (const [index, line] of wrapped.entries()) {
        const renderedLine = `${bullet && index === 0 ? '• ' : ''}${line}`;
        const lineCost = 13;
        const headingCost = pageSection ? 0 : 22;
        if (used + headingCost + lineCost > pageLimit && pages[pages.length - 1]!.length) {
          pages.push([]);
          used = 0;
          pageSection = undefined;
        }
        if (!pageSection) {
          pageSection = { heading: section.heading, lines: [] };
          pages[pages.length - 1]!.push(pageSection);
          used += 22;
        }
        pageSection.lines.push(renderedLine);
        used += lineCost;
      }
    }
    if (pageSection) used += 7;
    else if (!section.lines.length) {
      if (used + 22 > pageLimit && pages[pages.length - 1]!.length) {
        pages.push([]);
        used = 0;
      }
      pages[pages.length - 1]!.push({ heading: section.heading, lines: [] });
      used += 22;
    }
  }
  const objects: string[] = [];
  const pageCount = Math.max(pages.length, sidebarPages.length);
  const pageIds = Array.from({ length: pageCount }, (_, index) => 3 + index * 2);
  const contentIds = Array.from({ length: pageCount }, (_, index) => 4 + index * 2);
  const fontRegularId = 3 + pageCount * 2;
  const fontBoldId = fontRegularId + 1;
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  pageIds.forEach((pageId, index) => {
    const contentId = contentIds[index]!;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    const stream = makeTemplatePage(
      laidOut,
      pages[index] ?? [],
      sidebarPages[index] ?? [],
      index === 0,
    );
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  });
  objects[fontRegularId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[fontBoldId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [0];
  for (let id = 1; id <= fontBoldId; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${fontBoldId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontBoldId; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${fontBoldId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

function safePdfText(value: string): string {
  return value
    .replace(/[•●▪]/g, '•')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '?');
}

function wrapForFont(value: string, font: Awaited<ReturnType<PDFDocument['embedFont']>>, size: number, width: number): string[] {
  const words = safePdfText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export async function createCvPdfFromTemplate(text: string, templateBuffer: Buffer): Promise<Buffer> {
  let template: PDFDocument;
  try {
    template = await PDFDocument.load(templateBuffer);
  } catch {
    throw new BadRequestError('The original CV PDF template could not be opened.');
  }
  const templatePages = template.getPages();
  if (!templatePages.length) throw new BadRequestError('The original CV PDF template has no pages.');

  const output = await PDFDocument.create();
  const [regular, bold] = await Promise.all([
    output.embedFont(StandardFonts.Helvetica),
    output.embedFont(StandardFonts.HelveticaBold),
  ]);
  const backgrounds = await output.embedPdf(templateBuffer, templatePages.map((_, index) => index));
  const layout = parseCvLayout(text);
  // Sampled from the uploaded template so the replaced sidebar blocks blend seamlessly.
  const navy = rgb(23 / 255, 59 / 255, 89 / 255);
  const white = rgb(1, 1, 1);
  const ink = rgb(0.14, 0.19, 0.23);
  const muted = rgb(0.36, 0.41, 0.45);
  const left = 210;
  const sidebarLeft = 48;
  const sidebarRight = left - 8;
  const sidebarWidth = sidebarRight - sidebarLeft;
  const sidebarTextInset = 14;
  const sideX = sidebarLeft + sidebarTextInset;
  const sideWidth = sidebarWidth - sidebarTextInset * 2;
  const sideSections = layout.sidebar;
  const renderedSideSections = sideSections.filter((section) =>
    ['CORE SKILLS', 'INTERESTS'].includes(section.heading.toUpperCase()),
  );
  let pageIndex = -1;
  let page!: ReturnType<typeof output.addPage>;
  let yMain = 0;
  let ySide = 0;
  let sidebarCursor: { sectionIndex: number; lineIndex: number; wrappedLineIndex: number; headingDrawn: boolean } | null = {
    sectionIndex: 0,
    lineIndex: 0,
    wrappedLineIndex: 0,
    headingDrawn: false,
  };

  const addPage = (first = false) => {
    pageIndex += 1;
    const sourceIndex = Math.min(pageIndex, backgrounds.length - 1);
    const background = backgrounds[sourceIndex]!;
    const sourceSize = templatePages[sourceIndex]!.getSize();
    page = output.addPage([sourceSize.width, sourceSize.height]);
    page.drawPage(background, { x: 0, y: 0, width: sourceSize.width, height: sourceSize.height });
    page.drawRectangle({ x: left - 8, y: 24, width: sourceSize.width - left + 8, height: sourceSize.height - 48, color: white });
    if (first) {
      // The template's first-page portrait occupies the top of the sidebar; preserve it.
      // Keep the original contact and bio-data block exactly beneath the portrait.
      page.drawRectangle({
        x: sidebarLeft,
        y: 40,
        width: sidebarWidth,
        height: 479,
        color: navy,
      });
      ySide = 510;
    } else {
      // Replace the source sidebar completely so its repeated personal details cannot show through.
      page.drawRectangle({
        x: sidebarLeft,
        y: 40,
        width: sidebarWidth,
        height: sourceSize.height - 48,
        color: navy,
      });
      ySide = sourceSize.height - 54;
    }
    yMain = sourceSize.height - 54;
    return page;
  };

  const drawSidebar = () => {
    while (sidebarCursor && sidebarCursor.sectionIndex < renderedSideSections.length) {
      const section = renderedSideSections[sidebarCursor.sectionIndex]!;
      if (!sidebarCursor.headingDrawn) {
        if (ySide < 56) return;
        ySide -= 4;
        page.drawText(safePdfText(section.heading.toUpperCase()), {
          x: sideX, y: ySide, size: 9, font: bold, color: white,
        });
        ySide -= 14;
        sidebarCursor.headingDrawn = true;
      }
      while (sidebarCursor.lineIndex < section.lines.length) {
        const sourceLine = section.lines[sidebarCursor.lineIndex]!;
        const bullet = /^[•●▪]/.test(sourceLine);
        const content = sourceLine.replace(/^[•●▪]\s*/, '');
        const wrapped = wrapForFont(content, regular, 7.1, sideWidth - (bullet ? 6 : 0));
        while (sidebarCursor.wrappedLineIndex < wrapped.length) {
          if (ySide < 52) return;
          const lineIndex = sidebarCursor.wrappedLineIndex;
          page.drawText(`${bullet && lineIndex === 0 ? '• ' : ''}${wrapped[lineIndex]}`, {
            x: sideX, y: ySide, size: 7.1, font: regular, color: white,
          });
          ySide -= 9;
          sidebarCursor.wrappedLineIndex += 1;
        }
        ySide -= 2;
        sidebarCursor.lineIndex += 1;
        sidebarCursor.wrappedLineIndex = 0;
      }
      ySide -= 6;
      sidebarCursor.sectionIndex += 1;
      sidebarCursor.lineIndex = 0;
      sidebarCursor.wrappedLineIndex = 0;
      sidebarCursor.headingDrawn = false;
    }
    sidebarCursor = null;
  };

  addPage(true);
  drawSidebar();
  page.drawText(safePdfText(layout.name.toUpperCase()), { x: left, y: yMain, size: 18, font: bold, color: navy });
  yMain -= 18;
  if (layout.role) {
    for (const line of wrapForFont(layout.role.toUpperCase(), regular, 8.2, 345)) {
      page.drawText(line, { x: left, y: yMain, size: 8.2, font: regular, color: muted });
      yMain -= 11;
    }
  }
  yMain -= 10;

  const startContinuationPage = () => {
    addPage(false);
    drawSidebar();
    yMain = output.getPages()[output.getPageCount() - 1]!.getHeight() - 52;
  };

  for (const section of layout.main) {
    const heading = safePdfText(section.heading.toUpperCase());
    if (yMain < 70) startContinuationPage();
    page.drawText(heading, { x: left, y: yMain, size: 10.2, font: bold, color: navy });
    yMain -= 15;
    for (const sourceLine of section.lines) {
      const bullet = /^[•●▪]/.test(sourceLine);
      const content = sourceLine.replace(/^[•●▪]\s*/, '');
      const roleLine = !bullet && /\s\|\s/.test(content);
      const font = roleLine ? bold : regular;
      const size = roleLine ? 8.4 : 8.1;
      const lines = wrapForFont(content, font, size, 345 - (bullet ? 8 : 0));
      for (const [lineIndex, line] of lines.entries()) {
        if (yMain < 55) startContinuationPage();
        const prefix = bullet && lineIndex === 0 ? '• ' : '';
        page.drawText(`${prefix}${line}`, {
          x: left + (bullet ? 3 : 0), y: yMain, size, font, color: ink,
        });
        yMain -= 10;
      }
      yMain -= bullet ? 1.5 : 3;
    }
    yMain -= 8;
  }

  while (sidebarCursor) {
    startContinuationPage();
  }

  return Buffer.from(await output.save());
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files: Array<{ name: string; data: Buffer }>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name);
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, file.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(file.data.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + file.data.length;
  }

  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralDirectory, end]);
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtmlSection(section: CvSection, sidebar = false): string {
  const isExperienceSection = ['EXPERIENCE', 'WORK EXPERIENCE', 'TEACHING EXPERIENCE', 'ADDITIONAL PROFESSIONAL EXPERIENCE']
    .includes(section.heading.toUpperCase());
  const lines = section.lines.map((line) => {
    const hasBullet = /^[•●▪-]\s*/.test(line);
    const isRoleLine = !sidebar && !hasBullet && line.includes('|');
    const isBullet = hasBullet || (isExperienceSection && !isRoleLine);
    const content = isBullet ? line.replace(/^[•●▪-]\s*/, '') : line;
    return `<p class="${isBullet ? 'bullet' : isRoleLine ? 'role-line' : 'copy'}">${htmlEscape(content)}</p>`;
  }).join('');
  return `<section class="${sidebar ? 'sidebar-section' : 'main-section'}"><h2>${htmlEscape(section.heading)}</h2>${lines}</section>`;
}

function extractPortraitJpeg(template: PDFDocument): Buffer | undefined {
  const candidates: Array<{ data: Buffer; area: number }> = [];
  try {
    for (const page of template.getPages()) {
      const resources = page.node.Resources();
      const xObjects = resources?.lookup(PDFName.of('XObject'), PDFDict);
      if (!xObjects) continue;
      for (const key of xObjects.keys()) {
        const image = xObjects.lookup(key);
        if (!(image instanceof PDFRawStream)) continue;
        if (image.dict.lookup(PDFName.of('Subtype'))?.toString() !== '/Image') continue;
        if (image.dict.lookup(PDFName.of('Filter'))?.toString() !== '/DCTDecode') continue;
        const imageWidth = image.dict.lookup(PDFName.of('Width'));
        const imageHeight = image.dict.lookup(PDFName.of('Height'));
        if (!imageWidth || !imageHeight) continue;
        const width = Number(imageWidth.toString());
        const height = Number(imageHeight.toString());
        const ratio = width / height;
        if (width < 100 || height < 100 || ratio < 0.55 || ratio > 1.2) continue;
        candidates.push({ data: Buffer.from(image.getContents()), area: width * height });
      }
    }
  } catch {
    // Portrait extraction is optional; unsupported PDF image structures should
    // still allow the HTML renderer to produce a preview with its placeholder.
    return undefined;
  }
  // CV portraits tend to be the smallest near-square JPEG in a template; ignore
  // full-page scans and wide decorative images when selecting the candidate.
  return candidates.sort((a, b) => a.area - b.area)[0]?.data;
}

/**
 * Render a CV with HTML and print CSS, using the supplied PDF for its page dimensions.
 * This is intentionally separate from createCvPdfFromTemplate so callers can compare
 * the HTML renderer with the legacy PDF overlay renderer before switching over.
 */
export async function createCvPdfFromHtmlTemplate(
  text: string,
  templateBuffer: Buffer,
  portrait?: { buffer: Buffer; mimeType: 'image/jpeg' | 'image/png' },
): Promise<Buffer> {
  let template: PDFDocument;
  try {
    template = await PDFDocument.load(templateBuffer);
  } catch {
    throw new BadRequestError('The original CV PDF template could not be opened.');
  }
  const firstPage = template.getPage(0);
  if (!firstPage) throw new BadRequestError('The original CV PDF template has no pages.');
  const { width, height } = firstPage.getSize();
  const portraitImage = portrait ?? (() => {
    const data = extractPortraitJpeg(template);
    return data ? { buffer: data, mimeType: 'image/jpeg' as const } : undefined;
  })();
  const layout = parseCvLayout(text);
  const sidebar = layout.sidebar
    .filter(({ heading }) => ['CONTACT', 'BIO DATA', 'CORE SKILLS', 'INTERESTS'].includes(heading.toUpperCase()))
    .map((section) => renderHtmlSection(section, true)).join('');
  const main = layout.main.map((section) => renderHtmlSection(section)).join('');
  const portraitMarkup = portraitImage
    ? `<img class="portrait-image" src="data:${portraitImage.mimeType};base64,${portraitImage.buffer.toString('base64')}" alt="CV portrait">`
    : '<div class="portrait-placeholder" aria-hidden="true"></div>';
  //   const html = `<!doctype html>
  // <html lang="en"><head><meta charset="utf-8"><style>
  //   @page { size: ${width}pt ${height}pt; margin: 18pt 0 0; }
  //   * { box-sizing: border-box; }
  //   html, body { margin: 0; padding: 0; }
  //   body { color: #202b35; font-family: Georgia, 'Times New Roman', serif; font-size: 9.6pt; line-height: 1.24; }
  //   body::before { content: ''; position: fixed; z-index: -1; inset: 0 auto 0 6.54%; width: 26.47%; background: #173b59; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  //   .cv { display: grid; grid-template-columns: 29% 71%; align-items: start; min-height: ${height - 18}pt; padding: 12pt 28pt 34pt; }
  //   .sidebar { color: #fff; background: #173b59; margin-left: 12pt; padding: 0 13pt 18pt 8pt; }
  //   .portrait-frame { height: 205pt; margin: -12pt -25pt 21pt -8pt; padding: 28pt; background: #e8edf1; display: grid; place-items: center; }
  //   .portrait-image { width: 100%; height: 100%; object-fit: cover; object-position: center top; }
  //   .portrait-placeholder { width: 100%; height: 100%; background: #fff; }
  //   .main { background: #fff; padding: 0 0 0 10pt; min-width: 0; }
  //   h1 { color: #173b59; font-family: Georgia, 'Times New Roman', serif; font-size: 23pt; font-weight: 400; letter-spacing: .15pt; line-height: 1.08; margin: 0 0 7pt; text-transform: uppercase; }
  //   .role { color: #496b86; font-size: 12.5pt; margin: 0 0 10pt; text-transform: uppercase; }
  //   h2 { color: #173b59; font-family: Georgia, 'Times New Roman', serif; font-size: 11.5pt; font-weight: 400; line-height: 1.15; margin: 8pt 0 3.5pt; text-transform: uppercase; break-after: avoid-page; }
  //   .sidebar h2 { color: #fff; font-family: Arial, sans-serif; font-size: 9pt; font-weight: 700; margin-top: 0; }
  //   p { margin: 0 0 2.2pt; overflow-wrap: anywhere; orphans: 2; widows: 2; }
  //   .bullet { position: relative; padding-left: 9pt; }
  //   .bullet::before { content: '•'; position: absolute; left: 0; }
  //   .sidebar p { color: #fff; margin-bottom: 2.2pt; }
  //   .sidebar-section { margin-bottom: 15pt; break-inside: avoid-page; }
  //   .main-section { break-inside: auto; }
  //   .main-section .role-line { font-weight: 700; margin-top: 5pt; margin-bottom: 2.5pt; break-after: avoid-page; }
  //   .main-section .bullet { font-weight: 400; }
  //   @media print { * { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  // </style></head><body><div class="cv">
  //   <aside class="sidebar"><div class="portrait-frame">${portraitMarkup}</div>${sidebar}</aside>
  //   <main class="main"><h1>${htmlEscape(layout.name)}</h1>${layout.role ? `<p class="role">${htmlEscape(layout.role)}</p>` : ''}${main}</main>
  // </div></body></html>`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: ${width}pt ${height}pt;
      margin: 18pt 0 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
    }

    body {
      color: #202b35;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 9.6pt;
      line-height: 1.24;
    }

    /*
     * Sidebar background:
     * Keep a visible margin on the left instead of extending
     * the navy background across the entire left side.
     */
    body::before {
      content: '';
      position: fixed;
      z-index: -1;
      top: 0;
      bottom: 0;
      left: 6.54%;
      width: 24.5%;
      background: #173b59;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .cv {
      display: grid;
      grid-template-columns: 29% 71%;
      align-items: start;
      min-height: ${height - 18}pt;
      padding: 12pt 28pt 34pt;
    }

    .sidebar {
      color: #fff;
      background: transparent;
      margin-left: 3pt;
      padding: 0 13pt 18pt 30pt;
    }

    .portrait-frame {
      height: 205pt;
      margin: -12pt -12pt 21pt 0;
      padding: 28pt;
      background: #e8edf1;
      display: grid;
      place-items: center;
    }

    .portrait-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
    }

    .portrait-placeholder {
      width: 100%;
      height: 100%;
      background: #fff;
    }

    .main {
      background: #fff;
      padding: 0 0 0 10pt;
      min-width: 0;
    }

    h1 {
      color: #173b59;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 23pt;
      font-weight: 400;
      letter-spacing: .15pt;
      line-height: 1.08;
      margin: 0 0 7pt;
      text-transform: uppercase;
    }

    .role {
      color: #496b86;
      font-size: 12.5pt;
      margin: 0 0 10pt;
      text-transform: uppercase;
    }

    h2 {
      color: #173b59;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 11.5pt;
      font-weight: 400;
      line-height: 1.15;
      margin: 8pt 0 3.5pt;
      text-transform: uppercase;
      break-after: avoid-page;
    }

    .sidebar h2 {
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 9pt;
      font-weight: 700;
      margin-top: 0;
    }

    p {
      margin: 0 0 2.2pt;
      overflow-wrap: anywhere;
      orphans: 2;
      widows: 2;
    }

    .bullet {
      position: relative;
      padding-left: 9pt;
    }

    .bullet::before {
      content: '•';
      position: absolute;
      left: 0;
    }

    .sidebar p {
      color: #fff;
      margin-bottom: 2.2pt;
    }

    .sidebar-section {
      margin-bottom: 15pt;
      break-inside: avoid-page;
    }

    .main-section {
      break-inside: auto;
    }

    .main-section .role-line {
      font-weight: 700;
      margin-top: 5pt;
      margin-bottom: 2.5pt;
      break-after: avoid-page;
    }

    .main-section .bullet {
      font-weight: 400;
    }

    @media print {
      * {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>

<body>
  <div class="cv">
    <aside class="sidebar">
      <div class="portrait-frame">
        ${portraitMarkup}
      </div>
      ${sidebar}
    </aside>

    <main class="main">
      <h1>${htmlEscape(layout.name)}</h1>
      ${layout.role
      ? `<p class="role">${htmlEscape(layout.role)}</p>`
      : ''
    }
      ${main}
    </main>
  </div>
</body>
</html>`;
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: Math.ceil(width), height: Math.ceil(height) } });
    await page.setContent(html, { waitUntil: 'load' });
    return Buffer.from(await page.pdf({ printBackground: true, preferCSSPageSize: true }));
  } finally {
    await browser.close();
  }
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function createSimpleDocx(text: string): Buffer {
  const paragraphs = text.replace(/\r/g, '').split('\n').map((current) => {
    if (!current.trim()) return '<w:p/>';
    const bold = /^[A-Z][A-Z &/+-]{2,}$/.test(current.trim());
    return `<w:p><w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${xmlEscape(current)}</w:t></w:r></w:p>`;
  }).join('');

  const files = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    },
    {
      name: 'word/document.xml',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900"/></w:sectPr></w:body></w:document>`),
    },
    {
      name: 'word/styles.xml',
      data: Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="21"/></w:rPr></w:style></w:styles>'),
    },
  ];
  return zipStore(files);
}

