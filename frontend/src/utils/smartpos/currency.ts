export const DEFAULT_LOCALE = 'en-TZ';
export const DEFAULT_CURRENCY = 'TZS';

const ZERO_DECIMAL_CURRENCIES = new Set(['TZS']);

export function formatMoney(
  value: number,
  currency = DEFAULT_CURRENCY,
  options?: Intl.NumberFormatOptions,
) {
  const maximumFractionDigits = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency,
    maximumFractionDigits,
    ...options,
  }).format(value || 0);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(DEFAULT_LOCALE).format(value || 0);
}
