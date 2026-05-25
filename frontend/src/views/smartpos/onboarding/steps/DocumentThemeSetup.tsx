import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { IconFileInvoice, IconRefresh } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';
import { previewMockDocument, type MockDocumentPreview } from 'src/api/smartpos/brand';

interface Props {
  onComplete: () => void;
}

/**
 * Live preview of how the tenant's documents (invoices, receipts) will
 * look — using the synthetic-data endpoint so no real sale is required.
 * This is the moment the tenant "sees their brand on paper" during setup,
 * which is the biggest psychological hook in the wizard.
 */
export default function DocumentThemeSetup({ onComplete }: Props) {
  const [preview, setPreview] = useState<MockDocumentPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await previewMockDocument('tax-invoice', 'typical');
      setPreview(data);
    } catch {
      setError('Could not load the preview. Continue anyway and tweak the theme later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <IconFileInvoice size={20} color={brand.primary[600]} />
        <Typography sx={{ fontWeight: 800, fontSize: 18 }}>How your invoice looks</Typography>
      </Stack>
      <Typography sx={{ color: brand.neutral[500], fontSize: 14, mb: 2 }}>
        This is a sample using your brand. Adjust colours in Settings → Brand Identity
        if anything feels off.
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      {loading && <Typography sx={{ color: brand.neutral[500], py: 4 }}>Loading preview…</Typography>}

      {preview && (
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: '12px',
            borderTop: `4px solid ${preview.brand.primaryColor}`,
            fontFamily: preview.brand.fontFamily || 'inherit',
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 16, color: preview.brand.primaryColor }}>
                {preview.brand.businessName}
              </Typography>
              {preview.brand.tagline && (
                <Typography sx={{ fontSize: 11, color: brand.neutral[500] }}>
                  {preview.brand.tagline}
                </Typography>
              )}
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                {preview.documentType.toUpperCase().replace('-', ' ')}
              </Typography>
              <Typography sx={{ fontSize: 11, color: brand.neutral[500] }}>
                #{preview.documentNumber}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ mb: 1.5 }} />

          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5, fontSize: 11 }}>
            <Box>
              <Typography sx={{ fontSize: 10, color: brand.neutral[500] }}>Bill to</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{preview.customer.name}</Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: 10, color: brand.neutral[500] }}>Date</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{preview.issueDate}</Typography>
            </Box>
          </Stack>

          <Table size="small" sx={{ mb: 1.5 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Item</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>Qty</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>Price</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {preview.lines.map((l, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ fontSize: 11 }}>{l.name}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 11 }}>{l.quantity}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 11 }}>{l.unitPrice}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 11 }}>{l.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack alignItems="flex-end" spacing={0.5} sx={{ fontSize: 11 }}>
            <Typography sx={{ fontSize: 11 }}>
              Subtotal: <strong>{preview.totals.subtotal} {preview.currency}</strong>
            </Typography>
            <Typography sx={{ fontSize: 11 }}>
              Tax ({preview.totals.taxRate}): {preview.totals.taxAmount} {preview.currency}
            </Typography>
            <Typography
              sx={{ fontSize: 13, fontWeight: 800, color: preview.brand.primaryColor }}
            >
              Total: {preview.totals.grandTotal} {preview.currency}
            </Typography>
          </Stack>

          <Typography
            sx={{ fontSize: 10, color: brand.neutral[400], mt: 2, fontStyle: 'italic' }}
          >
            {preview.notice}
          </Typography>
        </Paper>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          onClick={load}
          startIcon={<IconRefresh size={16} />}
          sx={{ textTransform: 'none', fontWeight: 700, color: brand.neutral[700] }}
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          onClick={onComplete}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            bgcolor: brand.primary[600],
            '&:hover': { bgcolor: brand.primary[700] },
            borderRadius: '10px',
            px: 3,
          }}
        >
          Looks good — continue
        </Button>
      </Box>
    </Box>
  );
}
