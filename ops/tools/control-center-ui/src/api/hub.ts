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

export const getServers = () => hubApi.get<Server[]>('/api/v1/servers').then(r => r.data);
export const getServer = (name: string) => hubApi.get<Server>(`/api/v1/servers/${name}`).then(r => r.data);
export const getMetrics = (name: string, from: string, to: string) =>
  hubApi.get<MetricPoint[]>(`/api/v1/servers/${name}/metrics`, { params: { from, to } }).then(r => r.data);
export const getServices = (name: string) =>
  hubApi.get<ServiceInfo[]>(`/api/v1/servers/${name}/services`).then(r => r.data);
export const serviceAction = (server: string, svc: string, action: string) =>
  hubApi.post(`/api/v1/servers/${server}/services/${encodeURIComponent(svc)}/${action}`);
export const getLogs = (server: string, svc: string, tail = 100, filter?: string, grep?: boolean) =>
  hubApi.get<string>(`/api/v1/servers/${server}/logs/${svc}`, { params: { tail, filter, grep: grep ? '1' : undefined } }).then(r => r.data);

export interface BackendService {
  name: string; category: string; port: number; status: 'UP' | 'DOWN'; description: string;
}
export const getBackendServices = (server: string) =>
  hubApi.get<BackendService[]>(`/api/v1/servers/${server}/backend-services`).then(r => r.data);

export interface ProcessInfo {
  name: string; pid: number; cpu_pct: number; mem_mb: number; port: number;
}
export const getProcesses = (server: string) =>
  hubApi.get<ProcessInfo[]>(`/api/v1/servers/${server}/processes`).then(r => r.data);
