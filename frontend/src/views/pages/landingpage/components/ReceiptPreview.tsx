import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { LetisMark } from 'src/components/smartpos/BrandLogo';

const receiptItems = [
  ['Sukari Kilo', 'x7', '22.4K'],
  ['Mchele Mbeya', 'x4', '68.4K'],
  ['Unga Ngano', 'x4', '25K'],
  ['Kahawa', 'x3', '27.3K'],
  ['Mafuta 1L', 'x3', '18.6K'],
  ['Maziwa UHT', 'x5', '20.5K'],
  ['Maji 1.5L', 'x2', '3.3K'],
  ['Soda 350ml', 'x4', '5.2K'],
  ['USB Cable', 'x3', '41.4K'],
  ['Sabuni', 'x6', '15.6K'],
  ['Chai Tangawizi', 'x2', '12.8K'],
  ['Notebook A5', 'x5', '17.5K'],
];

interface ReceiptPreviewProps {
  compact?: boolean;
  rows?: number;
}

const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ compact = false, rows = 8 }) => (
  <Box sx={{ position: 'relative' }}>
    <Stack alignItems="center" spacing={compact ? 0.25 : 0.35} sx={{ mb: compact ? 0.45 : 0.75 }}>
      <LetisMark size={compact ? 16 : 24} />
      <Typography
        sx={{
          fontSize: compact ? '0.34rem' : '0.48rem',
          fontWeight: 950,
          color: '#0F172A',
          lineHeight: 1,
        }}
      >
        Letis POS
      </Typography>
    </Stack>
    <Stack
      spacing={compact ? 0.15 : 0.22}
      sx={{
        mb: compact ? 0.45 : 0.65,
        fontSize: compact ? '0.19rem' : '0.27rem',
        fontWeight: 850,
        color: '#0F172A',
        lineHeight: 1.12,
        textAlign: 'center',
      }}
    >
      <Box>Reference : INV-2026-000433</Box>
      <Box>Date : 04/05/2026, 12:32:57</Box>
      {!compact && (
        <>
          <Box>Seller : System Admin</Box>
          <Box>Customer : ismael mkumbi</Box>
          <Box>Warehouse : Main Warehouse</Box>
        </>
      )}
    </Stack>
    <Box sx={{ borderTop: '1px dotted #0F172A', borderBottom: '1px dotted #0F172A', py: 0.35 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        sx={{
          fontSize: compact ? '0.22rem' : '0.32rem',
          fontWeight: 950,
          color: '#0F172A',
          lineHeight: 1,
        }}
      >
        <Box component="span">PRODUCT</Box>
        <Box component="span">TOTAL</Box>
      </Stack>
    </Box>
    <Stack spacing={compact ? 0.28 : 0.42} sx={{ mt: compact ? 0.35 : 0.5 }}>
      {receiptItems.slice(0, rows).map(([name, meta, amount]) => (
        <Box
          key={`${name}-${rows}`}
          sx={{
            pb: compact ? 0.24 : 0.32,
            borderBottom: '1px dotted rgba(15, 23, 42, 0.62)',
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{
              gap: 0.6,
              fontSize: compact ? '0.25rem' : '0.38rem',
              lineHeight: 1.05,
              color: '#0F172A',
              fontWeight: 950,
            }}
          >
            <Box
              component="span"
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {name}
            </Box>
            <Box component="span" sx={{ flexShrink: 0 }}>
              {amount}
            </Box>
          </Stack>
          <Typography
            sx={{
              mt: 0.14,
              fontSize: compact ? '0.2rem' : '0.3rem',
              color: '#475569',
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {meta} unit x 4,100.00
          </Typography>
        </Box>
      ))}
    </Stack>
    {!compact && (
      <Stack
        spacing={0.28}
        sx={{
          mt: 0.55,
          pt: 0.4,
          borderTop: '1px dotted #0F172A',
          fontSize: '0.38rem',
          fontWeight: 950,
          color: '#0F172A',
          lineHeight: 1,
        }}
      >
        <Stack direction="row" justifyContent="space-between">
          <Box component="span">Subtotal</Box>
          <Box component="span">280,200.00</Box>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Box component="span">Total</Box>
          <Box component="span">TZS 293.8K</Box>
        </Stack>
      </Stack>
    )}
  </Box>
);

export default ReceiptPreview;
