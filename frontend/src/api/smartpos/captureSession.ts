import { api } from './client';

export interface CreateSessionResponse {
  sessionId: string;
  /** Pre-baked URL for the QR code; already carries the upload token in `?t=`. */
  qrUrl: string;
  /** Session-scoped credential the phone must echo back as X-Capture-Token. */
  uploadToken: string;
  expiresAt: string;
}

export interface PhotoInfo {
  photoId: string;
  index: number;
  thumbnailUrl: string;
  fullUrl: string;
}

export interface SessionPhotosResponse {
  sessionId: string;
  photos: PhotoInfo[];
  complete: boolean;
  photoCount: number;
}

export interface CompleteResponse {
  sessionId: string;
  photoCount: number;
  complete: boolean;
}

export async function createCaptureSession(): Promise<CreateSessionResponse> {
  const { data } = await api.post<CreateSessionResponse>('/api/v1/ai/capture-sessions');
  return data;
}

export async function getCaptureSessionPhotos(sessionId: string): Promise<SessionPhotosResponse> {
  const { data } = await api.get<SessionPhotosResponse>(
    `/api/v1/ai/capture-sessions/${sessionId}/photos`,
  );
  return data;
}

export async function deleteCaptureSession(sessionId: string): Promise<void> {
  await api.delete(`/api/v1/ai/capture-sessions/${sessionId}`);
}
