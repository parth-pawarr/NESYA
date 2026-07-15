/**
 * NESYA — Chat Store (Zustand)
 *
 * Conversations are now persisted in PostgreSQL.
 * The store manages:
 *  - Active session state (messages rendered on-screen)
 *  - Sidebar conversation list (fetched from DB)
 *  - UI state (theme, panels, toasts)
 *
 * What is NOT persisted to localStorage anymore:
 *  - chat sessions / messages  (these come from the DB)
 *
 * What IS persisted:
 *  - theme, showSidebar, showFIRPanel (pure UI preferences)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ConversationSummary,
  ConversationDetail,
  FIRDocument,
} from '../services/api';

// ── Local session (in-memory, for the currently open chat) ────────────────────

export interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  /** UUID from the DB Conversation row */
  db_id: string;
  /** NLP session id used by the backend in-memory pipeline */
  session_id: string;
  title: string | null;
  messages: LocalMessage[];
  missing_fields: string[];
  completion_percentage: number;
  fir_data?: FIRDocument;
  status: 'collecting' | 'analyzing' | 'fir_ready' | 'error' | 'idle';
  suggested_replies: string[];
  created_at: string;
  updated_at: string;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// ── Store interface ────────────────────────────────────────────────────────────

interface ChatStore {
  // ── Active session (in-memory) ───────────────────────────────────────────
  activeSession: ChatSession | null;

  // ── Sidebar (server-side list) ───────────────────────────────────────────
  conversations: ConversationSummary[];
  conversationsPage: number;
  hasMoreConversations: boolean;
  loadingConversations: boolean;
  searchResults: ConversationSummary[] | null;   // null = not searching
  searchQuery: string;

  // ── UI state ─────────────────────────────────────────────────────────────
  isTyping: boolean;
  isLoading: boolean;
  theme: 'dark' | 'light';
  showFIRPanel: boolean;
  showSidebar: boolean;
  toasts: Toast[];

  // ── Actions: active session ───────────────────────────────────────────────
  setActiveSession: (session: ChatSession | null) => void;
  updateActiveSession: (updates: Partial<ChatSession>) => void;
  addMessageToActive: (msg: LocalMessage) => void;
  clearActiveSession: () => void;

  // ── Actions: conversation list ────────────────────────────────────────────
  setConversations: (list: ConversationSummary[], page: number, hasMore: boolean) => void;
  appendConversations: (list: ConversationSummary[], page: number, hasMore: boolean) => void;
  upsertConversation: (item: ConversationSummary) => void;
  removeConversation: (id: string) => void;
  setLoadingConversations: (v: boolean) => void;
  setSearchResults: (results: ConversationSummary[] | null, query: string) => void;

  // ── Actions: UI ───────────────────────────────────────────────────────────
  setTyping: (v: boolean) => void;
  setLoading: (v: boolean) => void;
  setTheme: (t: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setShowFIRPanel: (v: boolean) => void;
  setShowSidebar: (v: boolean) => void;
  addToast: (msg: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;

  // ── Full reset (call on logout + before login of new user) ─────────────────
  resetForUser: () => void;

  // ── Helpers ───────────────────────────────────────────────────────────────
  getActiveDbId: () => string | null;
  getActiveSessionId: () => string | null;
}

// ── Helper: build a ChatSession from a ConversationDetail ─────────────────────
export function sessionFromDetail(detail: ConversationDetail): ChatSession {
  const messages: LocalMessage[] = detail.messages.map((m) => ({
    id: m.id,
    role: m.role === 'system' ? 'assistant' : m.role,
    content: m.content,
    timestamp: m.created_at,
  }));

  return {
    db_id: detail.id,
    session_id: detail.session_id ?? detail.id,
    title: detail.title,
    messages,
    missing_fields: [],
    completion_percentage: detail.completion_percentage,
    status: detail.status === 'completed' ? 'fir_ready'
          : detail.status === 'archived'  ? 'idle'
          : 'collecting',
    suggested_replies: [],
    fir_data: undefined,
    created_at: detail.created_at,
    updated_at: detail.updated_at,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // ── Initial state ───────────────────────────────────────────────────
      activeSession: null,
      conversations: [],
      conversationsPage: 1,
      hasMoreConversations: false,
      loadingConversations: false,
      searchResults: null,
      searchQuery: '',
      isTyping: false,
      isLoading: false,
      theme: 'dark',
      showFIRPanel: false,
      showSidebar: true,
      toasts: [],

      // ── Active session actions ──────────────────────────────────────────
      setActiveSession: (session) => set({ activeSession: session, showFIRPanel: false }),

      updateActiveSession: (updates) =>
        set((state) => ({
          activeSession: state.activeSession
            ? { ...state.activeSession, ...updates, updated_at: new Date().toISOString() }
            : null,
        })),

      addMessageToActive: (msg) =>
        set((state) => {
          if (!state.activeSession) return state;
          const updated = [...state.activeSession.messages, msg];
          const preview = updated.find((m) => m.role === 'user')?.content ?? '';
          return {
            activeSession: {
              ...state.activeSession,
              messages: updated,
              updated_at: new Date().toISOString(),
            },
            // Also update the sidebar preview
            conversations: state.conversations.map((c) =>
              c.id === state.activeSession!.db_id
                ? { ...c, preview: preview.slice(0, 80), updated_at: new Date().toISOString() }
                : c
            ),
          };
        }),

      clearActiveSession: () => set({ activeSession: null, showFIRPanel: false }),

      // ── Conversation list actions ───────────────────────────────────────
      setConversations: (list, page, hasMore) =>
        set({ conversations: list, conversationsPage: page, hasMoreConversations: hasMore }),

      appendConversations: (list, page, hasMore) =>
        set((state) => ({
          conversations: [...state.conversations, ...list],
          conversationsPage: page,
          hasMoreConversations: hasMore,
        })),

      upsertConversation: (item) =>
        set((state) => {
          const exists = state.conversations.find((c) => c.id === item.id);
          if (exists) {
            return {
              conversations: state.conversations.map((c) =>
                c.id === item.id ? item : c
              ),
            };
          }
          // New conversation — prepend (most recent first)
          return { conversations: [item, ...state.conversations] };
        }),

      removeConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeSession:
            state.activeSession?.db_id === id ? null : state.activeSession,
        })),

      setLoadingConversations: (v) => set({ loadingConversations: v }),

      setSearchResults: (results, query) =>
        set({ searchResults: results, searchQuery: query }),

      // ── UI actions ──────────────────────────────────────────────────────
      setTyping: (v) => set({ isTyping: v }),
      setLoading: (v) => set({ isLoading: v }),
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setShowFIRPanel: (v) => set({ showFIRPanel: v }),
      setShowSidebar: (v) => set({ showSidebar: v }),

      addToast: (message, type) => {
        const id = Math.random().toString(36).slice(2);
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => get().removeToast(id), 4000);
      },
      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      // ── Full reset ──────────────────────────────────────────────────────
      resetForUser: () =>
        set({
          // Clear ALL user-specific state immediately
          activeSession: null,
          conversations: [],
          conversationsPage: 1,
          hasMoreConversations: false,
          loadingConversations: false,
          searchResults: null,
          searchQuery: '',
          isTyping: false,
          isLoading: false,
          showFIRPanel: false,
          toasts: [],
          // theme + showSidebar are intentionally kept (pure UI prefs)
        }),

      // ── Helpers ─────────────────────────────────────────────────────────
      getActiveDbId: () => get().activeSession?.db_id ?? null,
      getActiveSessionId: () => get().activeSession?.session_id ?? null,
    }),
    {
      name: 'nesya-chat-ui',
      // Only persist UI preferences — chat data lives in the DB
      partialize: (state) => ({
        theme: state.theme,
        showSidebar: state.showSidebar,
      }),
    }
  )
);
