import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, CardHeader, TextField, Divider,
  Stack, FormControl, InputLabel, Select, MenuItem, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControlLabel, Switch, Autocomplete, Typography,
} from '@mui/material';
import { IconPrinter, IconTrash } from '@tabler/icons-react';
import { listWarehouses } from 'src/api/smartpos/inventory';
import { listProducts } from 'src/api/smartpos/products';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import type { Product, UUID } from 'src/api/smartpos/types';

const cardSx = {
  border: `1px solid ${brand.neutral[200]}`,
  borderRadius: '8px',
  bgcolor: '#fff',
  boxShadow: `0 1px 2px ${brand.neutral[900]}08, 0 24px 60px -44px ${brand.neutral[900]}55`,
} as const;

interface LabelProduct {
  code: string;
  barcode: string;
  name: string;
  price: number;
  qty: number;
}

const PAPER_SIZES = [
  { label: '40 per sheet (A4) (1.799" × 1.003")',   value: 'style40', perSheet: 40 },
  { label: '30 per sheet (2.625" × 1")',              value: 'style30', perSheet: 30 },
  { label: '24 per sheet (A4) (2.48" × 1.334")',      value: 'style24', perSheet: 24 },
  { label: '20 per sheet (4" × 1")',                   value: 'style20', perSheet: 20 },
  { label: '18 per sheet (A4) (2.5" × 1.835")',       value: 'style18', perSheet: 18 },
  { label: '14 per sheet (4" × 1.33")',                value: 'style14', perSheet: 14 },
  { label: '12 per sheet (A4) (2.5" × 2.834")',       value: 'style12', perSheet: 12 },
  { label: '10 per sheet (4" × 2")',                   value: 'style10', perSheet: 10 },
];

/** Escape HTML entities for safe injection into the print document. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function PrintLabelsPage() {
  const [warehouses, setWarehouses] = useState<{ id: UUID; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [paperSize, setPaperSize] = useState('style40');
  const [showPrice, setShowPrice] = useState(true);
  const [selected, setSelected] = useState<LabelProduct[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [productOptions, setProductOptions] = useState<Product[]>([]);

  // Intentionally runs once on mount — warehouseId is only checked to avoid
  // overwriting a pre-selected warehouse; adding it as a dep would re-create
  // the Audio element on every change.
  useEffect(() => {
    listWarehouses().then((ws) => {
      setWarehouses(ws);
      if (ws.length > 0 && !warehouseId) setWarehouseId(ws[0].id);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProductSearch = useCallback(async (query: string) => {
    if (query.length < 2) { setProductOptions([]); return; }
    try {
      const p = await listProducts({ search: query, page: 0, size: 20 });
      setProductOptions(p.content);
    } catch { /* silent */ }
  }, []);

  const addProduct = (product: Product) => {
    setSelected((prev) => {
      const exist = prev.find((p) => p.code === product.code);
      if (exist) {
        return prev.map((p) => p.code === product.code ? { ...p, qty: p.qty + 1 } : p);
      }
      const primaryBarcode = product.barcodes?.find((b) => b.primary)?.barcode
        || product.barcodes?.[0]?.barcode
        || product.code;
      return [...prev, {
        code: product.code, barcode: primaryBarcode, name: product.name,
        price: product.price, qty: 1,
      }];
    });
    setSearchInput('');
    setProductOptions([]);
  };

  const removeProduct = (code: string) => {
    setSelected((prev) => prev.filter((p) => p.code !== code));
  };

  const updateQty = (code: string, qty: number) => {
    setSelected((prev) => prev.map((p) => p.code === code ? { ...p, qty: Math.max(1, qty) } : p));
  };

  const perSheet = PAPER_SIZES.find((s) => s.value === paperSize)?.perSheet || 40;

  const generateBarcodePages = (): LabelProduct[][] => {
    const all: LabelProduct[] = [];
    selected.forEach((p) => {
      for (let i = 0; i < p.qty; i++) all.push({ ...p });
    });
    const pages: LabelProduct[][] = [];
    while (all.length > 0) pages.push(all.splice(0, perSheet));
    return pages;
  };

  const handlePrint = () => {
    const pages = generateBarcodePages();
    if (pages.length === 0) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    const barcodeItems = pages.flatMap((page) =>
      page.map(
        (item) => `
          <div class="barcode-cell">
            <div class="barcode-name">${escapeHtml(item.name)}</div>
            ${showPrice ? `<div class="barcode-price">${escapeHtml(item.price.toFixed(2))}</div>` : ''}
            <div class="barcode-image">${item.barcode}</div>
            <div class="barcode-code">${escapeHtml(item.barcode)}</div>
          </div>
        `
      )
    );

    const perRow = paperSize.includes('40') || paperSize.includes('24') || paperSize.includes('18') || paperSize.includes('12') ? 5
      : paperSize.includes('30') || paperSize.includes('14') || paperSize.includes('10') ? 4 : 5;

    printWindow.document.write(`
      <html><head>
        <style>
          @page { margin: 0.5in; }
          body { font-family: 'Courier New', monospace; margin: 0; padding: 0; }
          .barcode-grid {
            display: grid;
            grid-template-columns: repeat(${perRow}, 1fr);
            gap: 2px;
            padding: 2px;
          }
          .barcode-cell {
            border: 0.5px solid #ccc;
            padding: 4px;
            text-align: center;
            page-break-inside: avoid;
            overflow: hidden;
          }
          .barcode-name { font-size: 8px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .barcode-price { font-size: 9px; color: #333; font-weight: bold; }
          .barcode-image { font-size: 10px; margin: 2px 0; letter-spacing: 1px; }
          .barcode-code { font-size: 7px; color: #666; }
        </style>
      </head><body>
        <div class="barcode-grid">
          ${barcodeItems.join('\n')}
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const totalLabels = selected.reduce((s, p) => s + p.qty, 0);

  return (
    <Box>
      <PageHeader
        title="Print Barcode Labels"
        subtitle="Select products, set quantities, choose paper size, and print"
        badge={selected.length ? { label: `${selected.length} product(s) · ${totalLabels} labels · ${Math.ceil(totalLabels / perSheet)} page(s)`, tone: 'primary' } : undefined}
        actions={[{
          label: 'Print Labels',
          icon: <IconPrinter size={18} />,
          onClick: handlePrint,
          variant: 'primary',
        }]}
      />

      <Stack spacing={3}>
        {/* Configuration */}
        <Card sx={cardSx}>
          <CardHeader
            title="Configuration"
            titleTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
          />
          <Divider />
          <CardContent sx={{ pt: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Warehouse</InputLabel>
                <Select value={warehouseId} label="Warehouse" onChange={(e) => setWarehouseId(e.target.value)}>
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 240 }}>
                <InputLabel>Paper Size</InputLabel>
                <Select value={paperSize} label="Paper Size" onChange={(e) => setPaperSize(e.target.value)}>
                  {PAPER_SIZES.map((s) => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={<Switch checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />}
                label={<Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>Show price</Typography>}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Product search */}
        <Card sx={cardSx}>
          <CardHeader
            title="Add Products"
            titleTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
          />
          <Divider />
          <CardContent sx={{ pt: 2.5 }}>
            <Autocomplete
              options={productOptions}
              getOptionLabel={(o) => `${o.code} — ${o.name}`}
              inputValue={searchInput}
              onInputChange={(_, v) => {
                setSearchInput(v);
                handleProductSearch(v);
              }}
              onChange={(_, value) => { if (value) addProduct(value); }}
              renderInput={(params) => (
                <TextField {...params} size="small" placeholder="Search product by code or name..." />
              )}
              noOptionsText={searchInput.length < 2 ? 'Type at least 2 characters' : 'No products found'}
              sx={{ maxWidth: 500 }}
            />
          </CardContent>
        </Card>

        {/* Selected products */}
        {selected.length > 0 && (
          <Card sx={cardSx}>
            <CardHeader
              title={`${selected.length} product(s) selected`}
              titleTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
              subheader={`${totalLabels} labels · ${Math.ceil(totalLabels / perSheet)} page(s)`}
              subheaderTypographyProps={{ color: brand.neutral[500], fontSize: '0.8125rem' }}
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: brand.neutral[700], fontSize: '0.75rem' }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: brand.neutral[700], fontSize: '0.75rem' }}>Code</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: brand.neutral[700], fontSize: '0.75rem' }}>Barcode</TableCell>
                      <TableCell align="center" sx={{ minWidth: 100, fontWeight: 700, color: brand.neutral[700], fontSize: '0.75rem' }}>Qty</TableCell>
                      <TableCell width={50} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selected.map((p) => (
                      <TableRow key={p.code} sx={{ '&:hover': { bgcolor: brand.neutral[50] } }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{p.name}</TableCell>
                        <TableCell sx={{ fontFamily: 'ui-monospace', fontSize: '0.8125rem' }}>{p.code}</TableCell>
                        <TableCell sx={{ fontFamily: 'ui-monospace', fontSize: '0.75rem' }}>{p.barcode}</TableCell>
                        <TableCell align="center">
                          <TextField
                            size="small" type="number" value={p.qty}
                            onChange={(e) => updateQty(p.code, parseInt(e.target.value) || 1)}
                            slotProps={{ htmlInput: { min: 1, style: { textAlign: 'center', width: 60 } } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="error" onClick={() => removeProduct(p.code)}
                                      sx={{ borderRadius: '8px', p: 0.5 }}>
                            <IconTrash size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
