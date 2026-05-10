import { useEffect, useState, useCallback } from 'react';
import { Box, Button, Card, CardContent, Grid, Typography, Chip, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Refresh, Logout, Storage, Circle } from '@mui/icons-material';
import { LineChart, Line, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { getServers, getMetrics, getServices, serviceAction } from '../api/hub';
import type { Server, MetricPoint, ServiceInfo } from '../api/hub';
import { logout } from '../api/client';
import { brand, darkBrand as b } from '../theme';

function ago(ts: string) {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return Math.floor(s) + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

export default function Dashboard() {
  const [servers, setServers] = useState<Server[]>([]);
  const [metrics, setMetrics] = useState<Record<string, MetricPoint[]>>({});
  const [services, setServices] = useState<Record<string, ServiceInfo[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const srv = await getServers();
      setServers(srv);
      const now = new Date().toISOString();
      const past = new Date(Date.now() - 30 * 60000).toISOString();
      srv.forEach(s => {
        getMetrics(s.hostname, past, now).then(m => setMetrics(prev => ({ ...prev, [s.hostname]: m }))).catch(() => {});
        getServices(s.hostname).then(svc => setServices(prev => ({ ...prev, [s.hostname]: svc }))).catch(() => {});
      });
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 10000); return () => clearInterval(t); }, [fetchData]);

  const online = servers.filter(s => s.status === 'online').length;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: b.background }}><CircularProgress sx={{ color: b.primary }} /></Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: b.background, color: b.text }}>
      {/* ── Top Bar ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 1.75, borderBottom: `1px solid ${b.border}`, bgcolor: b.surface }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: brand.primary[900], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Storage sx={{ color: brand.primary[400], fontSize: 18 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: b.text }}>Letis Control Center</Typography>
            <Typography sx={{ fontSize: '0.7rem', color: b.textMuted }}>Infrastructure Operations</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Chip
            label={`${online}/${servers.length} online`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: online ? brand.success.light : brand.error.light, color: online ? brand.success.dark : brand.error.dark, border: `1px solid ${online ? brand.success.main : brand.error.main}20`, borderRadius: '8px' }}
          />
          <Tooltip title="Refresh"><IconButton size="small" onClick={fetchData} sx={{ color: b.textMuted }}><Refresh fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Sign out"><IconButton size="small" onClick={logout} sx={{ color: b.textMuted }}><Logout fontSize="small" /></IconButton></Tooltip>
        </Box>
      </Box>

      {/* ── Server Grid ── */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {servers.map(s => (
            <Grid size={{ xs: 12, lg: 6 }} key={s.id}>
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
  const cpu = latest?.cpuPercent?.toFixed(1);

  const chartData = m.slice(-30).map(p => ({ t: new Date(p.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), cpu: p.cpuPercent?.toFixed(1), load: p.load1?.toFixed(2) }));

  const filteredSvcs = svcs.filter(s => s.name?.endsWith('.service')).filter(s => !s.name.includes('\\x2d') && !s.name.includes('/')).slice(0, 12);

  return (
    <Card sx={{ bgcolor: b.surface, borderRadius: 3, overflow: 'hidden' }}>
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>{server.hostname}</Typography>
            <Typography variant="caption" sx={{ color: b.textMuted, display: 'block', mt: 0.25 }}>v{server.version} · {server.ipAddress} · seen {ago(server.lastSeen)}</Typography>
          </Box>
          <Chip
            size="small"
            label={server.status}
            icon={<Circle sx={{ fontSize: '8px !important', fill: server.status === 'online' ? brand.success.main : brand.error.main }} />}
            sx={{
              fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.04em',
              bgcolor: server.status === 'online' ? brand.success.light : brand.error.light,
              color: server.status === 'online' ? brand.success.dark : brand.error.dark,
              border: `1px solid ${server.status === 'online' ? brand.success.main : brand.error.main}30`,
              borderRadius: '8px', height: 26,
            }}
          />
        </Box>

        {/* Metrics */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2 }}>
          <MiniMetric label="CPU" value={cpu || '—'} unit="%" color={brand.info.main} />
          <MiniMetric label="Memory" value={memPct || '—'} unit="%" color={brand.purple.main} />
          <MiniMetric label="Disk" value={diskPct || '—'} unit="%" color={brand.warning.main} />
          <MiniMetric label="Load" value={latest?.load1?.toFixed(2) || '—'} unit="" color={brand.success.main} />
        </Box>

        {/* Chart */}
        {chartData.length > 1 && (
          <Box sx={{ height: 100, mb: 2, mx: -1 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={brand.neutral[600]} />
                <ReTooltip contentStyle={{ background: brand.neutral[800], border: `1px solid ${brand.neutral[600]}`, borderRadius: 8, color: brand.neutral[50], fontSize: 12 }} />
                <Line type="monotone" dataKey="cpu" stroke={brand.info.main} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* Services */}
        {filteredSvcs.length > 0 && (
          <>
            <Typography variant="caption" sx={{ color: b.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, display: 'block', mb: 1 }}>
              Services · {filteredSvcs.length} of {svcs.length}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
              {filteredSvcs.map(svc => {
                const up = svc.status === 'active' || svc.status === 'running';
                const name = svc.name.replace('.service', '').replace(/\\x[0-9a-f]{2}/gi, '').substring(0, 28);
                return (
                  <Box key={svc.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6, px: 1, borderRadius: 1.5, '&:hover': { bgcolor: brand.neutral[700] + '40' } }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: up ? brand.success.main : brand.error.main, flexShrink: 0 }} />
                    <Typography variant="caption" noWrap sx={{ flex: 1, fontWeight: 500 }}>{name}</Typography>
                    <Chip label={up ? 'UP' : svc.status} size="small"
                      sx={{ height: 18, fontSize: '0.55rem', fontWeight: 700, minWidth: 32,
                        bgcolor: up ? brand.success.light : brand.error.light,
                        color: up ? brand.success.dark : brand.error.dark,
                        border: `1px solid ${up ? brand.success.main : brand.error.main}30`, borderRadius: '6px',
                        '& .MuiChip-label': { px: 0.75 } }} />
                    <Button size="small" onClick={() => serviceAction(server.hostname, svc.name, 'restart').catch(() => {})}
                      sx={{ minWidth: 22, height: 22, p: 0, fontSize: '0.6rem', color: brand.warning.main, borderColor: brand.warning.main + '30',
                        '&:hover': { borderColor: brand.warning.main, bgcolor: brand.warning.main + '15' } }} variant="outlined">↻</Button>
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

function MiniMetric({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <Box sx={{ bgcolor: brand.neutral[900], borderRadius: 2, p: 1.25, textAlign: 'center' }}>
      <Typography variant="caption" sx={{ color: b.textMuted, display: 'block', mb: 0.5, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '1rem', color }}>
        {value}
        {unit && <Typography component="span" sx={{ fontSize: '0.6rem', color: b.textMuted, ml: 0.25 }}>{unit}</Typography>}
      </Typography>
    </Box>
  );
}
