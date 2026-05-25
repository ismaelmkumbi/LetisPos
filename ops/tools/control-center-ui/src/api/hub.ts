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
  name: string; containerName?: string; category: string; port: number; status: 'UP' | 'DOWN'; description: string;
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
    // The LSA agent returns nested structures:
    // { cpu: { percent_used }, memory: { used_bytes, total_bytes },
    //   disk: { mounts: [{path, used_bytes, total_bytes}] },
    //   load_avg: { load1, load5, load15 } }
    const rootDisk = m.disk?.mounts?.find((d: Record<string, unknown>) => d.path === '/') ?? {};
    const cpu = m.cpu?.percent_used ?? null;
    const mem = m.memory?.used_bytes ?? null;
    const memTotal = m.memory?.total_bytes ?? null;
    const diskUsed = (rootDisk as Record<string, number>).used_bytes ?? null;
    const diskTotal = (rootDisk as Record<string, number>).total_bytes ?? null;
    const l1 = m.load_avg?.load1 ?? null;
    const l5 = m.load_avg?.load5 ?? null;
    const l15 = m.load_avg?.load15 ?? null;
    console.log(`[metrics ${server}] cpu=${cpu} mem=${mem} disk=${diskUsed} load=${l1}`);
    return [{
      time: new Date().toISOString(),
      serverName: server,
      cpuPercent: typeof cpu === 'number' ? cpu : null,
      memUsedBytes: typeof mem === 'number' ? mem : null,
      memTotalBytes: typeof memTotal === 'number' ? memTotal : null,
      diskUsedBytes: typeof diskUsed === 'number' ? diskUsed : null,
      diskTotalBytes: typeof diskTotal === 'number' ? diskTotal : null,
      load1: typeof l1 === 'number' ? l1 : null,
      load5: typeof l5 === 'number' ? l5 : null,
      load15: typeof l15 === 'number' ? l15 : null,
    }];
  }).catch((err) => {
    console.error(`[metrics ${server}] FAILED:`, err);
    return [];
  });

export const getServices = (server: ServerId) =>
  agents[server].get('/services').then((r) => (Array.isArray(r.data) ? r.data : []));

const CATEGORY_MAP: Record<string, string> = {
  gateway: 'Core', nginx: 'Core', auth: 'Core', 'user-service': 'Core', 'user': 'Core',
  'control-hub': 'Core', 'control-center': 'Core',
  product: 'Catalog', catalog: 'Catalog', inventory: 'Inventory',
  sales: 'Sales', order: 'Sales', cart: 'Sales',
  payment: 'Finance', billing: 'Finance', commerce: 'Finance',
  report: 'Insight', analytics: 'Insight',
  ai: 'Intelligence', intelligence: 'Intelligence', ml: 'Intelligence',
  hrm: 'People', crm: 'People', notification: 'Platform',
  document: 'Platform', integration: 'Platform', audit: 'Platform',
  minio: 'Platform', gotenberg: 'Platform', prometheus: 'Platform',
  'node-exporter': 'Platform', alertmanager: 'Platform', backup: 'Platform',
  redis: 'Platform', kafka: 'Platform', postgres: 'Platform',
  frontend: 'Core',
};

function deriveServiceCategory(name: string, image: string): string {
  const lower = (name + ' ' + image).toLowerCase();
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return cat;
  }
  return 'Platform';
}

function extractServicePort(_name: string, desc: string): number {
  // Try docker-compose port pattern in description: "0.0.0.0:8080->8080/tcp"
  const m = desc.match(/(\d+)->\d+\/tcp/);
  if (m) return Number(m[1]);
  // Try standalone port in name: "letispos-auth" has well-known ports
  return 0;
}

function normalizeDockerStatus(status: string): 'UP' | 'DOWN' {
  return status === 'running' || status === 'UP' || status === 'up' ? 'UP' : 'DOWN';
}

export const getBackendServices = (server: ServerId) =>
  agents[server].get('/services').then((r) => {
    if (!Array.isArray(r.data)) return [];
    return r.data.map((raw: Record<string, unknown>) => {
      const name = String(raw.name || '');
      const desc = String(raw.description || '');
      return {
        name,
        containerName: typeof raw.containerName === 'string' ? raw.containerName : undefined,
        category: String(raw.category || deriveServiceCategory(name, desc)),
        port: Number(raw.port) || extractServicePort(name, desc) || 0,
        status: normalizeDockerStatus(String(raw.status || '')),
        description: desc,
        cpuPercent: typeof raw.cpuPercent === 'number' ? raw.cpuPercent : undefined,
        memUsedBytes: typeof raw.memUsedBytes === 'number' ? raw.memUsedBytes : undefined,
        pid: typeof raw.pid === 'number' ? raw.pid : undefined,
        command: typeof raw.command === 'string' ? raw.command : undefined,
      };
    });
  });

export const serviceAction = (server: ServerId, svc: string, action: string) =>
  agents[server].post(`/services/${encodeURIComponent(svc)}/${action}`);

export const getLogs = (server: ServerId, svc: string, tail = 100, filter?: string, grep?: boolean) =>
  agents[server].get<string>(`/logs/${svc}`, { params: { tail, filter, grep } }).then((r) => r.data);

export const clearLogs = (server: ServerId, svc: string) =>
  agents[server].post(`/logs/clear/${svc}`).then((r) => r.data);

export const getProcesses = (server: ServerId) =>
  agents[server].get('/processes').then((r) => (Array.isArray(r.data) ? r.data : []));
