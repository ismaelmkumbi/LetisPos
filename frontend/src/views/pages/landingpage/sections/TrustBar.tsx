import React from 'react';
import { Box, Container, Typography, Stack } from '@mui/material';
import {
  IconBuildingStore,
  IconBuildingWarehouse,
  IconDeviceMobile,
  IconPill,
  IconShirt,
  IconToolsKitchen2,
} from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';

const capabilities = [
  { label: 'Mlimani Mart', value: 'Mini market', icon: <IconBuildingStore size={18} /> },
  { label: 'Afya Pharmacy', value: 'Pharmacy', icon: <IconPill size={18} /> },
  { label: 'Urban Electronics', value: 'Electronics', icon: <IconDeviceMobile size={18} /> },
  { label: 'Zanzi Fashion', value: 'Boutique', icon: <IconShirt size={18} /> },
  { label: 'Kijiji Kitchen', value: 'Restaurant', icon: <IconToolsKitchen2 size={18} /> },
  { label: 'Mwanza Wholesale', value: 'Warehouse', icon: <IconBuildingWarehouse size={18} /> },
];

const TrustBar: React.FC = () => {
  return (
    <SectionWrapper id="trusted" sx={{ py: { xs: 5, md: 6 }, borderBottom: '1px solid var(--lp-border)' }}>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2, md: 4 }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-body)',
                fontSize: '0.78rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 0,
                color: 'var(--lp-accent)',
                mb: 0.7,
              }}
            >
              Trusted by growing retail teams
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--lp-font-display)',
                fontSize: { xs: '1.35rem', md: '1.75rem' },
                fontWeight: 800,
                lineHeight: 1.2,
                maxWidth: 520,
              }}
            >
              Built for the counters, shelves, branches, and managers who need clear numbers now.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.25} alignItems="center">
            {['IM', 'AN', 'SK', 'JT'].map((avatar, index) => (
              <Box
                key={avatar}
                sx={{
                  width: 38,
                  height: 38,
                  ml: index === 0 ? 0 : -1.6,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  border: '2px solid var(--lp-bg)',
                  bgcolor: ['#16A34A', '#2563EB', '#C2410C', '#7C3AED'][index],
                  color: '#FFFFFF',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                }}
              >
                {avatar}
              </Box>
            ))}
            <Typography sx={{ color: 'var(--lp-text-muted)', fontSize: '0.82rem', fontWeight: 700 }}>
              operators already onboarded
            </Typography>
          </Stack>
        </Stack>
        <Stack
          direction="row"
          spacing={0}
          flexWrap="wrap"
          useFlexGap
          sx={{ gap: 1.2 }}
        >
          {capabilities.map((cap) => (
            <Box
              key={cap.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.1,
                minWidth: { xs: 'calc(50% - 6px)', sm: 180 },
                px: 1.4,
                py: 1.2,
                borderRadius: '12px',
                bgcolor: 'var(--lp-surface)',
                border: '1px solid var(--lp-border)',
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '10px',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--lp-accent)',
                  bgcolor: 'var(--lp-accent-soft)',
                  flexShrink: 0,
                }}
              >
                {cap.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-display)',
                  fontSize: '0.875rem',
                  fontWeight: 800,
                  color: 'var(--lp-text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {cap.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--lp-font-body)',
                  fontSize: '0.75rem',
                  color: 'var(--lp-text-muted)',
                }}
              >
                {cap.value}
              </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Container>
    </SectionWrapper>
  );
};

export default TrustBar;
