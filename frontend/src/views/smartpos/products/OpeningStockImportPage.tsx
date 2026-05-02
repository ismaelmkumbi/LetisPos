import { useState, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, CardHeader, Typography, Alert,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, LinearProgress, Divider,
} from '@mui/material';
import { IconUpload, IconDownload, IconTrash, IconFileDescription } from '@tabler/icons-react';
import { listWarehouses } from 'src/api/smartpos/inventory';
import { importOpeningStock } from 'src/api/smartpos/products';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import type { UUID } from 'src/api/smartpos/types';

const cardSx = {
  border: `1px solid ${brand.neutral[200]}`,
  borderRadius: '14px',
  bgcolor: '#fff',
  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
} as const;

interface RowItem {
  id: number;
  productCode: string;
  variantCode: string;
  qty: number;
}

export default function OpeningStockImportPage() {
  const [warehouses, setWarehouses] = useState<{ id: UUID; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState<RowItem[]>([]);
  const [warehouseLoaded, setWarehouseLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!warehouseLoaded) {
    listWarehouses().then((ws) => { setWarehouses(ws); setWarehouseLoaded(true); }).catch(() => {});
  }

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      setResult({ success: false, message: 'File is empty or has no data rows.' });
      return;
    }
    const parsed: RowItem[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;
      parsed.push({
        id: i,
        productCode: cols[0],
        variantCode: cols.length > 2 ? cols[1] : '',
        qty: parseFloat(cols[cols.length > 2 ? 2 : 1]) || 1,
      });
    }
    setItems(parsed);
    setResult(null);
  }, []);

  const handleSubmit = async () => {
    if (!warehouseId || items.length === 0) return;
    setSubmitting(true);
    setProgress(50);
    try {
      const res = await importOpeningStock(warehouseId as UUID, items.map((i) => ({
        productCode: i.productCode,
        variantCode: i.variantCode || undefined,
        qty: i.qty,
      })));
      setProgress(100);
      setResult({
        success: res.errors === 0,
        message: `Updated ${res.updated} of ${res.total} products. ${res.notFound > 0 ? `${res.notFound} not found. ` : ''}${res.errors > 0 ? `${res.errors} errors.` : ''}`,
      });
    } catch {
      setResult({ success: false, message: 'Import failed. Check your file and try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const removeItem = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <Box>
      <PageHeader
        title="Opening Stock Import"
        subtitle="Add initial quantities from a CSV file (columns: product_code, [variant_code,] qty)"
      />

      <Stack spacing={3}>
        <Card sx={cardSx}>
          <CardHeader
            title="Upload File"
            titleTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
          />
          <Divider />
          <CardContent sx={{ pt: 2.5 }}>
            <Stack spacing={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Warehouse *</InputLabel>
                <Select value={warehouseId} label="Warehouse *" onChange={(e) => setWarehouseId(e.target.value)}>
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box
                sx={{
                  border: '2px dashed', borderColor: brand.neutral[300],
                  borderRadius: '12px', p: 4, textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  bgcolor: brand.neutral[50],
                  '&:hover': { borderColor: brand.primary[400], bgcolor: brand.primary[50] },
                }}
                onClick={() => document.getElementById('csv-file-input')?.click()}
              >
                <input
                  id="csv-file-input" type="file" accept=".csv,.xlsx,.xls" hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                />
                <IconUpload size={32} color={brand.neutral[400]} />
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, color: brand.neutral[700] }}>
                  Click or drop a CSV/Excel file here
                </Typography>
                <Typography variant="caption" sx={{ color: brand.neutral[500] }}>
                  Columns: product_code, [variant_code,] qty
                </Typography>
              </Box>

              <Button size="small" variant="outlined" startIcon={<IconDownload size={14} />}
                      href="/import/examples/opening_stock_single.csv" target="_blank"
                      sx={{ alignSelf: 'flex-start', borderRadius: '8px', fontWeight: 600 }}>
                Download example
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {items.length > 0 && (
          <Card sx={cardSx}>
            <CardHeader
              title={`${items.length} items loaded`}
              titleTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
              action={
                <Button size="small" variant="contained" disabled={!warehouseId || submitting} onClick={handleSubmit}
                        sx={{ borderRadius: '8px', fontWeight: 700 }}>
                  {submitting ? 'Importing...' : 'Import Now'}
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: brand.neutral[700], fontSize: '0.75rem' }}>Product Code</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: brand.neutral[700], fontSize: '0.75rem' }}>Variant Code</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: brand.neutral[700], fontSize: '0.75rem' }}>Qty</TableCell>
                      <TableCell width={50} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((i) => (
                      <TableRow key={i.id} sx={{ '&:hover': { bgcolor: brand.neutral[50] } }}>
                        <TableCell sx={{ fontFamily: 'ui-monospace', fontWeight: 600, fontSize: '0.8125rem' }}>{i.productCode}</TableCell>
                        <TableCell sx={{ fontFamily: 'ui-monospace', fontSize: '0.8125rem' }}>{i.variantCode || '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{i.qty}</TableCell>
                        <TableCell>
                          <Button size="small" color="error" onClick={() => removeItem(i.id)}
                                  sx={{ minWidth: 32, borderRadius: '6px', p: 0.5 }}>
                            <IconTrash size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {submitting && (
          <LinearProgress
            variant="determinate" value={progress}
            sx={{
              height: 6, borderRadius: '3px',
              bgcolor: brand.neutral[100],
              '& .MuiLinearProgress-bar': { bgcolor: brand.primary[500], borderRadius: '3px' },
            }}
          />
        )}

        {result && (
          <Alert
            severity={result.success ? 'success' : 'error'}
            onClose={() => setResult(null)}
            sx={{ borderRadius: '10px', fontWeight: 600 }}
          >
            {result.message}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
