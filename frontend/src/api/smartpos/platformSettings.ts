import { api } from './client';

export interface PlatformSettingDto {
  key: string;
  value: string | null;
  category: string;
  label: string;
  description: string | null;
  encrypted: boolean;
}

export interface UpdateEntry {
  key: string;
  value: string;
}

/** Returns all platform settings grouped by category. */
export async function listPlatformSettings(): Promise<Record<string, PlatformSettingDto[]>> {
  const { data } = await api.get<Record<string, PlatformSettingDto[]>>(
    '/api/v1/admin/platform-settings',
  );
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
