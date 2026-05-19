/**
 * Format a numeric price for display with the given currency.
 * Avoids hardcoded $ signs — use the Store.currency field.
 */
export function formatPrice(amount: number, currency?: string): string {
  const cur = currency || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unknown currency codes
    return `${cur} ${amount.toFixed(2)}`;
  }
}
