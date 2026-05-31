import { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { IconSparkles, IconPlus } from '@tabler/icons-react';
import { brand } from 'src/theme/smartpos/brand';
import { api } from 'src/api/smartpos/client';
import ProductsImportDialog from 'src/views/smartpos/products/ProductsImportDialog';

interface Props {
  onComplete: () => void;
}

export default function ProductImportSetup({ onComplete }: Props) {
  const [importOpen, setImportOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.get('/api/v1/products?size=1').then(({ data }) => {
      const total = data?.totalElements ?? (Array.isArray(data) ? data.length : 0);
      if (total > 0) onComplete(); // Already has products — skip
    }).catch(() => {}).finally(() => setChecking(false));
  }, [onComplete]);

  if (checking) {
    return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={32} /></Box>;
  }

  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.5 }}>
        Get your products into Letis
      </Typography>
      <Typography sx={{ color: brand.neutral[500], fontSize: 14, mb: 3 }}>
        The fastest way is Smart Import. Upload an Excel sheet, PDF, or even photos — smart mapping prepares everything for you.
      </Typography>

      <Stack spacing={2}>
        <Button
          variant="contained"
          startIcon={<IconSparkles size={18} />}
          onClick={() => setImportOpen(true)}
          sx={{
            justifyContent: 'flex-start',
            py: 2,
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 15,
            bgcolor: brand.primary[600],
          }}
        >
          <Box sx={{ textAlign: 'left' }}>
            <Typography sx={{ fontWeight: 700 }}>Smart Import</Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.85 }}>
              Upload Excel, PDF, or photos — smart mapping prepares the fields
            </Typography>
          </Box>
        </Button>

        <Button
          variant="outlined"
          startIcon={<IconPlus size={18} />}
          onClick={onComplete}
          sx={{
            justifyContent: 'flex-start',
            py: 2,
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 15,
            borderColor: brand.neutral[200],
            color: brand.neutral[700],
          }}
        >
          <Box sx={{ textAlign: 'left' }}>
            <Typography sx={{ fontWeight: 700 }}>Add products manually</Typography>
            <Typography sx={{ fontSize: 12, color: brand.neutral[500] }}>
              I will add them one by one later
            </Typography>
          </Box>
        </Button>
      </Stack>

      <ProductsImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setImportOpen(false);
          onComplete();
        }}
      />
    </Box>
  );
}
