import { api, TOKEN_KEY } from './client';

export interface ChatRequest {
  message: string;
  conversationId?: string | null;
  language?: string;
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
  | { type: 'token'; token: string }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_result'; result: ToolResult }
  | { type: 'draft'; draft: DraftResponse }
  | { type: 'error'; message: string; code: string }
  | { type: 'done' };

export async function* streamChat(
  request: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const token = localStorage.getItem(TOKEN_KEY) || '';

  const response = await fetch(`/api/v1/ai/assistant/chat`, {
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

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        const dataStr = line.slice(5).trim();
        if (!dataStr || dataStr === '{}') {
          if (currentEvent === 'done') yield { type: 'done' };
          continue;
        }
        try {
          const payload = JSON.parse(dataStr);
          switch (currentEvent) {
            case 'token':
              yield { type: 'token', token: payload.token || '' };
              break;
            case 'tool_start':
              yield { type: 'tool_start', toolName: payload.toolName || '' };
              break;
            case 'tool_result':
              yield { type: 'tool_result', result: payload as ToolResult };
              break;
            case 'draft':
              yield { type: 'draft', draft: payload as DraftResponse };
              break;
            case 'error':
              yield { type: 'error', message: payload.message || 'Unknown error', code: payload.code || 'UNKNOWN' };
              break;
          }
        } catch {
          // skip unparseable data
        }
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
