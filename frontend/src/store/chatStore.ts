import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ConversationMessage,
  FIRDocument,
  ConversationSummary,
} from '../services/api';

export interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  session_id: string;
  messages: LocalMessage[];
  missing_fields: string[];
  completion_percentage: number;
  fir_data?: FIRDocument;
  status: 'collecting' | 'analyzing' | 'fir_ready' | 'error' | 'idle';
  suggested_replies: string[];
  preview: string;
  created_at: string;
  updated_at: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ChatStore {
  // Active session
  activeSessionId: string | null;
  sessions: Record<string, ChatSession>;
  isTyping: boolean;
  isLoading: boolean;

  // UI state
  theme: 'dark' | 'light';
  showFIRPanel: boolean;
  showSidebar: boolean;
  toasts: Toast[];

  // Conversation list (from server)
  conversationList: ConversationSummary[];

  // Actions
  setActiveSession: (id: string | null) => void;
  createSession: (id: string) => void;
  updateSession: (id: string, updates: Partial<ChatSession>) => void;
  addMessage: (sessionId: string, msg: LocalMessage) => void;
  setTyping: (v: boolean) => void;
  setLoading: (v: boolean) => void;
  setTheme: (t: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setShowFIRPanel: (v: boolean) => void;
  setShowSidebar: (v: boolean) => void;
  addToast: (msg: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  setConversationList: (list: ConversationSummary[]) => void;
  deleteSession: (id: string) => void;

  // Computed
  activeSession: () => ChatSession | null;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      activeSessionId: null,
      sessions: {},
      isTyping: false,
      isLoading: false,
      theme: 'dark',
      showFIRPanel: false,
      showSidebar: true,
      toasts: [],
      conversationList: [],

      setActiveSession: (id) => set({ activeSessionId: id }),

      createSession: (id) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [id]: {
              session_id: id,
              messages: [],
              missing_fields: [],
              completion_percentage: 0,
              status: 'idle',
              suggested_replies: [],
              preview: 'New conversation',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
        })),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [id]: {
              ...state.sessions[id],
              ...updates,
              updated_at: new Date().toISOString(),
            },
          },
        })),

      addMessage: (sessionId, msg) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          const updatedMessages = [...session.messages, msg];
          const preview =
            updatedMessages.find((m) => m.role === 'user')?.content.slice(0, 60) ||
            'New conversation';
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                messages: updatedMessages,
                preview,
                updated_at: new Date().toISOString(),
              },
            },
          };
        }),

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

      setConversationList: (list) => set({ conversationList: list }),

      deleteSession: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.sessions;
          return {
            sessions: rest,
            activeSessionId:
              state.activeSessionId === id ? null : state.activeSessionId,
          };
        }),

      activeSession: () => {
        const { activeSessionId, sessions } = get();
        return activeSessionId ? sessions[activeSessionId] ?? null : null;
      },
    }),
    {
      name: 'nesya-chat-store',
      partialize: (state) => ({
        theme: state.theme,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);
