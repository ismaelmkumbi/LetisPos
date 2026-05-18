import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { streamChat, confirmDraft, rejectDraft, type ToolResult, type DraftResponse } from 'src/api/smartpos/assistant';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'draft';
  content: string;
  timestamp: number;
  toolResult?: ToolResult;
  draft?: DraftResponse;
  streaming?: boolean;
}

interface AssistantState {
  open: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  conversationId: string | null;
}

interface AssistantActions {
  toggle: () => void;
  send: (message: string) => Promise<void>;
  stop: () => void;
  confirmDraftAction: (draftId: string) => Promise<void>;
  rejectDraftAction: (draftId: string) => Promise<void>;
  clearMessages: () => void;
}

type AssistantContextValue = AssistantState & AssistantActions;

const AssistantCtx = createContext<AssistantContextValue | undefined>(undefined);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const toggle = useCallback(() => setOpen(o => !o), []);

  const send = useCallback(async (message: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'user', content: message, timestamp: Date.now(),
    };
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now(), streaming: true,
    };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let fullContent = '';
      for await (const event of streamChat({ message }, conversationId, controller.signal)) {
        switch (event.type) {
          case 'token':
            fullContent += event.token;
            setMessages(prev => prev.map(m =>
              m.id === assistantMsg.id ? { ...m, content: fullContent } : m));
            break;
          case 'meta':
            setConversationId(event.conversationId);
            break;
          case 'tool_start':
            // Could show loading indicator
            break;
          case 'tool_result':
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(), role: 'tool', content: event.result.title,
              timestamp: Date.now(), toolResult: event.result,
            }]);
            break;
          case 'draft':
            setMessages(prev => [...prev, {
              id: event.draft.draftId, role: 'draft',
              content: event.draft.summary, timestamp: Date.now(),
              draft: event.draft,
            }]);
            break;
          case 'error':
            setError(event.message);
            setMessages(prev => prev.map(m =>
              m.id === assistantMsg.id ? { ...m, streaming: false } : m));
            break;
          case 'done':
            setMessages(prev => prev.map(m =>
              m.id === assistantMsg.id ? { ...m, streaming: false } : m));
            break;
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Something went wrong');
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id ? { ...m, streaming: false } : m));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
  }, []);

  const confirmDraftAction = useCallback(async (draftId: string) => {
    try {
      await confirmDraft(draftId);
      setMessages(prev => prev.filter(m => m.id !== draftId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to confirm action');
    }
  }, []);

  const rejectDraftAction = useCallback(async (draftId: string) => {
    try {
      await rejectDraft(draftId);
      setMessages(prev => prev.filter(m => m.id !== draftId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject action');
    }
  }, []);

  const clearMessages = useCallback(() => { setMessages([]); setConversationId(null); }, []);

  return (
    <AssistantCtx.Provider value={{
      open, messages, streaming, error, conversationId,
      toggle, send, stop, confirmDraftAction, rejectDraftAction, clearMessages,
    }}>
      {children}
    </AssistantCtx.Provider>
  );
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantCtx);
  if (!ctx) throw new Error('useAssistant must be used inside AssistantProvider');
  return ctx;
}
