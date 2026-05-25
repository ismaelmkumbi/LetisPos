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
  border: `1px solid ${brand.neutral[700]}`, borderRadius: '10px',
  bgcolor: brand.neutral[800], boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
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

  // LSA agent returns Docker container names in the 'name' field
  const svcSlug = detailSvc ? (detailSvc.containerName || detailSvc.name) : '';

  return (
    <Card elevation={0} sx={{ ...cardSx }}>
      <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
        {/* Header */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
            <Typography sx={{ fontWeight: 800, color: brand.neutral[50], fontSize: '0.85rem', letterSpacing: '-0.02em' }}>
              {server.hostname}
            </Typography>
            <Typography variant="caption" sx={{ color: brand.neutral[500], fontWeight: 500, fontSize: '0.62rem' }}>
              seen {ago(server.lastSeen)}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Chip
              label={`${upCount}/${backendSvcs.length} UP`}
              size="small"
              sx={{
                height: 20, fontWeight: 700, fontSize: '0.6rem',
                bgcolor: upCount === backendSvcs.length ? brand.success.light : brand.warning.light,
                color: upCount === backendSvcs.length ? brand.success.dark : brand.warning.dark,
                borderRadius: '6px',
              }}
            />
            <Chip
              label={server.status}
              size="small"
              icon={<Circle sx={{ fontSize: '6px !important', fill: server.status === 'online' ? brand.success.main : brand.error.main }} />}
              sx={{
                height: 20, fontWeight: 700, fontSize: '0.6rem', letterSpacing: '0.04em', textTransform: 'uppercase',
                bgcolor: server.status === 'online' ? brand.success.light : brand.error.light,
                color: server.status === 'online' ? brand.success.dark : brand.error.dark,
                borderRadius: '6px',
                border: `1px solid ${server.status === 'online' ? brand.success.main : brand.error.main}20`,
              }}
            />
          </Stack>
        </Stack>

        {/* Metric Tiles */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5, mb: 1 }}>
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
          slotProps={{ paper: { sx: { borderRadius: '12px', bgcolor: brand.neutral[800], border: `1px solid ${brand.neutral[700]}` } } }}
        >
          {detailSvc && (
            <>
              <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', pb: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: detailSvc.status === 'UP' ? brand.success.main : brand.error.main, boxShadow: detailSvc.status === 'UP' ? `0 0 6px ${brand.success.main}80` : 'none' }} />
                  {detailSvc.name}
                  <Chip
                    label={detailSvc.status}
                    size="small"
                    sx={{ height: 20, fontWeight: 700, fontSize: '0.6rem', bgcolor: detailSvc.status === 'UP' ? brand.success.light : brand.error.light, color: detailSvc.status === 'UP' ? brand.success.dark : brand.error.dark, borderRadius: '5px' }}
                  />
                </Stack>
              </DialogTitle>
              <DialogContent sx={{ pt: 1.5 }}>
                <Stack spacing={1.5}>
                  <ServiceDetailDialog svc={detailSvc} />
                  <ServiceActions server={server.id as ServerId} svcName={svcSlug} />
                  <ServiceLogViewer server={server.id as ServerId} svcName={svcSlug} />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 2, pb: 1.5 }}>
                <Button onClick={() => setDetailSvc(null)} sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none', color: brand.neutral[400], fontSize: '0.75rem' }}>Close</Button>
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
