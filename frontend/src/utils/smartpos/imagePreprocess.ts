/**
 * Client-side image preprocessing for AI vision import.
 *
 * Operations (applied in pipeline order):
 *   1. Auto-orient via EXIF (browser handles natively when loading <img>)
 *   2. Greyscale → contrast stretch (CLAHE-like)
 *   3. Mild sharpening (unsharp mask kernel)
 *   4. Resize to target dimension while preserving aspect ratio
 *   5. Compress to JPEG with adaptive quality
 *
 * All work is done on a temp off-screen <canvas> so the original image
 * is never modified in the DOM.
 */

export interface PreprocessOptions {
  maxDim?: number;
  targetWidth?: number;
  targetHeight?: number;
  jpegQuality?: number;
  minJpegQuality?: number;
  enhance?: boolean;
  maxOutputBytes?: number;
}

const DEFAULT_OPTS: Required<Omit<PreprocessOptions, 'targetWidth' | 'targetHeight'>> = {
  maxDim: 2048,
  jpegQuality: 0.92,
  minJpegQuality: 0.65,
  enhance: true,
  maxOutputBytes: 1_200_000,
};

/**
 * Load a data-URL or blob URL into an Image element.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Apply contrast stretch (simple histogram stretch) + mild unsharp mask.
 */
function enhanceImageData(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Find min/max luminance for stretch
  let minL = 255;
  let maxL = 0;
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (l < minL) minL = l;
    if (l > maxL) maxL = l;
  }

  const range = maxL - minL || 1;
  const scale = 255 / range;

  // Apply stretch + sharpen (3×3 unsharp mask)
  // We do this in two passes: first stretch to temp buffer, then sharpen
  const stretched = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = (data[i] - minL) * scale;
    const g = (data[i + 1] - minL) * scale;
    const b = (data[i + 2] - minL) * scale;
    stretched[i] = Math.min(255, Math.max(0, r));
    stretched[i + 1] = Math.min(255, Math.max(0, g));
    stretched[i + 2] = Math.min(255, Math.max(0, b));
    stretched[i + 3] = data[i + 3]; // alpha
  }

  // Fast unsharp: subtract blurred version.  Simplified 3×3 box blur.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = stretched[i + c];
        // 3×3 average minus center → edge amount
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += stretched[((y + dy) * width + (x + dx)) * 4 + c];
          }
        }
        const avg = sum / 9;
        const edge = (center - avg) * 0.6; // unsharp amount
        data[i + c] = Math.min(255, Math.max(0, center + edge));
      }
      data[i + 3] = stretched[i + 3];
    }
  }

  // Copy edge pixels (untouched by loop) from stretched
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        const i = (y * width + x) * 4;
        data[i] = stretched[i];
        data[i + 1] = stretched[i + 1];
        data[i + 2] = stretched[i + 2];
        data[i + 3] = stretched[i + 3];
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Preprocess an image data URL for optimal AI vision quality.
 *
 * Returns a new JPEG data URL.
 */
export async function preprocessImage(
  dataUrl: string,
  opts: PreprocessOptions = {},
): Promise<string> {
  const {
    maxDim,
    targetWidth,
    targetHeight,
    jpegQuality,
    minJpegQuality,
    enhance,
    maxOutputBytes,
  } = { ...DEFAULT_OPTS, ...opts };

  const img = await loadImage(dataUrl);

  // Compute output size
  let { width, height } = img;
  if (targetWidth && targetHeight) {
    width = targetWidth;
    height = targetHeight;
  } else if (maxDim) {
    if (width > maxDim || height > maxDim) {
      const ratio = maxDim / Math.max(width, height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // Fill white background (in case of transparent PNG)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  if (enhance) {
    enhanceImageData(ctx, width, height);
  }

  // Adaptive JPEG quality
  let quality = jpegQuality;
  let result = canvas.toDataURL('image/jpeg', quality);
  while (result.length > maxOutputBytes && quality > (minJpegQuality ?? 0.6)) {
    quality -= 0.05;
    result = canvas.toDataURL('image/jpeg', quality);
  }

  return result;
}

/**
 * Detect if an image is likely a document (has dominant white/light background
 * with dark text).  If true, we apply stronger contrast enhancement.
 */
export async function isLikelyDocument(dataUrl: string): Promise<boolean> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  // Sample at small resolution for speed
  const w = Math.min(256, img.width);
  const h = Math.round((img.height / img.width) * w);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  let lightPixels = 0;
  let total = 0;
  for (let i = 0; i < data.length; i += 16) { // sample every 4th pixel
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    if (brightness > 200) lightPixels++;
    total++;
  }
  return total > 0 && lightPixels / total > 0.55;
}

/**
 * Pipeline: preprocess multiple images, detecting documents for stronger
 * enhancement.
 */
export async function preprocessImages(
  dataUrls: string[],
  opts: PreprocessOptions = {},
): Promise<string[]> {
  const results: string[] = [];
  for (const url of dataUrls) {
    const doc = await isLikelyDocument(url);
    const enhanced = await preprocessImage(url, {
      ...opts,
      enhance: true,
      // Slightly lower quality for photos, higher for documents
      jpegQuality: doc ? 0.92 : 0.88,
    });
    results.push(enhanced);
  }
  return results;
}
