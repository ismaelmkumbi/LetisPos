import axios from 'axios';
import { tokenStore, refreshAccessToken } from './client';

const SERVERS = ['a', 'b', 'c'] as const;
export type ServerId = (typeof SERVERS)[number];

function agentApi(server: ServerId) {
  const inst = axios.create({
    baseURL: `/api/agent/${server}`,
    timeout: 15000,
    withCredentials: true,
  });
  inst.interceptors.request.use((config) => {
    const token = tokenStore.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  inst.interceptors.response.use(
    (r) => r,
    async (error) => {
      if (error.response?.status === 401 && !error.config._retry) {
        error.config._retry = true;
        const next = await refreshAccessToken();
        if (next) {
          error.config.headers.Authorization = `Bearer ${next}`;
          return inst.request(error.config);
        }
        tokenStore.clear();
      }
      return Promise.reject(error);
    },
  );
  return inst;
}

const agents = Object.fromEntries(SERVERS.map((s) => [s, agentApi(s)])) as Record<ServerId, ReturnType<typeof agentApi>>;

export interface Server {
  id: string; hostname: string; ipAddress: string; version: string;
  status: 'online' | 'offline'; lastSeen: string;
}

export interface MetricPoint {
  time: string; serverName: string;
  cpuPercent: number | null; memUsedBytes: number | null; memTotalBytes: number | null;
  diskUsedBytes: number | null; diskTotalBytes: number | null;
  load1: number | null; load5: number | null; load15: number | null;
}

export interface ServiceInfo {
  name: string; type: string; status: string; description: string;
}

export interface BackendService {
  name: string; category: string; port: number; status: 'UP' | 'DOWN'; description: string;
  cpuPercent?: number; memUsedBytes?: number; pid?: number; command?: string;
}

export interface ProcessInfo {
  pid: number; cpuPercent: number; memKB: number; command: string;
}

export async function getServers(): Promise<Server[]> {
  const results = await Promise.allSettled(
    SERVERS.map((id) =>
      agents[id].get('/health').then((r) => ({
        id,
        hostname: r.data.server || `letispos-${id}`,
        ipAddress: `10.0.0.${id === 'a' ? 1 : id === 'b' ? 2 : 3}`,
        version: r.data.version || '',
        status: 'online' as const,
        lastSeen: new Date().toISOString(),
      }))
    )
  );
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          id: SERVERS[i],
          hostname: `letispos-${SERVERS[i]}`,
          ipAddress: '',
          version: '',
          status: 'offline' as const,
          lastSeen: '',
        }
  );
}

export const getMetrics = (server: ServerId) =>
  agents[server].get('/metrics').then((r) => {
    const m = r.data;
    return [{
      time: new Date().toISOString(),
      serverName: server,
      cpuPercent: m.cpu_percent ?? null,
      memUsedBytes: m.mem_used ?? null,
      memTotalBytes: m.mem_total ?? null,
      diskUsedBytes: m.disk_used ?? null,
      diskTotalBytes: m.disk_total ?? null,
      load1: m.load1 ?? null,
      load5: m.load5 ?? null,
      load15: m.load15 ?? null,
    }];
  });

export const getServices = (server: ServerId) =>
  agents[server].get('/services').then((r) => (Array.isArray(r.data) ? r.data : []));

export const getBackendServices = (server: ServerId) =>
  agents[server].get('/services').then((r) => (Array.isArray(r.data) ? r.data : []));

export const serviceAction = (server: ServerId, svc: string, action: string) =>
  agents[server].post(`/services/${encodeURIComponent(svc)}/${action}`);

export const getLogs = (server: ServerId, svc: string, tail = 100, filter?: string, grep?: boolean) =>
  agents[server].get<string>(`/logs/${svc}`, { params: { tail, filter, grep } }).then((r) => r.data);

export const clearLogs = (server: ServerId, svc: string) =>
  agents[server].post(`/logs/clear/${svc}`).then((r) => r.data);

export const getProcesses = (server: ServerId) =>
  agents[server].get('/processes').then((r) => (Array.isArray(r.data) ? r.data : []));
