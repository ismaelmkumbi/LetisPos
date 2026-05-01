/**
 * i18n admin API — backed by user-service /api/v1/i18n.
 * Fetches the language catalogue and bundles for the runtime; admins
 * can also add languages and edit translation strings.
 */
import { api } from './client';
import type { UUID } from './types';

export interface Language {
  id: UUID;
  code: string;
  name: string;
  rtl: boolean;
  enabled: boolean;
  isDefault: boolean;
}

export interface Translation {
  id: UUID;
  languageCode: string;
  namespace: string;
  key: string;
  value: string;
  updatedAt: string;
}

export async function listLanguages(): Promise<Language[]> {
  const { data } = await api.get<Language[]>('/api/v1/i18n/languages');
  return data;
}

/** Returns { namespace: { key: value } } for the chosen language. */
export async function getBundle(languageCode: string): Promise<Record<string, Record<string, string>>> {
  const { data } = await api.get<Record<string, Record<string, string>>>(`/api/v1/i18n/${encodeURIComponent(languageCode)}`);
  return data;
}

export async function addLanguage(code: string, name: string, rtl = false): Promise<Language> {
  const { data } = await api.post<Language>('/api/v1/i18n/languages', null, { params: { code, name, rtl } });
  return data;
}

export async function upsertTranslation(
  languageCode: string, namespace: string, key: string, value: string,
): Promise<Translation> {
  const { data } = await api.put<Translation>(
    `/api/v1/i18n/${encodeURIComponent(languageCode)}/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`,
    value,
    { headers: { 'Content-Type': 'text/plain' } },
  );
  return data;
}

export async function bulkUpsert(
  languageCode: string, namespace: string, entries: Record<string, string>,
): Promise<{ upserted: number }> {
  const { data } = await api.post<{ upserted: number }>(
    `/api/v1/i18n/${encodeURIComponent(languageCode)}/${encodeURIComponent(namespace)}/bulk`,
    entries,
  );
  return data;
}
