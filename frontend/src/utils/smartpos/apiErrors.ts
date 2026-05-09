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
      return { message: detail, isStockIssue: false };
    }
  }
  return {
    message: e instanceof Error ? e.message : 'Save failed',
    isStockIssue: false,
  };
}
