import { api } from './client';

export interface PlatformSettingDto {
  key: string;
  value: string | null;
  category: string;
  label: string;
  description: string | null;
  encrypted: boolean;
  serviceKey: string | null;
  serviceName: string | null;
  serviceIcon: string | null;
  sortOrder: number;
}

export interface ServiceGroup {
  serviceKey: string;
  serviceName: string;
  serviceIcon: string;
  category: string;
  sortOrder: number;
  settings: PlatformSettingDto[];
}

export interface UpdateEntry {
  key: string;
  value: string;
}

/** Returns all platform settings grouped by service (for the table view). */
export async function listServices(): Promise<ServiceGroup[]> {
  const { data } = await api.get<ServiceGroup[]>('/api/v1/admin/platform-settings');
  return data;
}

/** Batch-update platform settings. Only changed entries need to be included. */
export async function updatePlatformSettings(
  entries: UpdateEntry[],
): Promise<Record<string, string>> {
  const { data } = await api.put<Record<string, string>>(
    '/api/v1/admin/platform-settings',
    entries,
  );
  return data;
}
