import React from 'react';
import { Box, Container, Typography, Grid } from '@mui/material';
import {
  IconCashRegister,
  IconPackages,
  IconCalculator,
  IconTruck,
  IconReportAnalytics,
  IconBrain,
  IconUsers,
  IconBuildingStore,
} from '@tabler/icons-react';
import SectionWrapper from '../components/SectionWrapper';

const modules = [
  {
    icon: <IconCashRegister size={28} strokeWidth={1.5} />,
    title: 'Point of Sale',
    description: 'Fast checkout, barcode scanning, customer display, and receipt printing — online or offline.',
    color: '#4ADE80',
  },
  {
    icon: <IconPackages size={28} strokeWidth={1.5} />,
    title: 'Inventory Management',
    description: 'Track stock across every warehouse, serial number, and shelf in real time.',
    color: '#3B82F6',
  },
  {
    icon: <IconCalculator size={28} strokeWidth={1.5} />,
    title: 'Accounting',
    description: 'Double-entry ledger, chart of accounts, journal entries, and financial statements.',
    color: '#8B5CF6',
  },
  {
    icon: <IconTruck size={28} strokeWidth={1.5} />,
    title: 'Purchases & Suppliers',
    description: 'Purchase orders, supplier management, and procurement workflow from order to payment.',
    color: '#F59E0B',
  },
  {
    icon: <IconReportAnalytics size={28} strokeWidth={1.5} />,
    title: 'Reports & Analytics',
    description: 'Sales, inventory, tax, customer, and payment reports — filterable and exportable.',
    color: '#EF4444',
  },
  {
    icon: <IconBrain size={28} strokeWidth={1.5} />,
    title: 'AI Insights',
    description: 'Smart predictions, reorder alerts, trend detection, and automated report summaries.',
    color: '#06B6D4',
  },
  {
    icon: <IconUsers size={28} strokeWidth={1.5} />,
    title: 'HRM & Payroll',
    description: 'Employee records, attendance tracking, leave management, and payroll processing.',
    color: '#EC4899',
  },
  {
    icon: <IconBuildingStore size={28} strokeWidth={1.5} />,
    title: 'Multi-store Management',
    description: 'Centralized control across unlimited locations with consolidated reporting.',
    color: '#14B8A6',
  },
];

const ModulesGrid: React.FC = () => {
  return (
    <SectionWrapper id="features">
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-display)',
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 700,
              letterSpacing: '-0.02em',
              mb: 2,
            }}
          >
            Everything included
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--lp-font-body)',
              fontSize: '1.125rem',
              color: 'var(--lp-text-muted)',
              maxWidth: 560,
              mx: 'auto',
            }}
          >
            All core modules included. Advanced features unlock as you scale.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {modules.map((mod) => (
            <Grid key={mod.title} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Box
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: 2,
                  bgcolor: 'var(--lp-surface)',
                  border: '1px solid var(--lp-border)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'var(--lp-surface-hover)',
                    transform: 'translateY(-2px)',
                    borderColor: mod.color,
                  },
                }}
              >
                <Box sx={{ color: mod.color, mb: 2 }}>{mod.icon}</Box>
                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-display)',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  {mod.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'var(--lp-font-body)',
                    fontSize: '0.875rem',
                    color: 'var(--lp-text-muted)',
                    lineHeight: 1.6,
                  }}
                >
                  {mod.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </SectionWrapper>
  );
};

export default ModulesGrid;
