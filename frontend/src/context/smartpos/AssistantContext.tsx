import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from 'react';
import { streamChat, confirmDraft, rejectDraft, type ToolResult, type DraftResponse, type PageContext } from 'src/api/smartpos/assistant';

/**
 * Derive a best-effort page context from the current URL so the assistant
 * understands "this sale" / "this product" / "this customer" without the
 * user having to repeat the reference. The backend treats it as advisory
 * — pronoun resolution, not authorisation.
 *
 * Patterns recognised (loose, can be extended without coordination):
 *   /sales/:id            → { page: 'sale-detail',     entityType: 'sale',     entityId }
 *   /products/:id         → { page: 'product-detail',  entityType: 'product',  entityId }
 *   /customers/:id        → { page: 'customer-detail', entityType: 'customer', entityId }
 *   /documents/:id        → { page: 'document-detail', entityType: 'document', entityId }
 *   /:section             → { page: section + '-list' }
 */
function derivePageContext(): PageContext | undefined {
  if (typeof window === 'undefined') return undefined;
  const path = window.location.pathname.replace(/\/+$/, '');
  if (!path) return undefined;
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return undefined;

  const uuidRe = /^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$/i;
  const singular: Record<string, string> = {
    sales: 'sale',
    products: 'product',
    customers: 'customer',
    documents: 'document',
    expenses: 'expense',
    purchases: 'purchase',
    warehouses: 'warehouse',
  };

  // Look for /<section>/<id-or-ref> patterns
  for (let i = 0; i < parts.length - 1; i++) {
    const section = parts[i];
    const next = parts[i + 1];
    if (singular[section] && (uuidRe.test(next) || /^[A-Z]+-?\d/.test(next))) {
      const entityType = singular[section];
      return {
        page: `${entityType}-detail`,
        entityType,
        entityId: uuidRe.test(next) ? next : undefined,
        entityRef: !uuidRe.test(next) ? next : undefined,
      };
    }
  }

  const last = parts[parts.length - 1];
  return { page: `${last}-list` };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'draft';
  content: string;
  timestamp: number;
  toolResult?: ToolResult;
  toolName?: string;
  draft?: DraftResponse;
  streaming?: boolean;
}

export interface ConversationMeta {
  id: string;
  title: string;
  timestamp: number;
  messageCount: number;
}

interface AssistantState {
  open: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  error: string | null;
  conversationId: string | null;
  conversations: ConversationMeta[];
  sidebarOpen: boolean;
}

interface AssistantActions {
  toggle: () => void;
  send: (message: string) => Promise<void>;
  stop: () => void;
  confirmDraftAction: (draftId: string) => Promise<void>;
  rejectDraftAction: (draftId: string) => Promise<void>;
  clearMessages: () => void;
  regenerateLast: () => void;
  editAndResend: (msgId: string, newText: string) => void;
  toggleSidebar: () => void;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  newConversation: () => void;
}

type AssistantContextValue = AssistantState & AssistantActions;

const AssistantCtx = createContext<AssistantContextValue | undefined>(undefined);

const STORAGE_KEY = 'letis_assistant';
const CONV_INDEX_KEY = 'letis_assistant_convos';
const MAX_MSGS = 15;
const TTL_MS = 60 * 60 * 1000; // 1 hour

const toolLabels: Record<string, string> = {
  searchSales: 'Searching sales records…',
  searchDocuments: 'Searching documents…',
  getRecentSales: 'Loading recent orders…',
  generateDocument: 'Generating document…',
  emailDocument: 'Preparing email…',
  sendEmail: 'Sending email…',
  sendSMS: 'Sending SMS…',
  searchProducts: 'Searching product catalog…',
  getExecutiveBriefing: 'Building executive briefing…',
  getTopProducts: 'Analyzing top products…',
  checkStock: 'Checking inventory levels…',
  checkStockByProductSearch: 'Checking inventory levels…',
  getFinancialSummary: 'Calculating financial summary…',
  getTopCustomers: 'Analyzing customer activity…',
  getSalesReport: 'Generating sales report…',
  getDailySnapshot: "Loading today's snapshot…",
  getLowStock: 'Scanning low stock items…',
  getExpiringStock: 'Checking expiry dates…',
  getSalesByStatus: 'Fetching order statuses…',
  getSalesByCustomer: 'Looking up customer purchases…',
  getStockOverview: 'Gathering stock overview…',
  getStockByWarehouse: 'Checking warehouse stock…',
  getProductDetail: 'Loading product details…',
  getProductsByCategory: 'Browsing product categories…',
  getProductsByBrand: 'Browsing product brands…',
  getInactiveProducts: 'Checking inactive products…',
  getProductCounts: 'Counting products…',
  getProductMargins: 'Calculating product margins…',
  getProductPriceRange: 'Reviewing product prices…',
  getProductInventory: 'Matching products with stock…',
  getLatestProduct: 'Finding the latest product…',
  getLatestProducts: 'Finding recently added products…',
  getInventoryMovements: 'Checking stock movements…',
  getStockValuation: 'Calculating stock value…',
  getDeadStock: 'Checking slow-moving stock…',
  getReorderSuggestions: 'Preparing reorder suggestions…',
  getCustomerProfile: 'Building customer profile…',
  getBusinessAnomalies: 'Checking business anomalies…',
  getProductTimeline: 'Checking product history…',
  getDiscountSummary: 'Calculating discount totals…',
  getTaxSummary: 'Computing tax summary…',
  getSalesComparison: 'Comparing sales periods…',
  getSalesByPaymentMethod: 'Analyzing payment methods…',
  getExpenseSummary: 'Summarizing expenses…',
  createProduct: 'Creating new product…',
  updateProductPrice: 'Updating product price…',
  adjustStock: 'Adjusting inventory…',
  createExpense: 'Recording expense…',
  createCustomer: 'Creating customer…',
  updateCustomer: 'Updating customer…',
};

function toolLoadingLabel(toolName: string) {
  return toolLabels[toolName] || 'Checking the right records…';
}

function fallbackToolResult(message: ChatMessage): ChatMessage | null {
  if (message.role !== 'tool' || !message.streaming) return message;

  const completedActions: Record<string, ToolResult> = {
    sendEmail: {
      type: 'text',
      title: 'Email Sent',
      data: { message: 'Email sent successfully.' },
    },
    emailDocument: {
      type: 'text',
      title: 'Document Emailed',
      data: { message: 'Document emailed successfully.' },
    },
    sendSMS: {
      type: 'text',
      title: 'SMS Sent',
      data: { message: 'SMS sent successfully.' },
    },
  };

  const result = message.toolName ? completedActions[message.toolName] : undefined;
  if (!result) return null;
  return { ...message, content: result.title, streaming: false, toolResult: result };
}

function normalizePersistedMessages(messages: ChatMessage[]) {
  return messages
    .map(m => (m.streaming ? { ...m, streaming: false } : m))
    .filter(m => !(m.role === 'tool' && !m.toolResult && !m.draft));
}

function loadConversations(): ConversationMeta[] {
  try {
    const raw = localStorage.getItem(CONV_INDEX_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as ConversationMeta[];
    return data.filter(c => Date.now() - c.timestamp < TTL_MS);
  } catch { /* localStorage unavailable */ return []; }
}

function saveConversations(convs: ConversationMeta[]) {
  try { localStorage.setItem(CONV_INDEX_KEY, JSON.stringify(convs)); } catch { /* localStorage unavailable */ }
}

function loadMessages(convId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${convId}`);
    if (!raw) return [];
    const data = JSON.parse(raw) as { msgs: ChatMessage[]; ts: number };
    if (Date.now() - data.ts > TTL_MS) return [];
    return normalizePersistedMessages(data.msgs).slice(-MAX_MSGS);
  } catch { /* localStorage unavailable */ return []; }
}

function saveMessages(convId: string, msgs: ChatMessage[]) {
  try {
    const toSave = msgs.filter(m => m.role !== 'tool' || m.toolResult).slice(-MAX_MSGS);
    localStorage.setItem(`${STORAGE_KEY}_${convId}`, JSON.stringify({ msgs: toSave, ts: Date.now() }));
  } catch { /* localStorage unavailable */ }
}

function removeMessages(convId: string) {
  try { localStorage.removeItem(`${STORAGE_KEY}_${convId}`); } catch { /* localStorage unavailable */ }
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationMeta[]>(loadConversations);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastUserMsgRef = useRef<string>('');

  // Persist messages when they change
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      saveMessages(conversationId, messages);
    }
  }, [messages, conversationId]);

  // Update conversation index when messages change
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      const firstUser = messages.find(m => m.role === 'user');
      const title = firstUser ? firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? '…' : '') : 'New conversation';
      const existing = loadConversations();
      const idx = existing.findIndex(c => c.id === conversationId);
      const meta: ConversationMeta = { id: conversationId, title, timestamp: Date.now(), messageCount: messages.length };
      if (idx >= 0) existing[idx] = meta;
      else existing.unshift(meta);
      // Keep max 20 conversations
      const trimmed = existing.slice(0, 20);
      saveConversations(trimmed);
      setConversations(trimmed);
    }
  }, [messages, conversationId]);

  const toggle = useCallback(() => {
    setOpen(o => {
      if (o) { setError(null); }
      return !o;
    });
  }, []);

  const send = useCallback(async (message: string) => {
    lastUserMsgRef.current = message;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: message, timestamp: Date.now() };
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now(), streaming: true };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let fullContent = '';
      let assistantTextMovedAfterTool = false;
      const pageContext = derivePageContext();
      for await (const event of streamChat({ message, pageContext }, conversationId, controller.signal)) {
        switch (event.type) {
          case 'token':
            fullContent += event.token;
            setMessages(prev => {
              const assistantIndex = prev.findIndex(m => m.id === assistantMsg.id);
              if (assistantIndex < 0) return prev;

              const updatedAssistant = { ...prev[assistantIndex], content: fullContent };
              const hasLaterToolOrDraft = prev
                .slice(assistantIndex + 1)
                .some(m => m.role === 'tool' || m.role === 'draft');

              if (!assistantTextMovedAfterTool && hasLaterToolOrDraft) {
                assistantTextMovedAfterTool = true;
                return [
                  ...prev.slice(0, assistantIndex),
                  ...prev.slice(assistantIndex + 1),
                  updatedAssistant,
                ];
              }

              return prev.map(m => m.id === assistantMsg.id ? updatedAssistant : m);
            });
            break;
          case 'meta':
            setConversationId(event.conversationId);
            break;
          case 'tool_start': {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'tool',
              content: toolLoadingLabel(event.toolName),
              timestamp: Date.now(),
              toolName: event.toolName,
              streaming: true,
            }]);
            break;
          }
          case 'tool_result':
            setMessages(prev => prev.filter(m => !(m.role === 'tool' && m.streaming)).concat({
              id: crypto.randomUUID(), role: 'tool', content: event.result.title, timestamp: Date.now(), toolResult: event.result,
            }));
            break;
          case 'draft':
            setMessages(prev => [...prev, { id: event.draft.draftId, role: 'draft', content: event.draft.summary, timestamp: Date.now(), draft: event.draft }]);
            break;
          case 'error':
            setError(event.message);
            setMessages(prev => prev
              .filter(m => !(m.role === 'tool' && m.streaming))
              .map(m => m.id === assistantMsg.id ? { ...m, streaming: false } : m));
            break;
          case 'done':
            setMessages(prev => prev
              .map(m => fallbackToolResult(m))
              .filter((m): m is ChatMessage => Boolean(m))
              .map(m => m.id === assistantMsg.id ? { ...m, streaming: false } : m));
            break;
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Something went wrong');
        setMessages(prev => prev
          .filter(m => !(m.role === 'tool' && m.streaming))
          .map(m => m.id === assistantMsg.id ? { ...m, streaming: false } : m));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [conversationId]);

  const regenerateLast = useCallback(() => {
    if (streaming) return;
    if (lastUserMsgRef.current) {
      // Remove last assistant + tool messages
      setMessages(prev => {
        const lastUserIdx = [...prev].reverse().findIndex(m => m.role === 'user');
        if (lastUserIdx < 0) return prev;
        const cutoff = prev.length - lastUserIdx;
        return prev.slice(0, cutoff);
      });
      send(lastUserMsgRef.current);
    }
  }, [streaming, send]);

  const editAndResend = useCallback((msgId: string, newText: string) => {
    if (streaming) return;
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId);
      if (idx < 0) return prev;
      return prev.slice(0, idx);
    });
    send(newText);
  }, [streaming, send]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
  }, []);

  const confirmDraftAction = useCallback(async (draftId: string) => {
    try { await confirmDraft(draftId); setMessages(prev => prev.filter(m => m.id !== draftId)); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to confirm action'); }
  }, []);

  const rejectDraftAction = useCallback(async (draftId: string) => {
    try { await rejectDraft(draftId); setMessages(prev => prev.filter(m => m.id !== draftId)); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to reject action'); }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    lastUserMsgRef.current = '';
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen(o => !o), []);

  const switchConversation = useCallback((id: string) => {
    if (streaming) return;
    // Save current conversation first
    if (conversationId && messages.length > 0) {
      saveMessages(conversationId, messages);
    }
    const msgs = loadMessages(id);
    setMessages(msgs);
    setConversationId(id);
    setSidebarOpen(false);
    setError(null);
  }, [conversationId, messages, streaming]);

  const deleteConversation = useCallback((id: string) => {
    removeMessages(id);
    const convs = loadConversations().filter(c => c.id !== id);
    saveConversations(convs);
    setConversations(convs);
    if (conversationId === id) {
      setMessages([]);
      setConversationId(null);
    }
  }, [conversationId]);

  const newConversation = useCallback(() => {
    if (streaming) return;
    if (conversationId && messages.length > 0) {
      saveMessages(conversationId, messages);
    }
    setMessages([]);
    setConversationId(null);
    setSidebarOpen(false);
    setError(null);
    lastUserMsgRef.current = '';
  }, [conversationId, messages, streaming]);

  return (
    <AssistantCtx.Provider value={{
      open, messages, streaming, error, conversationId, conversations, sidebarOpen,
      toggle, send, stop, confirmDraftAction, rejectDraftAction, clearMessages,
      regenerateLast, editAndResend, toggleSidebar, switchConversation, deleteConversation, newConversation,
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
