import { useState } from 'react';
import { Box, Card, Stack, Tab, Tabs, Typography } from '@mui/material';
import {
  IconChartDots3,
  IconListDetails,
  IconSettings2,
  IconShieldCheck,
} from '@tabler/icons-react';
import PageHeader from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import PlanComparison from './PlanComparison';
import FeatureCatalog from './FeatureCatalog';
import TenantUserOverrides from './TenantUserOverrides';

const tabs = [
  {
    label: 'Plans',
    description: 'Drag features into plans',
    icon: <IconChartDots3 size={18} />,
  },
  {
    label: 'Catalog',
    description: 'Define feature flags',
    icon: <IconListDetails size={18} />,
  },
  {
    label: 'Overrides',
    description: 'Grant or deny per tenant',
    icon: <IconShieldCheck size={18} />,
  },
];

export default function FeatureManager() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Feature Manager"
        subtitle="Control plan entitlements, feature flags, menu access, and tenant exceptions from one operations workspace."
        badge={{ label: 'Admin', tone: 'primary' }}
        status={{ state: 'active', label: 'Live controls' }}
      />

      <Card
        elevation={0}
        sx={{
          border: `1px solid ${brand.neutral[200]}`,
          borderRadius: '12px',
          overflow: 'hidden',
          bgcolor: '#FFFFFF',
        }}
      >
        <Box
          sx={{
            borderBottom: `1px solid ${brand.neutral[200]}`,
            bgcolor: brand.neutral[50],
            px: { xs: 1, sm: 1.5 },
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Feature manager sections"
            sx={{
              minHeight: 68,
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                bgcolor: brand.primary[600],
              },
              '& .MuiTab-root': {
                minHeight: 68,
                alignItems: 'flex-start',
                textTransform: 'none',
                color: brand.neutral[500],
                fontWeight: 800,
                px: { xs: 1.5, sm: 2.25 },
              },
              '& .Mui-selected': {
                color: brand.primary[700],
              },
            }}
          >
            {tabs.map((item) => (
              <Tab
                key={item.label}
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ display: 'flex' }}>{item.icon}</Box>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography sx={{ fontWeight: 850, fontSize: '0.9rem', lineHeight: 1.1 }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ color: 'inherit', opacity: 0.68, fontSize: '0.72rem', mt: 0.35 }}>
                        {item.description}
                      </Typography>
                    </Box>
                  </Stack>
                }
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{
              mb: 2.5,
              p: 1.5,
              borderRadius: '10px',
              border: `1px solid ${brand.neutral[200]}`,
              bgcolor: brand.primary[50],
            }}
          >
            <Box sx={{ color: brand.primary[700], display: 'flex', mt: 0.2 }}>
              <IconSettings2 size={19} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 850, color: brand.neutral[900], fontSize: '0.92rem' }}>
                Changes apply to live navigation and feature gates.
              </Typography>
              <Typography sx={{ color: brand.neutral[600], fontWeight: 600, fontSize: '0.82rem', mt: 0.35 }}>
                Keep plan rules broad, then use overrides only for exceptions that need audit visibility.
              </Typography>
            </Box>
          </Stack>

          {tab === 0 && <PlanComparison />}
          {tab === 1 && <FeatureCatalog />}
          {tab === 2 && <TenantUserOverrides />}
        </Box>
      </Card>
    </Box>
  );
}
