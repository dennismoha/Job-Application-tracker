import { BadRequestError } from '../../shared/http/http-error.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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
      const text = result.text?.replace(/\u0000/g, '').trim() ?? '';
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
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, '?');
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
  const effectiveNameIndex = nameIndex >= 0 ? nameIndex : 0;
  const name = lines[effectiveNameIndex] || 'Professional Profile';
  const roleLine = lines[effectiveNameIndex + 1];
  const role = roleLine && !isSectionHeading(roleLine) ? roleLine : '';
  const mainStart = effectiveNameIndex + (role ? 2 : 1);

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
    if (!skippingSidebar && current) current.lines.push(line);
  }
  return { name, role, sidebar, main: main.length ? main : [{ heading: 'PROFILE', lines: lines.slice(mainStart) }] };
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

function makeTemplatePage(laidOut: ReturnType<typeof parseCvLayout>, mainSections: CvSection[], firstPage: boolean): string {
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
  for (const section of laidOut.sidebar) writeSidebar(section);
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
  const pages: CvSection[][] = [[]];
  let used = 0;
  for (const section of laidOut.main) {
    const estimate = 30 + section.lines.reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 66)) * 11, 0);
    if (used + estimate > 700 && pages[pages.length - 1]!.length) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1]!.push(section);
    used += estimate;
  }
  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 3 + index * 2);
  const contentIds = pages.map((_, index) => 4 + index * 2);
  const fontRegularId = 3 + pages.length * 2;
  const fontBoldId = fontRegularId + 1;
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  pages.forEach((sections, index) => {
    const pageId = pageIds[index]!;
    const contentId = contentIds[index]!;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    const stream = makeTemplatePage(laidOut, sections, index === 0);
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
  const templatePages = await template.getPages();
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
  const rightMargin = 29;
  const sideX = 62;
  const sideWidth = 112;
  const sideSections = layout.sidebar;
  let pageIndex = -1;
  let page!: ReturnType<typeof output.addPage>;
  let yMain = 0;
  let ySide = 0;

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
      page.drawRectangle({ x: 48, y: 40, width: 140, height: 479, color: navy });
      ySide = 510;
    } else {
      // Keep the repeated contact and bio-data at the top of the original continuation rail.
      page.drawRectangle({ x: 48, y: 40, width: 140, height: 640, color: navy });
      ySide = 667;
    }
    yMain = sourceSize.height - 54;
    return page;
  };

  const drawSidebar = (sections: CvSection[]) => {
    for (const section of sections) {
      if (ySide < 56) break;
      ySide -= 4;
      page.drawText(safePdfText(section.heading.toUpperCase()), { x: sideX, y: ySide, size: 9, font: bold, color: white });
      ySide -= 14;
      for (const sourceLine of section.lines) {
        const bullet = /^[•●▪]/.test(sourceLine);
        const content = sourceLine.replace(/^[•●▪]\s*/, '');
        for (const [lineIndex, line] of wrapForFont(content, regular, 7.1, sideWidth - (bullet ? 6 : 0)).entries()) {
          if (ySide < 52) return;
          page.drawText(`${bullet && lineIndex === 0 ? '• ' : ''}${line}`, {
            x: sideX, y: ySide, size: 7.1, font: regular, color: white,
          });
          ySide -= 9;
        }
        ySide -= 2;
      }
      ySide -= 6;
    }
  };

  addPage(true);
  drawSidebar(sideSections.filter((section) => ['CORE SKILLS', 'INTERESTS'].includes(section.heading.toUpperCase())));
  page.drawText(safePdfText(layout.name.toUpperCase()), { x: left, y: yMain, size: 18, font: bold, color: navy });
  yMain -= 18;
  if (layout.role) {
    for (const line of wrapForFont(layout.role.toUpperCase(), regular, 8.2, 345)) {
      page.drawText(line, { x: left, y: yMain, size: 8.2, font: regular, color: muted });
      yMain -= 11;
    }
  }
  yMain -= 10;

  const startContinuationPage = (continuedHeading?: string) => {
    addPage(false);
    drawSidebar(sideSections.filter((section) => ['CORE SKILLS', 'INTERESTS'].includes(section.heading.toUpperCase())));
    yMain = output.getPages()[output.getPageCount() - 1]!.getHeight() - 52;
    if (continuedHeading) {
      page.drawText(`${safePdfText(continuedHeading.toUpperCase())} (CONTINUED)`, {
        x: left, y: yMain, size: 10, font: bold, color: navy,
      });
      yMain -= 17;
    }
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
        if (yMain < 55) startContinuationPage(section.heading);
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
