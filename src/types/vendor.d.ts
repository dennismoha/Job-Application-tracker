declare module 'pdf-parse' {
  export interface PdfParseResult { text?: string }
  export default function parse(buffer: Buffer): Promise<PdfParseResult>;
}

declare module 'mammoth' {
  export function extractRawText(input: { buffer: Buffer }): Promise<{ value: string; messages?: unknown[] }>;
}
