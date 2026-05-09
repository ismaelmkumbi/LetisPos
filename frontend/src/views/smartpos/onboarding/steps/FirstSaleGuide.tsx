import { Box, Button, Stack, Typography } from '@mui/material';
import {
  IconArrowRight,
  IconCircleNumber1,
  IconCircleNumber2,
  IconCircleNumber3,
  IconShoppingCart,
  IconTruck,
} from '@tabler/icons-react';
import { Link } from 'react-router';
import { brand } from 'src/theme/smartpos/brand';

interface Props {
  onComplete: () => void;
}

export default function FirstSaleGuide({ onComplete }: Props) {
  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.5 }}>
        Ready to make your first sale?
      </Typography>
      <Typography sx={{ color: brand.neutral[500], fontSize: 14, mb: 3 }}>
        Follow these steps to start selling. Stock up first — you can't sell what you don't have.
      </Typography>

      <Stack spacing={2.5}>
        {/* Stock-up warning card */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: '12px',
            bgcolor: '#FFFBEB',
            border: `1px solid ${brand.warning.light}`,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <IconTruck size={22} color={brand.warning.main} style={{ marginTop: 2 }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 14, color: brand.neutral[900], mb: 0.5 }}>
                Stock up first
              </Typography>
              <Typography sx={{ fontSize: 13, color: brand.neutral[600], mb: 1.5 }}>
                You need products in stock before you can sell. Import opening stock or record a purchase.
              </Typography>
              <Button
                component={Link}
                to="/smartpos/purchases/new"
                variant="outlined"
                size="small"
                endIcon={<IconArrowRight size={16} />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '8px',
                  borderColor: brand.warning.main,
                  color: brand.warning.main,
                  '&:hover': { borderColor: brand.warning.main, bgcolor: brand.warning.light },
                }}
              >
                Add Stock
              </Button>
            </Box>
          </Stack>
        </Box>

        {/* How selling works — 3-step guide */}
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 14, color: brand.neutral[700], mb: 1.5 }}>
            How selling works
          </Typography>

          <Stack spacing={1.5}>
            <StepRow
              icon={<IconCircleNumber1 size={22} />}
              title="Open the POS terminal"
              description="Launch the point-of-sale screen — this is where you record sales."
            />
            <StepRow
              icon={<IconCircleNumber2 size={22} />}
              title="Add items to cart"
              description="Scan barcodes or search and select products. Adjust quantities as needed."
            />
            <StepRow
              icon={<IconCircleNumber3 size={22} />}
              title="Accept payment & complete"
              description="Choose cash, mobile money, or card. Confirm and print the receipt."
            />
          </Stack>
        </Box>

        {/* Actions */}
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
              Start selling right away
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
            <Typography sx={{ fontWeight: 700 }}>I'll do this later</Typography>
            <Typography sx={{ fontSize: 12, color: brand.neutral[500] }}>
              Go straight to the dashboard
            </Typography>
          </Box>
        </Button>
      </Stack>
    </Box>
  );
}

function StepRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box sx={{ color: brand.primary[500], flexShrink: 0, mt: 0.25 }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: 13, color: brand.neutral[900] }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 12, color: brand.neutral[500] }}>
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}
