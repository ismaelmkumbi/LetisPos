import { useState, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, CardHeader, Typography, Alert,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Chip, Divider,
} from '@mui/material';
import { IconUpload, IconDownload, IconTrash, IconCheck } from '@tabler/icons-react';
import { importUpdateOnly, type ImportUpdateOnlyItem } from 'src/api/smartpos/products';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

const cardSx = {
  border: `1px solid ${brand.neutral[200]}`,
  borderRadius: '14px',
  bgcolor: '#fff',
  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
} as const;

interface ParsedRow extends ImportUpdateOnlyItem {
  id: number;
}

export default function ImportUpdateOnlyPage() {
  const [items, setItems] = useState<ParsedRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    success: boolean; updated?: number; notFound?: number; errors?: number; message: string;
  } | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      setResult({ success: false, message: 'File is empty or has no data rows.' });
      return;
    }
    const parsed: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 3) continue;
      parsed.push({
        id: i,
        productCode: cols[0],
        cost: parseFloat(cols[1]) || 0,
        retailPrice: parseFloat(cols[2]) || 0,
      });
    }
    setItems(parsed);
    setResult(null);
  }, []);

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setProgress(50);
    try {
      const res = await importUpdateOnly(items.map(({ productCode, cost, retailPrice }) => ({
        productCode, cost, retailPrice,
      })));
      setProgress(100);
      setResult({
        success: res.errors === 0,
        updated: res.updated,
        notFound: res.notFound,
        errors: res.errors,
        message: `Updated ${res.updated} of ${res.total} products. ${res.notFound > 0 ? `${res.notFound} codes not found. ` : ''}${res.errors > 0 ? `${res.errors} errors.` : ''}`,
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
        title="Import (Update Only)"
        subtitle="Update cost and retail price for existing products from a CSV file"
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
              <Box
                sx={{
                  border: '2px dashed', borderColor: brand.neutral[300],
                  borderRadius: '12px', p: 4, textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  bgcolor: brand.neutral[50],
                  '&:hover': { borderColor: brand.primary[400], bgcolor: brand.primary[50] },
                }}
                onClick={() => document.getElementById('update-csv-input')?.click()}
              >
                <input
                  id="update-csv-input" type="file" accept=".csv,.xlsx,.xls" hidden
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
                  Required columns: code, cost, retail_price
                </Typography>
              </Box>

              <Button size="small" variant="outlined" startIcon={<IconDownload size={14} />}
                      href="/import/examples/update_products.csv" target="_blank"
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
                <Button size="small" variant="contained" disabled={submitting} onClick={handleSubmit}
                        sx={{ borderRadius: '8px', fontWeight: 700 }}>
                  {submitting ? 'Updating...' : 'Update Products'}
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
                      <TableCell align="right" sx={{ fontWeight: 700, color: brand.neutral[700], fontSize: '0.75rem' }}>Cost</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: brand.neutral[700], fontSize: '0.75rem' }}>Retail Price</TableCell>
                      <TableCell width={50} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((i) => (
                      <TableRow key={i.id} sx={{ '&:hover': { bgcolor: brand.neutral[50] } }}>
                        <TableCell sx={{ fontFamily: 'ui-monospace', fontWeight: 600, fontSize: '0.8125rem' }}>{i.productCode}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{i.cost.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{i.retailPrice.toFixed(2)}</TableCell>
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
            icon={<IconCheck size={18} />}
            onClose={() => setResult(null)}
            sx={{ borderRadius: '10px' }}
          >
            <Typography variant="body2" fontWeight={600}>{result.message}</Typography>
            {result.updated !== undefined && (
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip size="small" label={`Updated: ${result.updated}`}
                      sx={{ bgcolor: brand.success.light, color: brand.success.dark, fontWeight: 700, fontSize: '0.6875rem', borderRadius: '6px' }} />
                {result.notFound && result.notFound > 0 && (
                  <Chip size="small" label={`Not found: ${result.notFound}`}
                        sx={{ bgcolor: brand.warning.light, color: brand.warning.dark, fontWeight: 700, fontSize: '0.6875rem', borderRadius: '6px' }} />
                )}
                {result.errors && result.errors > 0 && (
                  <Chip size="small" label={`Errors: ${result.errors}`}
                        sx={{ bgcolor: brand.error.light, color: brand.error.dark, fontWeight: 700, fontSize: '0.6875rem', borderRadius: '6px' }} />
                )}
              </Stack>
            )}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
