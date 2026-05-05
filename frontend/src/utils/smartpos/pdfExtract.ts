/**
 * PDF text extraction utility.
 * Uses pdfjs-dist to extract text from PDF files client-side.
 * Handles errors gracefully — returns null for encrypted/image-only PDFs.
 */
import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker (tree-shakeable in pdfjs-dist 4.x)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface PdfExtractResult {
  /** Concatenated text from all pages */
  text: string;
  /** Number of pages */
  pages: number;
  /** Per-page text */
  pageTexts: string[];
}

/**
 * Extract text from a PDF file.
 * Returns null if the PDF is encrypted, image-only, or unreadable.
 */
export async function extractPdfText(file: File): Promise<PdfExtractResult | null> {
  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

    const pageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str as string : ''))
        .join(' ');
      pageTexts.push(text);
    }

    const text = pageTexts.join('\n').trim();
    if (!text) return null; // image-only PDF

    return { text, pages: pdf.numPages, pageTexts };
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    if (e.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Please unlock it and try again.');
    }
    console.warn('PDF extraction failed:', e.message);
    return null;
  }
}

/**
 * Heuristic row parser: tries to split extracted PDF text into structured rows.
 *
 * Strategies (in order):
 *   1. Tab-separated → treat first line as header, rest as rows
 *   2. Multiple spaces between columns → split on 2+ spaces
 *   3. Pipe-separated → split on |
 *   4. Fallback: each non-blank line is one row with a single "text" column
 *
 * Returns { headers, rows } compatible with the AI import-map API shape.
 */
export function parsePdfRows(text: string): {
  headers: string[];
  rows: { row: number; values: Record<string, string> }[];
} {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detect separator
  const tabLines = lines.filter((l) => l.includes('\t'));
  const pipeLines = lines.filter((l) => l.includes('|'));

  let headers: string[];
  let dataLines: string[];
  let separator: '\t' | '|' | 'spaces' | 'none';

  if (tabLines.length > lines.length * 0.3) {
    separator = '\t';
  } else if (pipeLines.length > lines.length * 0.3) {
    separator = '|';
  } else if (hasMultiSpaceColumns(lines.slice(0, 3))) {
    separator = 'spaces';
  } else {
    separator = 'none';
  }

  switch (separator) {
    case '\t':
      headers = lines[0].split('\t').map((h) => h.trim().toLowerCase());
      dataLines = lines.slice(1);
      return {
        headers,
        rows: buildRows(dataLines, headers, (l) => l.split('\t').map((v) => v.trim())),
      };

    case '|':
      headers = lines[0].split('|').map((h) => h.trim().toLowerCase()).filter(Boolean);
      dataLines = lines.slice(1);
      return {
        headers,
        rows: buildRows(dataLines, headers, (l) =>
          l.split('|').map((v) => v.trim()),
        ),
      };

    case 'spaces':
      return parseSpaceSeparated(lines);

    default:
      // No structure detected — each line becomes a "name" row
      return {
        headers: ['text'],
        rows: lines.map((line, i) => ({
          row: i,
          values: { text: line },
        })),
      };
  }
}

function hasMultiSpaceColumns(lines: string[]): boolean {
  return lines.some((l) => /\S\s{2,}\S/.test(l));
}

function parseSpaceSeparated(lines: string[]): {
  headers: string[];
  rows: { row: number; values: Record<string, string> }[];
} {
  const allCells = lines.map((l) =>
    l.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean),
  );

  // Guess first line is header if it has fewer numbers than data lines
  const firstIsHeader = allCells.length > 1 && hasFewerNumbers(allCells[0], allCells.slice(1));
  const headers = firstIsHeader
    ? allCells[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, '_'))
    : allCells[0].map((_, i) => `col_${i}`);
  const dataLines = firstIsHeader ? lines.slice(1) : lines;
  const dataCells = firstIsHeader ? allCells.slice(1) : allCells;

  return {
    headers,
    rows: buildRows(dataLines, headers, (_, i) => {
      const cells = dataCells[i];
      return headers.map((_, j) => (cells[j] ?? ''));
    }),
  };
}

function hasFewerNumbers(header: string[], dataRows: string[][]): boolean {
  const headerNumCount = header.filter((c) => /^\d/.test(c)).length;
  const avgDataNumCount =
    dataRows.reduce((sum, r) => sum + r.filter((c) => /^\d/.test(c)).length, 0) /
    Math.max(1, dataRows.length);
  return headerNumCount < avgDataNumCount;
}

function buildRows(
  lines: string[],
  headers: string[],
  cellExtractor: (line: string, index: number) => string[],
): { row: number; values: Record<string, string> }[] {
  return lines
    .map((line, i) => {
      const cells = cellExtractor(line, i);
      const values: Record<string, string> = {};
      headers.forEach((h, j) => {
        values[h] = (cells[j] ?? '').trim();
      });
      return { row: i, values };
    })
    .filter((r) => Object.values(r.values).some((v) => v.length > 0));
}
