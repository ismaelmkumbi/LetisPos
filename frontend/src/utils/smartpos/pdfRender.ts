/**
 * PDF page-to-image renderer.
 *
 * For scanned/image-based PDFs that have no extractable text, we render
 * each page to a canvas and return JPEG data URLs. These can then be sent
 * to the AI vision endpoint (import-from-images) for OCR-like reading.
 *
 * Uses the existing pdfjs-dist dependency.
 */
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface PdfPageImage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Detect whether a PDF page is likely image-only (no extractable text).
 */
export async function isPageImageOnly(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
): Promise<boolean> {
  const page = await pdf.getPage(pageNum);
  const text = await page.getTextContent();
  const hasText = text.items.some((item) => {
    if (!('str' in item)) return false;
    return (item.str as string).trim().length > 0;
  });
  return !hasText;
}

/**
 * Render a single PDF page to a JPEG data URL.
 *
 * @param scale  CSS pixels per PDF unit.  Default 2.0 → high-res for AI.
 */
export async function renderPdfPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale = 2.0,
  jpegQuality = 0.92,
): Promise<PdfPageImage> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d')!;

  // White background (PDFs may have transparent regions)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  // Adaptive compression: target ~1 MB per page at 2× scale
  let quality = jpegQuality;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > 1_200_000 && quality > 0.65) {
    quality -= 0.05;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  return {
    pageNumber: pageNum,
    dataUrl,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Render all pages of a PDF to images.
 *
 * Optionally skip pages that already have text (if `onlyImagePages` is true).
 */
export async function renderPdfToImages(
  file: File,
  opts: { scale?: number; jpegQuality?: number; onlyImagePages?: boolean; maxPages?: number } = {},
): Promise<PdfPageImage[]> {
  const { scale = 2.0, jpegQuality = 0.92, onlyImagePages = false, maxPages = 50 } = opts;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  const results: PdfPageImage[] = [];
  const limit = Math.min(pdf.numPages, maxPages);

  for (let i = 1; i <= limit; i++) {
    if (onlyImagePages) {
      const isImage = await isPageImageOnly(pdf, i);
      if (!isImage) continue;
    }
    results.push(await renderPdfPage(pdf, i, scale, jpegQuality));
  }

  return results;
}

/**
 * Quick heuristic: is the whole PDF image-only?
 * Checks first 3 pages; if all are image-only → true.
 */
export async function isScannedPdf(file: File): Promise<boolean> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const checkPages = Math.min(pdf.numPages, 3);
  let imageOnlyCount = 0;
  for (let i = 1; i <= checkPages; i++) {
    if (await isPageImageOnly(pdf, i)) imageOnlyCount++;
  }
  return imageOnlyCount === checkPages;
}
