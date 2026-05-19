/** Deterministic rating (3.0–5.0) from a product ID hash. */
export function getProductRating(productId: string): number {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = ((hash << 5) - hash) + productId.charCodeAt(i);
    hash |= 0;
  }
  const base = Math.abs(hash) % 21;
  return Math.round((3.0 + base / 10) * 10) / 10;
}
