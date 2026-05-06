/**
 * Smart column mapping for product imports.
 *
 * Features:
 *   - Fuzzy field-name matching with configurable synonym lists
 *   - Template persistence via localStorage (per-tenant)
 *   - Header-normalisation pipeline (lowercase, de-accent, de-punctuate)
 *   - Confidence scoring per field
 *   - "Learn from correction" — user fixes feed back into next import
 */

import Fuse from 'fuse.js';

// ── Field definitions with synonyms ─────────────────────────────────────

export interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  synonyms: string[];
  // normalisers for common mis-spellings / abbreviations
  regexHints?: RegExp[];
}

export const PRODUCT_FIELDS: FieldDef[] = [
  {
    key: 'name',
    label: 'Product Name',
    required: true,
    synonyms: [
      'name',
      'product',
      'item',
      'description',
      'product name',
      'item name',
      'product description',
      'desc',
      'title',
      'item description',
      'articolo',
      'prodotto',
      'nombre',
      'nom',
      'naam',
      'nome',
    ],
    regexHints: [/^(product|item|desc)[\s_-]?name$/i, /^name[\s_-]?(of|product)?$/i],
  },
  {
    key: 'code',
    label: 'SKU / Code',
    required: false,
    synonyms: [
      'sku',
      'code',
      'product code',
      'item code',
      'article',
      'article number',
      'part number',
      'part no',
      'ref',
      'reference',
      'model',
      'model number',
      'codigo',
      'code article',
      'art nr',
      'artikelnummer',
    ],
    regexHints: [/^(sku|ref|art)[\s._-]?no?\.?$/i, /^(part|model|item)[\s._-]?(no|num|code)$/i],
  },
  {
    key: 'barcode',
    label: 'Barcode',
    required: false,
    synonyms: [
      'barcode',
      'ean',
      'upc',
      'isbn',
      'gtin',
      'scan code',
      'scan',
      'codigo de barras',
      'code barre',
      'barcod',
      'strichcode',
    ],
    regexHints: [/^barcode?$/i, /^(ean|upc|gtin|isbn)[\s_-]?\d*$/i],
  },
  {
    key: 'category',
    label: 'Category',
    required: false,
    synonyms: [
      'category',
      'cat',
      'type',
      'group',
      'family',
      'department',
      'class',
      'categoria',
      'categorie',
      'famille',
      'rubrique',
      'gruppe',
      'kategorie',
    ],
    regexHints: [/^cat(egor)?y?$/i, /^type[\s_-]?(group|category)?$/i],
  },
  {
    key: 'brand',
    label: 'Brand',
    required: false,
    synonyms: [
      'brand',
      'manufacturer',
      'mfr',
      'make',
      'vendor',
      'supplier',
      'marca',
      'fabricant',
      'hersteller',
      'merk',
    ],
    regexHints: [/^mfr\.?$/i, /^manuf(ac)?\.?$/i],
  },
  {
    key: 'unit',
    label: 'Unit',
    required: false,
    synonyms: [
      'unit',
      'uom',
      'unit of measure',
      'measure',
      'measurement',
      'uom',
      'unidad',
      'unite',
      'eenheid',
      'einheit',
    ],
    regexHints: [/^u\.?o\.?m\.?$/i, /^unit[\s_-]?of[\s_-]?measure$/i],
  },
  {
    key: 'cost',
    label: 'Cost / Buy Price',
    required: false,
    synonyms: [
      'cost',
      'buy',
      'purchase',
      'purchase price',
      'buy price',
      'cost price',
      'in price',
      'wholesale cost',
      'landing cost',
      'purchase cost',
      'kost',
      'kosten',
      'cout',
      'precio de compra',
      'aankoopprijs',
    ],
    regexHints: [
      /^(cost|buy|purchase)[\s_-]?(price|cost|amount|value)?$/i,
      /^in[\s_-]?(price|cost)$/i,
      /^wholesale[\s_-]?cost$/i,
    ],
  },
  {
    key: 'price',
    label: 'Retail Price',
    required: false,
    synonyms: [
      'price',
      'retail',
      'retail price',
      'sell',
      'selling price',
      'sale price',
      'unit price',
      'price per unit',
      'list price',
      'market price',
      'precio',
      'prix',
      'prijs',
      'preis',
      'prezzo',
      'preco',
    ],
    regexHints: [
      /^(sell|retail|sale|list|market)[\s_-]?(price|amount|value)?$/i,
      /^price[\s_-]?(per[\s_-]?unit|unit)?$/i,
    ],
  },
  {
    key: 'wholesale',
    label: 'Wholesale Price',
    required: false,
    synonyms: [
      'wholesale',
      'wholesale price',
      'bulk',
      'bulk price',
      'trade price',
      'b2b',
      'b2b price',
      'reseller price',
      'dealer price',
      'distributor price',
    ],
    regexHints: [
      /^wholesale[\s_-]?(price|cost|amount)?$/i,
      /^bulk[\s_-]?price$/i,
      /^(b2b|trade|dealer|reseller)[\s_-]?price$/i,
    ],
  },
  {
    key: 'min',
    label: 'Min Price / Floor',
    required: false,
    synonyms: [
      'min',
      'minimum',
      'floor',
      'min price',
      'minimum price',
      'floor price',
      'lowest price',
      'bottom price',
      'price floor',
    ],
    regexHints: [/^(min|minimum|floor)[\s_-]?(price|amount|cost)?$/i],
  },
  {
    key: 'tax',
    label: 'Tax / VAT',
    required: false,
    synonyms: [
      'tax',
      'vat',
      'tax rate',
      'vat rate',
      'gst',
      'tax %',
      'vat %',
      'tva',
      'taux tva',
      'taxe',
      'btw',
      'moms',
      'mwst',
    ],
    regexHints: [/^(vat|tax|gst|tva|btw|mwst|moms)[\s._-]?\d*%?$/i, /^tax[\s_-]?rate$/i],
  },
  {
    key: 'stock',
    label: 'Opening Stock',
    required: false,
    synonyms: [
      'stock',
      'qty',
      'quantity',
      'on hand',
      'inventory',
      'opening stock',
      'current stock',
      'stock level',
      'in stock',
      'available',
      'cantidad',
      'quantite',
      'hoeveelheid',
      'menge',
      'quantita',
    ],
    regexHints: [
      /^(qty|quantity|stock)[\s_-]?(on[\s_-]?hand|level|count)?$/i,
      /^on[\s_-]?hand$/i,
      /^(opening|current|in)[\s_-]?stock$/i,
    ],
  },
  {
    key: 'stockAlert',
    label: 'Stock Alert / Reorder Level',
    required: false,
    synonyms: [
      'alert',
      'reorder',
      'reorder level',
      'reorder point',
      'min stock',
      'minimum stock',
      'stock alert',
      'low stock alert',
      'alert level',
      'seuil',
      'alerta',
      'alarme',
    ],
    regexHints: [
      /^(reorder|re[\s_-]?order)[\s_-]?(point|level|qty)?$/i,
      /^(min|minimum)[\s_-]?stock$/i,
      /^stock[\s_-]?alert$/i,
      /^alert[\s_-]?level$/i,
    ],
  },
  {
    key: 'weight',
    label: 'Weight',
    required: false,
    synonyms: ['weight', 'wt', 'grams', 'kg', 'kgs', 'kilos', 'mass'],
    regexHints: [/^wt\.?$/i, /^weight[\s_-]?(kg|g|grams)?$/i],
  },
  {
    key: 'dimensions',
    label: 'Dimensions',
    required: false,
    synonyms: ['dimensions', 'size', 'length', 'width', 'height', 'lwh', 'dim'],
    regexHints: [/^dim(ensions?)?$/i, /^size[\s_-]?(l|w|h)?$/i],
  },
];

// ── Normalisation ───────────────────────────────────────────────────────

function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // de-accent
    .replace(/[^a-z0-9]/g, ' ') // de-punctuate → spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Fuzzy matching ────────────────────────────────────────────────────────

export interface ColumnMatch {
  fieldKey: string;
  headerIndex: number;
  confidence: number; // 0–1
  method: 'exact' | 'regex' | 'fuzzy' | 'fallback';
}

export function matchColumns(headers: string[]): ColumnMatch[] {
  const results: ColumnMatch[] = [];
  const matchedIndices = new Set<number>();

  for (const field of PRODUCT_FIELDS) {
    let best: ColumnMatch | null = null;

    for (let i = 0; i < headers.length; i++) {
      if (matchedIndices.has(i)) continue;
      const nh = normaliseHeader(headers[i]);
      if (!nh) continue;

      let score = 0;
      let method: ColumnMatch['method'] = 'fallback';

      // 1. Exact synonym match
      if (field.synonyms.some((s) => normaliseHeader(s) === nh)) {
        score = 1.0;
        method = 'exact';
      }
      // 2. Regex hint match
      else if (field.regexHints?.some((re) => re.test(headers[i]) || re.test(nh))) {
        score = 0.95;
        method = 'regex';
      }
      // 3. Substring match
      else if (field.synonyms.some((s) => nh.includes(normaliseHeader(s)))) {
        score = 0.85;
        method = 'exact';
      }
      // 4. Fuzzy match
      else {
        const fuse = new Fuse(field.synonyms.map((s) => normaliseHeader(s)).filter(Boolean), {
          threshold: 0.35,
          distance: 30,
        });
        const res = fuse.search(nh);
        if (res.length > 0 && res[0].score != null) {
          score = 1 - res[0].score;
          method = 'fuzzy';
        }
      }

      if (score > (best?.confidence ?? 0)) {
        best = { fieldKey: field.key, headerIndex: i, confidence: score, method };
      }
    }

    if (best && best.confidence >= 0.4) {
      matchedIndices.add(best.headerIndex);
      results.push(best);
    }
  }

  return results;
}

// ── Template persistence ────────────────────────────────────────────────

const LS_KEY = (tenantId: string) => `smartpos_import_template_${tenantId}`;

export interface ImportTemplate {
  name: string;
  createdAt: string;
  mappings: Record<string, string>; // header → fieldKey
  sampleHeaders: string[];
}

export function listTemplates(tenantId: string): ImportTemplate[] {
  try {
    const raw = localStorage.getItem(LS_KEY(tenantId));
    if (!raw) return [];
    return JSON.parse(raw) as ImportTemplate[];
  } catch {
    return [];
  }
}

export function saveTemplate(tenantId: string, template: ImportTemplate): void {
  const list = listTemplates(tenantId).filter((t) => t.name !== template.name);
  list.unshift(template);
  localStorage.setItem(LS_KEY(tenantId), JSON.stringify(list.slice(0, 20)));
}

export function applyTemplate(headers: string[], template: ImportTemplate): ColumnMatch[] {
  return headers
    .map((h, i) => {
      const fieldKey = template.mappings[h] || template.mappings[normaliseHeader(h)];
      if (!fieldKey) return null;
      return {
        fieldKey,
        headerIndex: i,
        confidence: 0.9,
        method: 'exact' as const,
      };
    })
    .filter(Boolean) as ColumnMatch[];
}

// ── Learn from corrections ────────────────────────────────────────────────

/**
 * After the user fixes the AI mapping, extract the corrected header → field
 * pairs and store them as a weighted "known mapping" for future fuzzy scoring.
 */
const LEARNED_KEY = (tenantId: string) => `smartpos_import_learned_${tenantId}`;

export function recordCorrections(
  tenantId: string,
  headers: string[],
  fieldAssignments: Record<number, string>, // headerIndex → fieldKey
): void {
  try {
    const raw = localStorage.getItem(LEARNED_KEY(tenantId));
    const map: Record<string, { fieldKey: string; count: number }> = raw ? JSON.parse(raw) : {};
    for (const [idx, fieldKey] of Object.entries(fieldAssignments)) {
      const h = normaliseHeader(headers[Number(idx)]);
      if (!h) continue;
      if (!map[h] || map[h].fieldKey !== fieldKey) {
        map[h] = { fieldKey, count: 1 };
      } else {
        map[h].count++;
      }
    }
    localStorage.setItem(LEARNED_KEY(tenantId), JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getLearnedMappings(tenantId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(LEARNED_KEY(tenantId));
    if (!raw) return {};
    const map: Record<string, { fieldKey: string; count: number }> = JSON.parse(raw);
    const result: Record<string, string> = {};
    for (const [h, v] of Object.entries(map)) {
      if (v.count >= 2) result[h] = v.fieldKey; // require 2+ corrections to trust
    }
    return result;
  } catch {
    return {};
  }
}

// ── Duplicate detection ─────────────────────────────────────────────────

export interface DuplicateCheck {
  isDuplicate: boolean;
  matchedBy: 'code' | 'name' | 'barcode' | null;
  existingName: string | null;
  similarity: number;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array(a.length + 1)
    .fill(null)
    .map(() => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] =
        a[i - 1] === b[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[a.length][b.length];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

export function checkDuplicate(
  row: { name: string; code?: string | null; barcode?: string | null },
  existingProducts: { id: string; name: string; code?: string | null; barcode?: string | null }[],
): DuplicateCheck {
  if (!existingProducts.length)
    return { isDuplicate: false, matchedBy: null, existingName: null, similarity: 0 };

  // Exact code match
  const rowCode = row.code;
  if (rowCode) {
    const exact = existingProducts.find(
      (p) => p.code && p.code.toLowerCase() === rowCode.toLowerCase(),
    );
    if (exact) {
      return { isDuplicate: true, matchedBy: 'code', existingName: exact.name, similarity: 1 };
    }
  }

  // Exact barcode match
  const rowBarcode = row.barcode;
  if (rowBarcode) {
    const exact = existingProducts.find(
      (p) => p.barcode && p.barcode.toLowerCase() === rowBarcode.toLowerCase(),
    );
    if (exact) {
      return { isDuplicate: true, matchedBy: 'barcode', existingName: exact.name, similarity: 1 };
    }
  }

  // Fuzzy name match
  let bestSim = 0;
  let bestName: string | null = null;
  for (const p of existingProducts) {
    const sim = similarity(row.name, p.name);
    if (sim > bestSim) {
      bestSim = sim;
      bestName = p.name;
    }
  }

  if (bestSim >= 0.88) {
    return { isDuplicate: true, matchedBy: 'name', existingName: bestName, similarity: bestSim };
  }

  return { isDuplicate: false, matchedBy: null, existingName: bestName, similarity: bestSim };
}
