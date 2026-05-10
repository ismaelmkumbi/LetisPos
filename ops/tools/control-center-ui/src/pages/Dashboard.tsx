import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, Grid, Typography, Chip, CircularProgress,
  IconButton, Tooltip, Stack, LinearProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, MenuItem, Collapse,
} from '@mui/material';
import { Refresh, Logout, Storage, Circle, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { LineChart, Line, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { getServers, getMetrics, getServices, getBackendServices, serviceAction } from '../api/hub';
import type { Server, MetricPoint, ServiceInfo, BackendService } from '../api/hub';
import { logout } from '../api/client';
import { brand } from '../theme';

const cardSx = {
  border: `1px solid ${brand.neutral[700]}`, borderRadius: '12px',
  bgcolor: brand.neutral[800], boxShadow: '0 18px 40px rgba(15,23,42,0.045)',
} as const;
const titleColor = brand.neutral[50];
const muted = brand.neutral[400];
const CATEGORY_COLORS: Record<string, string> = {
  Core: brand.info.main, Catalog: brand.primary[500], Inventory: brand.warning.main,
  Sales: brand.success.main, Finance: brand.purple.main, Insight: '#06b6d4',
  People: '#f97316', Intelligence: '#ec4899', Platform: brand.neutral[400],
};

function ago(ts: string) { const s = (Date.now() - new Date(ts).getTime()) / 1000; if (s < 60) return Math.floor(s) + 's ago'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; return Math.floor(s / 86400) + 'd ago'; }

export default function Dashboard() {
  const [servers, setServers] = useState<Server[]>([]);
  const [metrics, setMetrics] = useState<Record<string, MetricPoint[]>>({});
  const [services, setServices] = useState<Record<string, ServiceInfo[]>>({});
  const [backendSvcs, setBackendSvcs] = useState<Record<string, BackendService[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [svcFilter, setSvcFilter] = useState('All');

  const fetchData = useCallback(async () => {
    try {
      const srv = await getServers(); setServers(srv); setRefreshing(true);
      const now = new Date().toISOString();
      const past = new Date(Date.now() - 30 * 60000).toISOString();
      await Promise.allSettled(srv.map(s => Promise.all([
        getMetrics(s.hostname, past, now).then(m => setMetrics(prev => ({ ...prev, [s.hostname]: m }))).catch(() => {}),
        getServices(s.hostname).then(svc => setServices(prev => ({ ...prev, [s.hostname]: svc }))).catch(() => {}),
        getBackendServices(s.hostname).then(bs => setBackendSvcs(prev => ({ ...prev, [s.hostname]: bs }))).catch(() => {}),
      ])));
    } catch { } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 10000); return () => clearInterval(t); }, [fetchData]);

  const online = servers.filter(s => s.status === 'online').length;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: brand.neutral[900] }}><CircularProgress size={32} sx={{ color: brand.primary[500] }} /></Box>;

  return (
    <Box sx={{ pb: 1, bgcolor: brand.neutral[900], minHeight: '100vh' }}>
      {/* Top Bar */}
      <Box sx={{ mb: 1.5, p: { xs: 1.75, md: 2 }, borderRadius: '12px', border: `1px solid ${brand.neutral[700]}`, bgcolor: brand.neutral[800], boxShadow: '0 2px 12px rgba(15,23,42,0.04)', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mx: 2, mt: 2 }}>
        <Box sx={{ flex: '0 0 auto' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: `${brand.primary[600]}15`, display: 'grid', placeItems: 'center' }}><Storage sx={{ color: brand.primary[600], fontSize: 20 }} /></Box>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 22 }, color: titleColor, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Letis Control Center</Typography>
          </Stack>
          <Typography sx={{ color: muted, fontSize: 13, mt: 0.3 }}>Infrastructure Operations — {servers.length} server{servers.length !== 1 ? 's' : ''} monitored</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Chip label={`${online}/${servers.length} online`} size="small" icon={<Circle sx={{ fontSize: '8px !important', fill: online ? brand.success.main : brand.error.main }} />} sx={{ height: 28, fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.03em', bgcolor: online ? brand.success.light : brand.error.light, color: online ? brand.success.dark : brand.error.dark, borderRadius: '8px', border: `1px solid ${online ? brand.success.main : brand.error.main}20`, '.MuiChip-icon': { ml: 0.75, mr: -0.25 } }} />
          <Tooltip title="Refresh"><IconButton size="small" onClick={fetchData} sx={{ color: muted, border: `1px solid ${brand.neutral[700]}`, borderRadius: '10px' }}><Refresh fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Sign out"><IconButton size="small" onClick={logout} sx={{ color: muted, border: `1px solid ${brand.neutral[700]}`, borderRadius: '10px' }}><Logout fontSize="small" /></IconButton></Tooltip>
        </Stack>
      </Box>

      {refreshing && <LinearProgress sx={{ mx: 2, mb: 1, borderRadius: '4px', height: 3, bgcolor: brand.neutral[800], '& .MuiLinearProgress-bar': { bgcolor: brand.primary[500] } }} />}

      <Box sx={{ px: 2 }}>
        <Grid container spacing={1.5}>
          {servers.map(s => (
            <Grid size={{ xs: 12 }} key={s.id}>
              <ServerPanel server={s} metrics={metrics[s.hostname] || []} backendSvcs={backendSvcs[s.hostname] || []} svcFilter={svcFilter} onFilterChange={setSvcFilter} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}

function ServerPanel({ server, metrics: m, backendSvcs, svcFilter, onFilterChange }: { server: Server; metrics: MetricPoint[]; backendSvcs: BackendService[]; svcFilter: string; onFilterChange: (v: string) => void }) {
  const latest = m.length ? m[m.length - 1] : null;
  const memPct = latest?.memTotalBytes ? (latest.memUsedBytes! / latest.memTotalBytes * 100).toFixed(1) : null;
  const diskPct = latest?.diskTotalBytes ? (latest.diskUsedBytes! / latest.diskTotalBytes * 100).toFixed(1) : null;
  const [showSystem, setShowSystem] = useState(false);

  const chartData = m.slice(-30).map(p => ({ time: new Date(p.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), cpu: p.cpuPercent?.toFixed(1) }));

  const categories = ['All', ...new Set(backendSvcs.map(s => s.category))];
  const filtered = svcFilter === 'All' ? backendSvcs : backendSvcs.filter(s => s.category === svcFilter);
  const upCount = backendSvcs.filter(s => s.status === 'UP').length;

  return (
    <Card elevation={0} sx={{ ...cardSx }}>
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        {/* Header */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 0.5, alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: titleColor, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>{server.hostname}</Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: muted, fontWeight: 500, fontSize: '0.75rem' }}>v{server.version}</Typography>
              <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: brand.neutral[600] }} />
              <Typography variant="caption" sx={{ color: muted, fontWeight: 500, fontSize: '0.75rem' }}>seen {ago(server.lastSeen)}</Typography>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip label={`${upCount}/${backendSvcs.length} UP`} size="small" sx={{ height: 24, fontWeight: 700, fontSize: '0.65rem', bgcolor: upCount === backendSvcs.length ? brand.success.light : brand.warning.light, color: upCount === backendSvcs.length ? brand.success.dark : brand.warning.dark, borderRadius: '8px' }} />
            <Chip label={server.status} size="small" icon={<Circle sx={{ fontSize: '7px !important', fill: server.status === 'online' ? brand.success.main : brand.error.main }} />} sx={{ height: 24, fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase', bgcolor: server.status === 'online' ? brand.success.light : brand.error.light, color: server.status === 'online' ? brand.success.dark : brand.error.dark, borderRadius: '8px', border: `1px solid ${server.status === 'online' ? brand.success.main : brand.error.main}20` }} />
          </Stack>
        </Stack>

        {/* Metric Tiles */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2 }}>
          <StatTile label="CPU" value={latest?.cpuPercent?.toFixed(1) || '—'} unit="%" color={brand.info.main} bar />
          <StatTile label="Memory" value={memPct || '—'} unit="%" color={brand.purple.main} bar />
          <StatTile label="Disk" value={diskPct || '—'} unit="%" color={brand.warning.main} bar />
          <StatTile label="Load" value={latest?.load1?.toFixed(2) || '—'} unit="" color={brand.success.main} />
        </Box>

        {/* CPU Chart */}
        {chartData.length > 1 && (
          <Box sx={{ mb: 2, height: 100 }}>
            <ResponsiveContainer><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={brand.neutral[600]} /><ReTooltip contentStyle={{ background: brand.neutral[800], border: `1px solid ${brand.neutral[600]}`, borderRadius: 10, color: brand.neutral[50], fontSize: 12 }} /><Line type="monotone" dataKey="cpu" stroke={brand.info.main} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
          </Box>
        )}

        {/* Backend Services Table */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography sx={{ fontWeight: 800, color: titleColor, fontSize: 15 }}>Backend Services</Typography>
          <TextField select size="small" value={svcFilter} onChange={e => onFilterChange(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { height: 30, borderRadius: '8px', fontWeight: 600, fontSize: '0.7rem', color: brand.neutral[50], '& fieldset': { borderColor: brand.neutral[600] }, '&:hover fieldset': { borderColor: brand.neutral[400] }, '&.Mui-focused fieldset': { borderColor: brand.primary[500] } }, '& .MuiSelect-icon': { color: brand.neutral[400] } }}>
            {categories.map(c => <MenuItem key={c} value={c} sx={{ fontSize: '0.75rem' }}>{c}</MenuItem>)}
          </TextField>
        </Stack>

        <TableContainer sx={{ mb: 0 }}>
          <Table size="small" sx={{ '& .MuiTableCell-root': { borderColor: brand.neutral[700], py: 0.75, px: 1.5 } }}>
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700, fontSize: '0.7rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.04em', bgcolor: brand.neutral[900] } }}>
                <TableCell>Service</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Port</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(svc => (
                <TableRow key={svc.name} hover sx={{ '&:hover': { bgcolor: `${brand.neutral[700]}30` }, '& .MuiTableCell-root': { fontSize: '0.78rem', color: brand.neutral[50] } }}>
                  <TableCell sx={{ fontWeight: 600 }}>{svc.name}</TableCell>
                  <TableCell>
                    <Chip label={svc.category} size="small" sx={{ height: 20, fontWeight: 600, fontSize: '0.6rem', bgcolor: `${CATEGORY_COLORS[svc.category] || brand.primary[500]}20`, color: CATEGORY_COLORS[svc.category] || brand.primary[500], borderRadius: '6px' }} />
                  </TableCell>
                  <TableCell sx={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: '0.75rem', color: muted }}>:{svc.port}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: svc.status === 'UP' ? brand.success.main : brand.error.main, boxShadow: svc.status === 'UP' ? `0 0 6px ${brand.success.main}80` : 'none' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: svc.status === 'UP' ? brand.success.main : brand.error.main, fontSize: '0.7rem' }}>{svc.status}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: muted, fontSize: '0.72rem' }}>{svc.description}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <Button size="small" variant="outlined" onClick={() => { serviceAction(server.hostname, svc.name.toLowerCase().replace(' ', '-'), 'restart').catch(() => {}); }}
                        sx={{ minWidth: 28, height: 26, p: 0, fontSize: '0.6rem', fontWeight: 700, color: brand.warning.main, borderColor: `${brand.warning.main}40`, borderRadius: '6px', '&:hover': { borderColor: brand.warning.main, bgcolor: `${brand.warning.main}15` } }}>↻</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Systemd Services — collapsed by default */}
        <Box sx={{ mt: 2 }}>
          <Button onClick={() => setShowSystem(!showSystem)} endIcon={showSystem ? <KeyboardArrowUp /> : <KeyboardArrowDown />} sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', color: muted, '&:hover': { color: brand.neutral[50] } }}>
            System Services ({services[server.hostname]?.filter(s => s.name?.endsWith('.service')).length || 0} units)
          </Button>
          <Collapse in={showSystem}>
            <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, maxHeight: 300, overflow: 'auto' }}>
              {(services[server.hostname] || []).filter(s => s.name?.endsWith('.service')).filter(s => !s.name.includes('\\x2d') && !s.name.includes('/')).slice(0, 40).map(svc => {
                const up = svc.status === 'active' || svc.status === 'running';
                const name = svc.name.replace('.service', '').replace(/\\x[0-9a-f]{2}/gi, '').substring(0, 35);
                return (
                  <Box key={svc.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.4, px: 1, borderRadius: '6px', '&:hover': { bgcolor: `${brand.neutral[700]}30` } }}>
                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: up ? brand.success.main : brand.error.main, flexShrink: 0 }} />
                    <Typography variant="caption" noWrap sx={{ flex: 1, fontSize: '0.68rem', color: brand.neutral[300] }}>{name}</Typography>
                    <Button size="small" onClick={() => { serviceAction(server.hostname, svc.name, 'restart').catch(() => {}); }} sx={{ minWidth: 20, height: 18, p: 0, fontSize: '0.55rem', fontWeight: 700, color: brand.warning.main, borderColor: `${brand.warning.main}30`, borderRadius: '4px' }} variant="outlined">↻</Button>
                  </Box>
                );
              })}
            </Box>
          </Collapse>
        </Box>
      </CardContent>
    </Card>
  );
}

function StatTile({ label, value, unit, color, bar }: { label: string; value: string; unit: string; color: string; bar?: boolean }) {
  return (
    <Box sx={{ bgcolor: brand.neutral[900], borderRadius: '10px', p: 1.5, textAlign: 'center' }}>
      <Typography sx={{ color: brand.neutral[500], fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color }}>{value}{unit && <Box component="span" sx={{ fontSize: '0.6rem', color: muted, ml: 0.25, fontWeight: 500 }}>{unit}</Box>}</Typography>
      {bar && <Box sx={{ height: 3, bgcolor: brand.neutral[700], borderRadius: 2, mt: 0.75, overflow: 'hidden' }}><Box sx={{ height: '100%', width: `${Math.min(parseFloat(value) || 0, 100)}%`, bgcolor: color, borderRadius: 2, transition: 'width 0.5s ease' }} /></Box>}
    </Box>
  );
}
