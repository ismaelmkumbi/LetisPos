import { api } from './client';
import type { UUID, Page } from './types';

// ---- Types ----

export interface GenerateDocumentRequest {
  documentType: string;
  referenceType?: string;
  referenceId?: UUID;
  contextData?: Record<string, unknown>;
}

export interface DocumentDto {
  id: UUID;
  tenantId: UUID;
  documentType: string;
  documentNumber: string;
  referenceType?: string;
  referenceId?: UUID;
  status: string;
  watermark?: string;
  sizeBytes?: number;
  presignedUrl?: string;
  createdAt: string;
}

export interface TemplateInfo {
  documentType: string;
  name: string;
  isOverridden: boolean;
  placeholders: string[];
}

export interface EmailRequest {
  to: string;
  subject: string;
  message?: string;
}

export interface WhatsAppRequest {
  phone: string;
  message?: string;
}

// ---- Document Endpoints ----

export async function generateDocument(
  req: GenerateDocumentRequest,
): Promise<DocumentDto> {
  const { data } = await api.post<DocumentDto>(
    '/api/v1/documents/generate',
    req,
  );
  return data;
}

export async function getDocument(id: UUID): Promise<DocumentDto> {
  const { data } = await api.get<DocumentDto>(`/api/v1/documents/${id}`);
  return data;
}

export async function getDocumentPdfUrl(id: UUID): Promise<string> {
  const { data } = await api.get<DocumentDto>(`/api/v1/documents/${id}`);
  return data.presignedUrl ?? '';
}

export async function downloadDocumentPdf(id: UUID): Promise<Blob> {
  const response = await api.get<Blob>(`/api/v1/documents/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function emailDocument(
  id: UUID,
  req: EmailRequest,
): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(
    `/api/v1/documents/${id}/email`,
    req,
  );
  return data;
}

export async function whatsappDocument(
  id: UUID,
  req: WhatsAppRequest,
): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(
    `/api/v1/documents/${id}/whatsapp`,
    req,
  );
  return data;
}

export async function listDocuments(params: {
  type?: string;
  referenceId?: UUID;
  page?: number;
  size?: number;
} = {}): Promise<Page<DocumentDto>> {
  const { data } = await api.get<Page<DocumentDto>>('/api/v1/documents', {
    params,
  });
  return data;
}

// ---- Template Endpoints ----

export async function listTemplates(): Promise<TemplateInfo[]> {
  const { data } = await api.get<TemplateInfo[]>('/api/v1/templates');
  return data;
}

export async function getTemplate(
  documentType: string,
): Promise<{ documentType: string; bodyHtml: string }> {
  const { data } = await api.get<{ documentType: string; bodyHtml: string }>(
    `/api/v1/templates/${documentType}`,
  );
  return data;
}

export async function saveTemplateOverride(
  documentType: string,
  bodyHtml: string,
  name?: string,
): Promise<{ documentType: string; name: string; version: number }> {
  const { data } = await api.put<{
    documentType: string;
    name: string;
    version: number;
  }>(`/api/v1/templates/${documentType}`, { bodyHtml, name });
  return data;
}

export async function deleteTemplateOverride(
  documentType: string,
): Promise<void> {
  await api.delete(`/api/v1/templates/${documentType}`);
}

export async function previewTemplate(
  documentType: string,
  bodyHtml?: string,
): Promise<Blob> {
  const response = await api.post<Blob>(
    `/api/v1/templates/${documentType}/preview`,
    { bodyHtml },
    { responseType: 'blob' },
  );
  return response.data;
}
