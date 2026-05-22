import { useEffect, useState, useCallback } from 'react';
import { Box, CircularProgress, Grid, LinearProgress } from '@mui/material';
import { getServers, getMetrics, getServices, getBackendServices } from '../api/hub';
import type { Server, MetricPoint, ServiceInfo, BackendService } from '../api/hub';
import TopBar from '../components/TopBar';
import ServerPanel from '../components/ServerPanel';
import { logout } from '../api/client';
import { brand } from '../theme';

export default function Dashboard() {
  const [servers, setServers] = useState<Server[]>([]);
  const [metrics, setMetrics] = useState<Record<string, MetricPoint[]>>({});
  const [services, setServices] = useState<Record<string, ServiceInfo[]>>({});
  const [backendSvcs, setBackendSvcs] = useState<Record<string, BackendService[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const srv = await getServers();
      setServers(srv);
      setRefreshing(true);
      await Promise.allSettled(
        srv.map((s) =>
          Promise.all([
            getMetrics(s.id as 'a' | 'b' | 'c')
              .then((m) => setMetrics((prev) => ({ ...prev, [s.id]: m })))
              .catch(() => {}),
            getServices(s.id as 'a' | 'b' | 'c')
              .then((svc) => setServices((prev) => ({ ...prev, [s.id]: svc })))
              .catch(() => {}),
            getBackendServices(s.id as 'a' | 'b' | 'c')
              .then((bs) => setBackendSvcs((prev) => ({ ...prev, [s.id]: bs })))
              .catch(() => {}),
          ])
        )
      );
    } catch {
      // Server discovery failed — handled by offline status per server
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 10000);
    return () => clearInterval(t);
  }, [fetchData]);

  const online = servers.filter((s) => s.status === 'online').length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: brand.neutral[900] }}>
        <CircularProgress size={32} sx={{ color: brand.primary[500] }} />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 1, bgcolor: brand.neutral[900], minHeight: '100vh' }}>
      <TopBar servers={servers} onlineCount={online} onRefresh={fetchData} onLogout={logout} />
      {refreshing && (
        <LinearProgress sx={{ mx: 1, borderRadius: '3px', height: 2, bgcolor: brand.neutral[800], '& .MuiLinearProgress-bar': { bgcolor: brand.primary[500] } }} />
      )}
      <Box sx={{ px: 1 }}>
        <Grid container spacing={1}>
          {servers.map((s) => (
            <Grid size={{ xs: 12, xl: 4 }} key={s.id}>
              <ServerPanel
                server={s}
                metrics={metrics[s.id] || []}
                backendSvcs={backendSvcs[s.id] || []}
                services={services[s.id] || []}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
