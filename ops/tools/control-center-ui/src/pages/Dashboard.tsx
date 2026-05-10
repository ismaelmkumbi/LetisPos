import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, Grid, Typography, Chip, CircularProgress,
  IconButton, Tooltip, Stack, LinearProgress,
} from '@mui/material';
import { Refresh, Logout, Storage, Circle } from '@mui/icons-material';
import { LineChart, Line, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { getServers, getMetrics, getServices, serviceAction } from '../api/hub';
import type { Server, MetricPoint, ServiceInfo } from '../api/hub';
import { logout } from '../api/client';
import { brand } from '../theme';

const cardSx = {
  border: `1px solid ${brand.neutral[700]}`,
  borderRadius: '12px',
  bgcolor: brand.neutral[800],
  boxShadow: '0 18px 40px rgba(15,23,42,0.045)',
} as const;

const titleColor = brand.neutral[50];
const muted = brand.neutral[400];

function ago(ts: string) {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return Math.floor(s) + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  return Math.floor(s / 86400) + 'd ago';
}

export default function Dashboard() {
  const [servers, setServers] = useState<Server[]>([]);
  const [metrics, setMetrics] = useState<Record<string, MetricPoint[]>>({});
  const [services, setServices] = useState<Record<string, ServiceInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const srv = await getServers();
      setServers(srv);
      setRefreshing(true);
      const now = new Date().toISOString();
      const past = new Date(Date.now() - 30 * 60000).toISOString();
      await Promise.allSettled(srv.map(s =>
        Promise.all([
          getMetrics(s.hostname, past, now).then(m => setMetrics(prev => ({ ...prev, [s.hostname]: m }))).catch(() => {}),
          getServices(s.hostname).then(svc => setServices(prev => ({ ...prev, [s.hostname]: svc }))).catch(() => {}),
        ])
      ));
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 10000); return () => clearInterval(t); }, [fetchData]);

  const online = servers.filter(s => s.status === 'online').length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: brand.neutral[900] }}>
        <CircularProgress size={32} sx={{ color: brand.primary[500] }} />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 1, bgcolor: brand.neutral[900], minHeight: '100vh' }}>
      {/* ── Top Bar (GreetingBar pattern) ── */}
      <Box
        sx={{
          mb: 1.5, p: { xs: 1.75, md: 2 }, borderRadius: '12px',
          border: `1px solid ${brand.neutral[700]}`, bgcolor: brand.neutral[800],
          boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
          display: 'flex', flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' }, gap: 2,
          mx: 2, mt: 2,
        }}
      >
        <Box sx={{ flex: '0 0 auto' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: `${brand.primary[600]}15`, display: 'grid', placeItems: 'center' }}>
              <Storage sx={{ color: brand.primary[600], fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 22 }, color: titleColor, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Letis Control Center
            </Typography>
          </Stack>
          <Typography sx={{ color: muted, fontSize: 13, mt: 0.3 }}>
            Infrastructure Operations — monitoring {servers.length} server{servers.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Chip
            label={`${online}/${servers.length} online`}
            size="small"
            icon={<Circle sx={{ fontSize: '8px !important', fill: online ? brand.success.main : brand.error.main }} />}
            sx={{
              height: 28, fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.03em',
              bgcolor: online ? brand.success.light : brand.error.light,
              color: online ? brand.success.dark : brand.error.dark,
              borderRadius: '8px', border: `1px solid ${online ? brand.success.main : brand.error.main}20`,
              '.MuiChip-icon': { ml: 0.75, mr: -0.25 },
            }}
          />
          <Tooltip title="Refresh"><IconButton size="small" onClick={fetchData} sx={{ color: muted, border: `1px solid ${brand.neutral[700]}`, borderRadius: '10px' }}><Refresh fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Sign out"><IconButton size="small" onClick={logout} sx={{ color: muted, border: `1px solid ${brand.neutral[700]}`, borderRadius: '10px' }}><Logout fontSize="small" /></IconButton></Tooltip>
        </Stack>
      </Box>

      {refreshing && <LinearProgress sx={{ mx: 2, mb: 1, borderRadius: '4px', height: 3, bgcolor: brand.neutral[800], '& .MuiLinearProgress-bar': { bgcolor: brand.primary[500] } }} />}

      {/* ── Server Grid ── */}
      <Box sx={{ px: 2 }}>
        <Grid container spacing={1.5}>
          {servers.map(s => (
            <Grid size={{ xs: 12, xl: 6 }} key={s.id}>
              <ServerCard server={s} metrics={metrics[s.hostname] || []} services={services[s.hostname] || []} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}

function ServerCard({ server, metrics: m, services: svcs }: { server: Server; metrics: MetricPoint[]; services: ServiceInfo[] }) {
  const latest = m.length ? m[m.length - 1] : null;
  const memPct = latest?.memTotalBytes ? (latest.memUsedBytes! / latest.memTotalBytes * 100).toFixed(1) : null;
  const diskPct = latest?.diskTotalBytes ? (latest.diskUsedBytes! / latest.diskTotalBytes * 100).toFixed(1) : null;

  const chartData = m.slice(-30).map(p => ({
    time: new Date(p.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    cpu: p.cpuPercent?.toFixed(1),
  }));

  const filteredSvcs = svcs
    .filter(s => s.name?.endsWith('.service'))
    .filter(s => !s.name.includes('\\x2d') && !s.name.includes('/'))
    .slice(0, 12);

  return (
    <Card elevation={0} sx={{ ...cardSx, height: '100%' }}>
      <CardContent sx={{ p: 2.25, pb: '16px !important' }}>
        {/* ── Header Row ── */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 0.5, alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: titleColor, fontSize: '1.1rem', letterSpacing: '-0.02em' }} noWrap>
                {server.hostname}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: muted, fontWeight: 500, fontSize: '0.75rem' }}>
                v{server.version}
              </Typography>
              <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: brand.neutral[600] }} />
              <Typography variant="caption" sx={{ color: muted, fontWeight: 500, fontSize: '0.75rem' }}>
                seen {ago(server.lastSeen)}
              </Typography>
            </Stack>
          </Box>
          <Chip
            label={server.status}
            size="small"
            icon={<Circle sx={{ fontSize: '7px !important', fill: server.status === 'online' ? brand.success.main : brand.error.main }} />}
            sx={{
              height: 24, fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase',
              bgcolor: server.status === 'online' ? brand.success.light : brand.error.light,
              color: server.status === 'online' ? brand.success.dark : brand.error.dark,
              borderRadius: '8px', border: `1px solid ${server.status === 'online' ? brand.success.main : brand.error.main}20`,
              flexShrink: 0,
            }}
          />
        </Stack>

        {/* ── Metric Tiles ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2 }}>
          <StatTile label="CPU" value={latest?.cpuPercent?.toFixed(1) || '—'} unit="%" color={brand.info.main} bar />
          <StatTile label="Memory" value={memPct || '—'} unit="%" color={brand.purple.main} bar />
          <StatTile label="Disk" value={diskPct || '—'} unit="%" color={brand.warning.main} bar />
          <StatTile label="Load" value={latest?.load1?.toFixed(2) || '—'} unit="" color={brand.success.main} />
        </Box>

        {/* ── CPU Chart ── */}
        {chartData.length > 1 && (
          <Box sx={{ mb: 2, height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={brand.neutral[600]} />
                <ReTooltip contentStyle={{ background: brand.neutral[800], border: `1px solid ${brand.neutral[600]}`, borderRadius: 10, color: brand.neutral[50], fontSize: 12 }} />
                <Line type="monotone" dataKey="cpu" stroke={brand.info.main} strokeWidth={2.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* ── Services ── */}
        {filteredSvcs.length > 0 && (
          <>
            <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 15, mb: 1 }}>
              Services
              <Typography component="span" sx={{ color: muted, fontWeight: 500, fontSize: 13, ml: 0.5 }}>
                · {filteredSvcs.length} of {svcs.length}
              </Typography>
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
              {filteredSvcs.map(svc => {
                const up = svc.status === 'active' || svc.status === 'running';
                const name = svc.name.replace('.service', '').replace(/\\x[0-9a-f]{2}/gi, '').substring(0, 30);
                return (
                  <Box key={svc.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6, px: 1, borderRadius: '8px', '&:hover': { bgcolor: `${brand.neutral[700]}40` } }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: up ? brand.success.main : brand.error.main, flexShrink: 0 }} />
                    <Typography variant="caption" noWrap sx={{ flex: 1, fontWeight: 500, fontSize: '0.75rem', color: brand.neutral[50] }}>{name}</Typography>
                    <Button
                      size="small"
                      onClick={() => { serviceAction(server.hostname, svc.name, 'restart').catch(() => {}); }}
                      sx={{ minWidth: 22, height: 22, p: 0, fontSize: '0.6rem', fontWeight: 700, color: brand.warning.main, borderColor: `${brand.warning.main}40`, borderRadius: '6px', '&:hover': { borderColor: brand.warning.main, bgcolor: `${brand.warning.main}15` } }}
                      variant="outlined"
                    >↻</Button>
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({ label, value, unit, color, bar }: { label: string; value: string; unit: string; color: string; bar?: boolean }) {
  return (
    <Box sx={{ bgcolor: brand.neutral[900], borderRadius: '10px', p: 1.5, textAlign: 'center' }}>
      <Typography sx={{ color: brand.neutral[500], fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color }}>
        {value}
        {unit && <Box component="span" sx={{ fontSize: '0.6rem', color: muted, ml: 0.25, fontWeight: 500 }}>{unit}</Box>}
      </Typography>
      {bar && (
        <Box sx={{ height: 3, bgcolor: brand.neutral[700], borderRadius: 2, mt: 0.75, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: `${Math.min(parseFloat(value) || 0, 100)}%`, bgcolor: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
        </Box>
      )}
    </Box>
  );
}
