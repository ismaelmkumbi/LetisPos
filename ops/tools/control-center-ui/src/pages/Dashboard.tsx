import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, Grid, Typography, Chip, CircularProgress,
  IconButton, Tooltip, LinearProgress,
} from '@mui/material';
import { Refresh, Logout, Storage } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { getServers, getMetrics, getServices, serviceAction } from '../api/hub';
import type { Server, MetricPoint, ServiceInfo } from '../api/hub';
import { logout } from '../api/client';

export default function Dashboard() {
  const [servers, setServers] = useState<Server[]>([]);
  const [metrics, setMetrics] = useState<Record<string, MetricPoint[]>>({});
  const [services, setServices] = useState<Record<string, ServiceInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const srv = await getServers();
      setServers(srv);
      setError('');

      const now = new Date().toISOString();
      const ago = new Date(Date.now() - 30 * 60000).toISOString();

      srv.forEach(async (s) => {
        try {
          const m = await getMetrics(s.hostname, ago, now);
          setMetrics(prev => ({ ...prev, [s.hostname]: m }));
        } catch {}
        try {
          const svc = await getServices(s.hostname);
          setServices(prev => ({ ...prev, [s.hostname]: svc }));
        } catch {}
      });
    } catch {
      setError('Hub unreachable');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 10000); return () => clearInterval(t); }, [fetchAll]);

  const onlineCount = servers.filter(s => s.status === 'online').length;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0b1120', color: '#e2e8f0' }}>
      {/* Top Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid #1e293b', bgcolor: '#111827' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Storage sx={{ color: '#3b82f6' }} />
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Letis Control Center</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip label={`${onlineCount}/${servers.length} online`} size="small" sx={{ bgcolor: onlineCount ? '#052e16' : '#2e0505', color: onlineCount ? '#22c55e' : '#ef4444', fontWeight: 600 }} />
          <Tooltip title="Refresh"><IconButton onClick={fetchAll} sx={{ color: '#64748b' }}><Refresh /></IconButton></Tooltip>
          <Tooltip title="Logout"><IconButton onClick={logout} sx={{ color: '#64748b' }}><Logout /></IconButton></Tooltip>
        </Box>
      </Box>

      {error && <Box sx={{ px: 3, pt: 2 }}><Typography color="error">{error}</Typography></Box>}

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

function ServerCard({ server, metrics, services: svcs }: { server: Server; metrics: MetricPoint[]; services: ServiceInfo[] }) {
  const latest = metrics.length ? metrics[metrics.length - 1] : null;
  const memPct = latest?.memTotalBytes ? ((latest.memUsedBytes! / latest.memTotalBytes) * 100).toFixed(1) : '—';
  const diskPct = latest?.diskTotalBytes ? ((latest.diskUsedBytes! / latest.diskTotalBytes) * 100).toFixed(1) : '—';

  const chartData = metrics.slice(-30).map(m => ({
    time: new Date(m.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    cpu: m.cpuPercent?.toFixed(1),
    load: m.load1?.toFixed(2),
  }));

  const keySvcs = svcs.filter(s => s.name && (s.name.includes('.service') || s.name.includes('nginx') || s.name.includes('docker') || s.name.includes('ssh'))).slice(0, 8);

  return (
    <Card sx={{ bgcolor: '#111827', border: '1px solid #1e293b', borderRadius: 3, color: '#e2e8f0' }}>
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{server.hostname}</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>v{server.version} · {server.ipAddress}</Typography>
          </Box>
          <Chip label={server.status} size="small" sx={{ bgcolor: server.status === 'online' ? '#052e16' : '#2e0505', color: server.status === 'online' ? '#22c55e' : '#ef4444', fontWeight: 700, textTransform: 'uppercase' }} />
        </Box>

        {/* Metrics Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2 }}>
          <MetricBox label="CPU" value={latest?.cpuPercent?.toFixed(1) || '—'} unit="%" color="#3b82f6" pct={latest?.cpuPercent || 0} />
          <MetricBox label="Memory" value={memPct} unit="%" color="#8b5cf6" pct={parseFloat(memPct) || 0} />
          <MetricBox label="Disk" value={diskPct} unit="%" color="#f59e0b" pct={parseFloat(diskPct) || 0} />
          <MetricBox label="Load" value={latest?.load1?.toFixed(2) || '—'} unit="" color="#22c55e" pct={0} />
        </Box>

        {/* CPU Chart */}
        {chartData.length > 1 && (
          <Box sx={{ mb: 2, height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <ReTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* Services */}
        {keySvcs.length > 0 && (
          <>
            <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, display: 'block', mb: 1 }}>
              Services · {svcs.length} units
            </Typography>
            {keySvcs.map(svc => {
              const isActive = svc.status === 'active' || svc.status === 'running';
              const name = svc.name.replace('.service', '').replace(/\\x[0-9a-f]{2}/gi, '');
              return (
                <Box key={svc.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, '&:hover': { bgcolor: '#1e293b' }, borderRadius: 1, px: 1 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isActive ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }} noWrap>{name}</Typography>
                  <Chip label={isActive ? 'UP' : svc.status} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: isActive ? '#052e16' : '#2e0505', color: isActive ? '#22c55e' : '#ef4444' }} />
                  <Button size="small" sx={{ minWidth: 32, height: 24, fontSize: '0.6rem', color: '#f59e0b', borderColor: '#78350f' }} variant="outlined" onClick={() => serviceAction(server.hostname, svc.name, 'restart').then(() => alert('Restarted')).catch(() => alert('Failed'))}>↻</Button>
                </Box>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MetricBox({ label, value, unit, color, pct }: { label: string; value: string; unit: string; color: string; pct: number }) {
  return (
    <Box sx={{ bgcolor: '#0f172a', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{value}<Typography component="span" variant="caption" sx={{ color: '#64748b' }}>{unit}</Typography></Typography>
      <LinearProgress variant="determinate" value={Math.min(pct, 100)} sx={{ mt: 0.5, height: 3, borderRadius: 1, bgcolor: '#1e293b', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 1 } }} />
    </Box>
  );
}
