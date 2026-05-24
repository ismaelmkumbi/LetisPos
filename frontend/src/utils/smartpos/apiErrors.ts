/**
 * Parse API errors into user-friendly messages.
 * Detects known backend error patterns and returns actionable feedback.
 */

export interface ParsedApiError {
  message: string;
  isStockIssue: boolean;
}

export function parseApiError(e: unknown): ParsedApiError {
  if (e && typeof e === 'object' && 'response' in e) {
    const axiosErr = e as { response?: { data?: { detail?: string } } };
    const detail = axiosErr.response?.data?.detail;
    if (detail) {
      if (detail.includes('No stock row')) {
        return {
          message: 'This product has no stock in the selected warehouse. Add opening stock or record a purchase first.',
          isStockIssue: true,
        };
      }
      if (detail.includes('Insufficient stock') || detail.includes('Not enough stock')) {
        // Backend rewrites to friendly text; fallback for raw inventory messages
        const match = detail.match(/requested=([0-9.]+)\s+available=([0-9.]+)/);
        if (match) {
          const req = parseInt(match[1], 10);
          const avail = parseInt(match[2], 10);
          return {
            message: `Not enough stock — you need ${req} but only ${avail} ${avail === 1 ? 'is' : 'are'} available.`,
            isStockIssue: true,
          };
        }
        return { message: detail, isStockIssue: true };
      }
      return { message: detail, isStockIssue: false };
    }
  }
  return {
    message: e instanceof Error ? e.message : 'Save failed',
    isStockIssue: false,
  };
}
