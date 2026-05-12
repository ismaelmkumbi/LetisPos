import { useEffect, useState } from 'react';
import { Box, Card, CardContent, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import {
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconDatabase,
  IconCloud,
  IconMail,
  IconDeviceMobile,
  IconCreditCard,
  IconServer,
} from '@tabler/icons-react';

import { PageHeader } from 'src/components/smartpos/PageHeader';
import { brand } from 'src/theme/smartpos/brand';
import { getSystemStatus, type ServiceStatus as ApiServiceStatus } from 'src/api/smartpos/audit';

type StatusState = 'operational' | 'degraded' | 'down';

interface ServiceStatus {
  name: string;
  description: string;
  icon: React.ReactNode;
  state: StatusState;
  uptime: string;
  lastChecked: string;
}

const SERVICE_META: Record<string, { description: string; icon: React.ReactNode }> = {
  'API Gateway': {
    description: 'Core REST API and GraphQL endpoints',
    icon: <IconServer size={20} />,
  },
  Database: {
    description: 'PostgreSQL primary and read replicas',
    icon: <IconDatabase size={20} />,
  },
  Storage: {
    description: 'File and image storage (S3-compatible)',
    icon: <IconCloud size={20} />,
  },
  'Email Service': {
    description: 'Transactional and marketing email delivery',
    icon: <IconMail size={20} />,
  },
  'SMS Service': {
    description: 'SMS gateway for notifications and OTP',
    icon: <IconDeviceMobile size={20} />,
  },
  'Payment Processing': {
    description: 'Payment gateway integrations (M-Pesa, cards)',
    icon: <IconCreditCard size={20} />,
  },
};

const STATUS_CONFIG: Record<StatusState, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  operational: {
    label: 'Operational',
    color: brand.success.dark,
    bgColor: brand.success.light,
    icon: <IconCheck size={14} stroke={3} />,
  },
  degraded: {
    label: 'Degraded',
    color: brand.warning.dark,
    bgColor: brand.warning.light,
    icon: <IconAlertTriangle size={14} stroke={3} />,
  },
  down: {
    label: 'Down',
    color: brand.error.dark,
    bgColor: brand.error.light,
    icon: <IconX size={14} stroke={3} />,
  },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapApiToServiceStatus(api: ApiServiceStatus): ServiceStatus {
  const meta = SERVICE_META[api.name];
  return {
    name: api.name,
    description: meta?.description ?? 'Service endpoint',
    icon: meta?.icon ?? <IconServer size={20} />,
    state: (api.status as StatusState) || 'operational',
    uptime: `${api.uptime.toFixed(2)}%`,
    lastChecked: api.lastChecked,
  };
}

export default function SystemStatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSystemStatus()
      .then((data) => setServices(data.map(mapApiToServiceStatus)))
      .catch(() => setError('Failed to load system status'))
      .finally(() => setLoading(false));
  }, []);

  const allOperational = services.every((s) => s.state === 'operational');

  return (
    <Box>
      <PageHeader
        title="System Status"
        subtitle="Monitor platform health and service availability"
        liveIndicator={
          allOperational && !loading ? { text: 'All systems operational' } : undefined
        }
      />

      {!allOperational && !loading && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: '10px',
            border: `1px solid ${brand.warning.light}`,
            bgcolor: brand.warning.light,
            color: brand.warning.dark,
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Some services are experiencing issues. Our team is investigating.
        </Box>
      )}

      {error && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: '10px',
            border: `1px solid ${brand.error.light}`,
            bgcolor: brand.error.light,
            color: brand.error.dark,
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          {error}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {services.map((svc) => {
            const cfg = STATUS_CONFIG[svc.state];
            return (
              <Grid key={svc.name} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Card
                  elevation={0}
                  sx={{
                    border: `1px solid ${brand.neutral[200]}`,
                    borderRadius: '12px',
                    boxShadow: `0 1px 2px ${brand.neutral[900]}06`,
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '10px',
                              bgcolor: brand.primary[50],
                              color: brand.primary[600],
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {svc.icon}
                          </Box>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: brand.neutral[800], fontSize: '0.9375rem' }}>
                              {svc.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
                              {svc.description}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                          sx={{
                            px: 1,
                            py: 0.375,
                            borderRadius: '6px',
                            bgcolor: cfg.bgColor,
                            color: cfg.color,
                            fontWeight: 700,
                            fontSize: '0.6875rem',
                          }}
                        >
                          {cfg.icon}
                          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.6875rem', color: 'inherit' }}>
                            {cfg.label}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between">
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: cfg.color,
                            }}
                          />
                          <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500 }}>
                            {svc.uptime} uptime
                          </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500 }}>
                          Last checked {formatTime(svc.lastChecked)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
