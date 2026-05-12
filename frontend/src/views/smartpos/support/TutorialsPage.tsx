import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  IconArrowRight,
  IconBook,
  IconBuildingWarehouse,
  IconCashRegister,
  IconChartBar,
  IconGift,
  IconUsersGroup,
  IconVideo,
} from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';

interface Tutorial {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  duration: string;
  type: 'read' | 'video' | 'guide';
}

const TUTORIALS: Tutorial[] = [
  {
    title: 'Getting Started Guide',
    description: 'Set up your store, add products, and process your first sale in under 10 minutes.',
    icon: <IconBook size={24} />,
    color: brand.primary[600],
    bgColor: brand.primary[50],
    duration: '5 min read',
    type: 'read',
  },
  {
    title: 'Inventory Management',
    description: 'Master stock levels, transfers, adjustments, and batch tracking across warehouses.',
    icon: <IconBuildingWarehouse size={24} />,
    color: brand.info.main,
    bgColor: brand.info.light,
    duration: '8 min video',
    type: 'video',
  },
  {
    title: 'POS Operations',
    description: 'Learn the full POS workflow — sales, refunds, suspended carts, and split payments.',
    icon: <IconCashRegister size={24} />,
    color: brand.success.main,
    bgColor: brand.success.light,
    duration: '12 min video',
    type: 'video',
  },
  {
    title: 'Financial Reports',
    description: 'Understand profit & loss, balance sheet, tax reports, and custom report builder.',
    icon: <IconChartBar size={24} />,
    color: brand.purple.main,
    bgColor: brand.purple.light,
    duration: '10 min read',
    type: 'guide',
  },
  {
    title: 'Staff Management',
    description: 'Add employees, set roles and permissions, track attendance, and run payroll.',
    icon: <IconUsersGroup size={24} />,
    color: brand.warning.main,
    bgColor: brand.warning.light,
    duration: '6 min read',
    type: 'read',
  },
  {
    title: 'Customer Loyalty',
    description: 'Set up loyalty programs, gift cards, store credit, and customer groups.',
    icon: <IconGift size={24} />,
    color: brand.error.main,
    bgColor: brand.error.light,
    duration: '7 min video',
    type: 'video',
  },
];

const TYPE_CONFIG: Record<Tutorial['type'], { label: string; icon: React.ReactElement }> = {
  read: { label: 'Read', icon: <IconBook size={12} /> },
  video: { label: 'Video', icon: <IconVideo size={12} /> },
  guide: { label: 'Guide', icon: <IconBook size={12} /> },
};

export default function TutorialsPage() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <Box>
      <PageHeader
        title="Tutorials"
        subtitle="Video and written guides to master Letis POS"
      />

      <Grid container spacing={2.5}>
        {TUTORIALS.map((tutorial, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card
              elevation={0}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              sx={{
                border: `1px solid ${hovered === i ? brand.primary[300] : brand.neutral[200]}`,
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                boxShadow:
                  hovered === i
                    ? `0 8px 24px ${brand.neutral[900]}0C`
                    : `0 1px 2px ${brand.neutral[900]}06`,
                cursor: 'pointer',
                '&:hover': {
                  borderColor: brand.primary[300],
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '10px',
                        bgcolor: tutorial.bgColor,
                        color: tutorial.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {tutorial.icon}
                    </Box>
                    <Stack direction="row" spacing={0.75}>
                      <Chip
                        icon={TYPE_CONFIG[tutorial.type].icon}
                        label={TYPE_CONFIG[tutorial.type].label}
                        size="small"
                        sx={{
                          height: 20,
                          fontWeight: 700,
                          fontSize: '0.625rem',
                          borderRadius: '5px',
                          bgcolor: brand.neutral[100],
                          color: brand.neutral[600],
                          '& .MuiChip-label': { px: 0.75 },
                          '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
                        }}
                      />
                      <Chip
                        label={tutorial.duration}
                        size="small"
                        sx={{
                          height: 20,
                          fontWeight: 600,
                          fontSize: '0.625rem',
                          borderRadius: '5px',
                          bgcolor: brand.primary[50],
                          color: brand.primary[700],
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                    </Stack>
                  </Stack>

                  <Box>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 700,
                        color: brand.neutral[800],
                        mb: 0.75,
                        fontSize: '0.9375rem',
                      }}
                    >
                      {tutorial.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: brand.neutral[500],
                        fontSize: '0.8125rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {tutorial.description}
                    </Typography>
                  </Box>

                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{
                      color: brand.primary[600],
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        color: brand.primary[600],
                      }}
                    >
                      View Tutorial
                    </Typography>
                    <IconArrowRight size={16} stroke={2.5} />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
