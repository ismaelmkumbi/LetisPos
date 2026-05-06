import { Box, Button, Stack, Typography } from '@mui/material';
import { IconShoppingCart } from '@tabler/icons-react';
import { Link } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  onComplete: () => void;
}

export default function FirstSaleGuide({ onComplete }: Props) {
  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.5 }}>
        You are ready to sell
      </Typography>
      <Typography sx={{ color: brand.neutral[500], fontSize: 14, mb: 3 }}>
        Open the POS screen and record your first transaction. You can come back to settings at any time.
      </Typography>

      <Stack spacing={2}>
        <Button
          component={Link}
          to="/smartpos/pos"
          variant="contained"
          startIcon={<IconShoppingCart size={18} />}
          onClick={onComplete}
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
            <Typography sx={{ fontWeight: 700 }}>Open Point of Sale</Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.85 }}>
              Start scanning or selecting products
            </Typography>
          </Box>
        </Button>

        <Button
          variant="outlined"
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
            <Typography sx={{ fontWeight: 700 }}>I will do this later</Typography>
            <Typography sx={{ fontSize: 12, color: brand.neutral[500] }}>
              Go straight to the dashboard
            </Typography>
          </Box>
        </Button>
      </Stack>
    </Box>
  );
}
