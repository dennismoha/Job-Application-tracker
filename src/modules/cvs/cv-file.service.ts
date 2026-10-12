import { BadRequestError } from '../../shared/http/http-error.js';

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

export function createSimplePdf(text: string): Buffer {
  const lines = wrapText(text, 88);
  const linesPerPage = 49;
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += linesPerPage) pages.push(lines.slice(index, index + linesPerPage));
  if (!pages.length) pages.push(['']);

  const objects: string[] = [];
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  const fontId = 3 + pages.length * 2;

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  for (let index = 0; index < pages.length; index += 1) {
    pageIds.push(3 + index * 2);
    contentIds.push(4 + index * 2);
  }
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;

  pages.forEach((pageLines, index) => {
    const pageId = pageIds[index]!;
    const contentId = contentIds[index]!;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    const operations = ['BT', '/F1 10.5 Tf', '50 790 Td', '14 TL'];
    for (const current of pageLines) {
      operations.push(`(${pdfEscape(current)}) Tj`, 'T*');
    }
    operations.push('ET');
    const stream = operations.join('\n');
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  });
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [0];
  for (let id = 1; id <= fontId; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
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
