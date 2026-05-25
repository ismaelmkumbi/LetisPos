import { api, TOKEN_KEY } from './client';

export interface PageContext {
  page?: string;          // e.g. "sale-detail", "product-list"
  entityType?: string;    // e.g. "sale", "product", "customer"
  entityId?: string;      // UUID of the focused entity
  entityRef?: string;     // human-readable ref (INV-2026-000002, SKU-001)
  // Free-form extras the caller can attach (selected line ids, filter state, …).
  [key: string]: string | undefined;
}

export interface ChatRequest {
  message: string;
  language?: string;
  pageContext?: PageContext;
}

export interface ToolResult {
  type: 'time_series' | 'ranking' | 'comparison' | 'proportion' | 'metric' | 'table' | 'text' | 'briefing';
  title: string;
  data: Record<string, unknown>;
}

export interface DraftResponse {
  draftId: string;
  toolName: string;
  summary: string;
  toolInput: Record<string, unknown>;
}

export type StreamEvent =
  | { type: 'meta'; conversationId: string }
  | { type: 'token'; token: string }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_result'; result: ToolResult }
  | { type: 'draft'; draft: DraftResponse }
  | { type: 'error'; message: string; code: string; hint?: string }
  | { type: 'verification'; grounded: boolean; score: number; unverified: string[] }
  | { type: 'done' };

export async function* streamChat(
  request: ChatRequest,
  conversationId: string | null,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const token = localStorage.getItem(TOKEN_KEY) || '';

  const params = new URLSearchParams();
  if (conversationId) params.set('conversationId', conversationId);
  const queryString = params.toString();

  const response = await fetch(`/api/v1/ai/assistant/chat${queryString ? '?' + queryString : ''}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Assistant unavailable (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';
  let dataLines: string[] = [];

  function parseEvent(eventName: string, dataStr: string): StreamEvent | null {
    if (!dataStr || dataStr === '{}') {
      return eventName === 'done' ? { type: 'done' } : null;
    }

    try {
      const payload = JSON.parse(dataStr);
      switch (eventName) {
        case 'meta':
          return { type: 'meta', conversationId: payload.conversationId || '' };
        case 'token':
          return { type: 'token', token: payload.token || '' };
        case 'tool_start':
          return { type: 'tool_start', toolName: payload.toolName || '' };
        case 'tool_result':
          return { type: 'tool_result', result: payload as ToolResult };
        case 'draft':
          return { type: 'draft', draft: payload as DraftResponse };
        case 'error':
          return { type: 'error', message: payload.message || 'Unknown error', code: payload.code || 'UNKNOWN', hint: payload.hint };
        case 'verification':
          return { type: 'verification', grounded: !!payload.grounded, score: Number(payload.score ?? 1), unverified: Array.isArray(payload.unverified) ? payload.unverified : [] };
        case 'done':
          return { type: 'done' };
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  function flushEvent(): StreamEvent | null {
    if (!currentEvent) return null;
    const event = parseEvent(currentEvent, dataLines.join('\n').trim());
    currentEvent = '';
    dataLines = [];
    return event;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      const tail = buffer.trim();
      if (tail) {
        for (const line of tail.split(/\r?\n/)) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          }
        }
      }
      const finalEvent = flushEvent();
      if (finalEvent) yield finalEvent;
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        const pendingEvent = flushEvent();
        if (pendingEvent) yield pendingEvent;
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      } else if (line.trim() === '') {
        const event = flushEvent();
        if (event) yield event;
      }
    }
  }
}

export async function confirmDraft(draftId: string): Promise<void> {
  await api.post(`/api/v1/ai/assistant/confirm/${draftId}`);
}

export async function rejectDraft(draftId: string): Promise<void> {
  await api.post(`/api/v1/ai/assistant/reject/${draftId}`);
}
