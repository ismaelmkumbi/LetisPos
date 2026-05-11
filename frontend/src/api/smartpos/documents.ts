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
  fiscalCode?: string;
  zNumber?: string;
  vfdStatus?: string;
  buyerTin?: string;
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

export interface DocumentVersion {
  id: UUID;
  documentId: UUID;
  versionNumber: number;
  storagePath: string;
  changeType: string;
  changeSummary?: string;
  createdBy?: UUID;
  createdAt: string;
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

export async function previewDocument(req: GenerateDocumentRequest): Promise<Blob> {
  const response = await api.post<Blob>('/api/v1/documents/preview', req, { responseType: 'blob' });
  return response.data;
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

// ---- Version Endpoints ----

export async function listDocumentVersions(id: UUID): Promise<DocumentVersion[]> {
  const { data } = await api.get<DocumentVersion[]>(`/api/v1/documents/${id}/versions`);
  return data;
}

export async function downloadVersionPdf(documentId: UUID, versionId: UUID): Promise<Blob> {
  const response = await api.get<Blob>(`/api/v1/documents/${documentId}/versions/${versionId}/pdf`, { responseType: 'blob' });
  return response.data;
}

// ---- Template Version Endpoints ----

export interface TemplateVersionDto {
  id: UUID;
  templateOverrideId: UUID;
  versionNumber: number;
  bodyHtml: string;
  changeDescription?: string;
  updatedBy?: UUID;
  updatedAt: string;
}

export async function listTemplateVersions(documentType: string): Promise<TemplateVersionDto[]> {
  const { data } = await api.get<TemplateVersionDto[]>(`/api/v1/templates/${documentType}/versions`);
  return data;
}

export async function rollbackTemplate(documentType: string, version: number): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(`/api/v1/templates/${documentType}/rollback`, { version });
  return data;
}

// ---- Bulk Generation Endpoints ----

export interface BulkGenerateRequest {
  documentType: string;
  referenceType: string;
  referenceIds: UUID[];
}

export interface BulkJobDto {
  id: UUID;
  status: string;
  progress: number;
  total: number;
  results?: Array<{ referenceId: UUID; documentId: UUID; documentNumber: string; status: string }>;
  createdAt: string;
}

export async function bulkGenerate(req: BulkGenerateRequest): Promise<BulkJobDto> {
  const { data } = await api.post<BulkJobDto>('/api/v1/documents/bulk', req);
  return data;
}

export async function getBulkJobStatus(jobId: UUID): Promise<BulkJobDto> {
  const { data } = await api.get<BulkJobDto>(`/api/v1/documents/bulk/${jobId}`);
  return data;
}

export async function downloadBulkJob(jobId: UUID): Promise<Blob> {
  const response = await api.get<Blob>(`/api/v1/documents/bulk/${jobId}/download`, { responseType: 'blob' });
  return response.data;
}

// ---- Search Endpoints ----

export interface DocumentSearchParams {
  q?: string;
  documentType?: string;
  status?: string;
  referenceType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export async function searchDocuments(params: DocumentSearchParams = {}): Promise<Page<DocumentDto>> {
  const { data } = await api.get<Page<DocumentDto>>('/api/v1/documents/search', { params });
  return data;
}

// ---- VFD Endpoints ----

export async function retryVfdSubmission(id: UUID): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(`/api/v1/documents/${id}/vfd/retry`);
  return data;
}

// ---- Printer Endpoints ----

export interface PrinterInfo {
  id: string;
  name: string;
  paperWidth: number;
  autoCut: boolean;
  cashDrawer: boolean;
}

export async function listPrinters(): Promise<PrinterInfo[]> {
  const { data } = await api.get<PrinterInfo[]>('/api/v1/print/printers');
  return data;
}

export async function printThermal(printerId: string, saleData: Record<string, unknown>): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>('/api/v1/print/thermal', { printerId, saleData });
  return data;
}

export async function testPrint(printerId: string): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>('/api/v1/print/thermal/test', { printerId });
  return data;
}

// ---- AI Endpoints ----

export async function summarizeDocument(id: UUID): Promise<{ summary: string }> {
  const { data } = await api.post<{ summary: string }>(`/api/v1/documents/${id}/summarize`);
  return data;
}

export async function detectAnomalies(id: UUID): Promise<{ anomalies: Array<{ field: string; severity: string; message: string; suggestion?: string }> }> {
  const { data } = await api.post<{ anomalies: Array<{ field: string; severity: string; message: string; suggestion?: string }> }>(`/api/v1/documents/${id}/anomalies`);
  return data;
}

export async function fieldMap(body: { documentType: string; headers: string[] }): Promise<{ mappings: Record<string, string>; confidence: number }> {
  const { data } = await api.post<{ mappings: Record<string, string>; confidence: number }>('/api/v1/documents/field-map', body);
  return data;
}

export async function assistTemplate(documentType: string, prompt: string, currentConfig: string): Promise<Record<string, unknown>> {
  const { data } = await api.post<Record<string, unknown>>(`/api/v1/templates/${documentType}/assist`, { prompt, currentConfig });
  return data;
}
