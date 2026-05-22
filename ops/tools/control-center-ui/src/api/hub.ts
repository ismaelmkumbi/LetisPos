import { hubApi } from './client';

export interface Server {
  id: string; hostname: string; ipAddress: string; version: string;
  status: 'online' | 'offline'; lastSeen: string;
}

export interface MetricPoint {
  id: number; time: string; serverName: string;
  cpuPercent: number | null; memUsedBytes: number | null; memTotalBytes: number | null;
  diskUsedBytes: number | null; diskTotalBytes: number | null;
  netRxBytes: number | null; netTxBytes: number | null;
  load1: number | null; load5: number | null; load15: number | null;
}

export interface ServiceInfo {
  name: string; type: string; status: string; description: string;
}

// LSA Agent serves flat endpoints. We hardcode 3 known servers.
const SERVERS: Server[] = [
  { id: 'a', hostname: 'letispos-a', ipAddress: '10.0.0.1', version: '1.0.0', status: 'online', lastSeen: '' },
  { id: 'b', hostname: 'letispos-b', ipAddress: '10.0.0.2', version: '1.0.0', status: 'online', lastSeen: '' },
  { id: 'c', hostname: 'letispos-c', ipAddress: '10.0.0.3', version: '1.0.0', status: 'online', lastSeen: '' },
];

export const getServers = () => Promise.resolve(SERVERS);
export const getServer = (name: string) =>
  hubApi.get('/health').then(r => ({
    id: name, hostname: r.data.server || name,
    ipAddress: '', version: r.data.version || '', status: 'online' as const, lastSeen: ''
  }));

export const getMetrics = (_name: string, _from: string, _to: string) =>
  hubApi.get('/metrics').then(r => {
    const m = r.data;
    return [{
      id: Date.now(), time: new Date().toISOString(), serverName: _name,
      cpuPercent: m.cpu_percent ?? null,
      memUsedBytes: m.mem_used ?? null, memTotalBytes: m.mem_total ?? null,
      diskUsedBytes: m.disk_used ?? null, diskTotalBytes: m.disk_total ?? null,
      netRxBytes: m.net_rx ?? null, netTxBytes: m.net_tx ?? null,
      load1: m.load1 ?? null, load5: m.load5 ?? null, load15: m.load15 ?? null,
    }];
  });

export const getServices = (_name: string) =>
  hubApi.get('/services').then(r => (Array.isArray(r.data) ? r.data : []));

export const serviceAction = (_server: string, svc: string, action: string) =>
  hubApi.post(`/services/${encodeURIComponent(svc)}/${action}`);

export const getLogs = (_server: string, svc: string, tail = 100, filter?: string, grep?: boolean) =>
  hubApi.get<string>(`/logs/${svc}`, { params: { tail, filter, grep } }).then(r => r.data);

export const clearLogs = (_server: string, svc: string) =>
  hubApi.post(`/logs/clear/${svc}`).then(r => r.data);

export interface BackendService {
  name: string; category: string; port: number; status: 'UP' | 'DOWN'; description: string;
  cpuPercent?: number; memUsedBytes?: number; pid?: number; command?: string;
}
export const getBackendServices = (_server: string) =>
  hubApi.get('/services').then(r => (Array.isArray(r.data) ? r.data : []));

export interface ProcessInfo {
  pid: number; cpuPercent: number; memKB: number; command: string;
}
export const getProcesses = (_server: string) =>
  hubApi.get('/processes').then(r => (Array.isArray(r.data) ? r.data : []));
