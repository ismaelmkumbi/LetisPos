import { api } from './client';

export interface OnboardingEvent {
  event: string;
  step?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export async function trackEvent(event: OnboardingEvent): Promise<void> {
  try {
    await api.post('/api/v1/analytics/events', event);
  } catch {
    // Silently fail — analytics are non-critical
  }
}
