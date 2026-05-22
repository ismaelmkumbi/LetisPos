import { useState } from 'react';
import {
  Card, CardContent, Stack, Typography, Chip, Box,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import { Circle } from '@mui/icons-material';
import type { Server, MetricPoint, BackendService, ServiceInfo, ServerId } from '../api/hub';
import StatTile from './StatTile';
import CpuChart from './CpuChart';
import ServicesTable from './ServicesTable';
import ServiceDetailDialog from './ServiceDetailDialog';
import ServiceActions from './ServiceActions';
import ServiceLogViewer from './ServiceLogViewer';
import SystemServices from './SystemServices';
import { brand } from '../theme';

const cardSx = {
  border: `1px solid ${brand.neutral[700]}`, borderRadius: '12px',
  bgcolor: brand.neutral[800], boxShadow: '0 18px 40px rgba(15,23,42,0.045)',
} as const;

function ago(ts: string) {
  if (!ts) return 'never';
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return Math.floor(s) + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  return Math.floor(s / 86400) + 'd ago';
}

interface Props {
  server: Server;
  metrics: MetricPoint[];
  backendSvcs: BackendService[];
  services: ServiceInfo[];
}

export default function ServerPanel({ server, metrics: m, backendSvcs, services }: Props) {
  const latest = m.length ? m[m.length - 1] : null;
  const memPct = latest?.memTotalBytes ? (latest.memUsedBytes! / latest.memTotalBytes * 100).toFixed(1) : null;
  const diskPct = latest?.diskTotalBytes ? (latest.diskUsedBytes! / latest.diskTotalBytes * 100).toFixed(1) : null;
  const [detailSvc, setDetailSvc] = useState<BackendService | null>(null);
  const upCount = backendSvcs.filter((s) => s.status === 'UP').length;
  const loading = m.length === 0;

  const svcSlug = detailSvc ? detailSvc.name.toLowerCase().replace(/\s+/g, '-') : '';

  return (
    <Card elevation={0} sx={{ ...cardSx }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        {/* Header */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 0.5, alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: brand.neutral[50], fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                {server.hostname}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500, fontSize: '0.75rem' }}>
                v{server.version || '—'}
              </Typography>
              <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: brand.neutral[600] }} />
              <Typography variant="caption" sx={{ color: brand.neutral[400], fontWeight: 500, fontSize: '0.75rem' }}>
                seen {ago(server.lastSeen)}
              </Typography>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip
              label={`${upCount}/${backendSvcs.length} UP`}
              size="small"
              sx={{
                height: 24, fontWeight: 700, fontSize: '0.65rem',
                bgcolor: upCount === backendSvcs.length ? brand.success.light : brand.warning.light,
                color: upCount === backendSvcs.length ? brand.success.dark : brand.warning.dark,
                borderRadius: '8px',
              }}
            />
            <Chip
              label={server.status}
              size="small"
              icon={<Circle sx={{ fontSize: '7px !important', fill: server.status === 'online' ? brand.success.main : brand.error.main }} />}
              sx={{
                height: 24, fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase',
                bgcolor: server.status === 'online' ? brand.success.light : brand.error.light,
                color: server.status === 'online' ? brand.success.dark : brand.error.dark,
                borderRadius: '8px',
                border: `1px solid ${server.status === 'online' ? brand.success.main : brand.error.main}20`,
              }}
            />
          </Stack>
        </Stack>

        {/* Metric Tiles */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2 }}>
          <StatTile label="CPU" value={latest?.cpuPercent?.toFixed(1) || '—'} unit="%" color={brand.info.main} bar loading={loading} />
          <StatTile label="Memory" value={memPct || '—'} unit="%" color={brand.purple.main} bar loading={loading} />
          <StatTile label="Disk" value={diskPct || '—'} unit="%" color={brand.warning.main} bar loading={loading} />
          <StatTile label="Load" value={latest?.load1?.toFixed(2) || '—'} unit="" color={brand.success.main} loading={loading} />
        </Box>

        {/* CPU Chart */}
        <CpuChart metrics={m} />

        {/* Services Table */}
        <ServicesTable server={server.id as ServerId} services={backendSvcs} onSelect={setDetailSvc} />

        {/* Service Detail Dialog */}
        <Dialog
          open={!!detailSvc}
          onClose={() => setDetailSvc(null)}
          maxWidth="sm"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: '14px', bgcolor: brand.neutral[800], border: `1px solid ${brand.neutral[700]}` } } }}
        >
          {detailSvc && (
            <>
              <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', pb: 0 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: detailSvc.status === 'UP' ? brand.success.main : brand.error.main, boxShadow: detailSvc.status === 'UP' ? `0 0 8px ${brand.success.main}80` : 'none' }} />
                  {detailSvc.name}
                  <Chip
                    label={detailSvc.status}
                    size="small"
                    sx={{ height: 22, fontWeight: 700, fontSize: '0.65rem', bgcolor: detailSvc.status === 'UP' ? brand.success.light : brand.error.light, color: detailSvc.status === 'UP' ? brand.success.dark : brand.error.dark, borderRadius: '6px' }}
                  />
                </Stack>
              </DialogTitle>
              <DialogContent sx={{ pt: 2 }}>
                <Stack spacing={2}>
                  <ServiceDetailDialog svc={detailSvc} />
                  <ServiceActions server={server.id as ServerId} svcName={svcSlug} />
                  <ServiceLogViewer server={server.id as ServerId} svcName={svcSlug} />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setDetailSvc(null)} sx={{ fontWeight: 600, borderRadius: '10px', textTransform: 'none', color: brand.neutral[400] }}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* System Services */}
        <SystemServices server={server.id as ServerId} services={services} />
      </CardContent>
    </Card>
  );
}
