/**
 * NESYA — useChat hook
 *
 * Orchestrates:
 *  - Starting / loading conversations from the DB
 *  - Sending messages (optimistic UI + DB persistence via backend)
 *  - Fetching the paginated sidebar list
 *  - Rename / archive / delete / search
 */
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useChatStore, sessionFromDetail } from '../store/chatStore';
import {
  startSession,
  sendMessage,
  generateFIR,
  getMyConversations,
  getConversationDetail,
  updateConversation,
  deleteConversation,
  searchConversations,
  type ChatRequest,
} from '../services/api';

export function useChat() {
  const store = useChatStore();

  // ── Fetch sidebar list ────────────────────────────────────────────────────

  const fetchConversations = useCallback(
    async (page = 1, append = false) => {
      store.setLoadingConversations(true);
      try {
        const resp = await getMyConversations(page, 30);
        if (append) {
          store.appendConversations(resp.items, resp.page, resp.has_more);
        } else {
          store.setConversations(resp.items, resp.page, resp.has_more);
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        store.setLoadingConversations(false);
      }
    },
    [store],
  );

  const loadMoreConversations = useCallback(async () => {
    if (!store.hasMoreConversations || store.loadingConversations) return;
    await fetchConversations(store.conversationsPage + 1, true);
  }, [store, fetchConversations]);

  // ── Start a new chat ──────────────────────────────────────────────────────

  const startNewChat = useCallback(async () => {
    store.setLoading(true);
    try {
      // Create NLP session + DB conversation row in one call (POST /start)
      const chatResp = await startSession();
      const sid = chatResp.session_id;

      // Refresh the sidebar list so the new conversation appears
      const listResp = await getMyConversations(1, 30);
      const newConv = listResp.items[0]; // most recent = first

      const now = new Date().toISOString();
      store.setActiveSession({
        db_id: newConv?.id ?? sid,
        session_id: sid,
        title: newConv?.title ?? null,
        messages: [
          {
            id: uuidv4(),
            role: 'assistant',
            content: chatResp.message,
            timestamp: now,
          },
        ],
        missing_fields: chatResp.missing_fields,
        completion_percentage: chatResp.completion_percentage,
        status: chatResp.status,
        suggested_replies: chatResp.suggested_replies,
        created_at: now,
        updated_at: now,
      });

      store.setConversations(listResp.items, listResp.page, listResp.has_more);
      return sid;
    } catch (err) {
      console.error('Failed to start session:', err);
      store.addToast('Failed to connect to the server. Is the backend running?', 'error');
      return null;
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  // ── Load an existing conversation ─────────────────────────────────────────

  const loadConversation = useCallback(
    async (conversationId: string) => {
      store.setLoading(true);
      try {
        const detail = await getConversationDetail(conversationId);
        const session = sessionFromDetail(detail);
        store.setActiveSession(session);
        store.setShowFIRPanel(false);
        return session;
      } catch (err) {
        console.error('Failed to load conversation:', err);
        store.addToast('Failed to load conversation.', 'error');
        return null;
      } finally {
        store.setLoading(false);
      }
    },
    [store],
  );

  // ── Send a message ────────────────────────────────────────────────────────

  const sendChat = useCallback(
    async (
      message: string,
      opts?: {
        complainant_name?: string;
        complainant_contact?: string;
        police_station?: string;
      },
    ) => {
      const active = store.activeSession;
      if (!active) return;

      // Optimistically add user message
      store.addMessageToActive({
        id: uuidv4(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      });

      store.setTyping(true);

      try {
        const req: ChatRequest = {
          message,
          session_id: active.session_id,
          ...opts,
        };

        const response = await sendMessage(req);

        // Add AI response
        store.addMessageToActive({
          id: uuidv4(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
        });

        store.updateActiveSession({
          missing_fields: response.missing_fields,
          completion_percentage: response.completion_percentage,
          status: response.status,
          suggested_replies: response.suggested_replies,
          fir_data: response.fir_data,
        });

        // Auto-show FIR panel
        if (response.status === 'fir_ready') {
          store.setShowFIRPanel(true);
          store.addToast('FIR generated successfully!', 'success');
        }

        // Refresh sidebar to reflect updated_at + preview
        const listResp = await getMyConversations(1, 30);
        store.setConversations(listResp.items, listResp.page, listResp.has_more);

        return response;
      } catch (err: unknown) {
        const errMsg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          'I encountered a problem. Please try again.';

        store.addMessageToActive({
          id: uuidv4(),
          role: 'assistant',
          content: `⚠️ ${errMsg}`,
          timestamp: new Date().toISOString(),
        });

        store.addToast('Something went wrong. Please retry.', 'error');
      } finally {
        store.setTyping(false);
      }
    },
    [store],
  );

  // ── Trigger FIR generation ────────────────────────────────────────────────

  const triggerGenerateFIR = useCallback(
    async (opts?: {
      complainant_name?: string;
      complainant_contact?: string;
      police_station?: string;
    }) => {
      const active = store.activeSession;
      if (!active) return;

      store.setTyping(true);
      try {
        const response = await generateFIR(
          active.session_id,
          opts?.complainant_name,
          opts?.complainant_contact,
          opts?.police_station,
        );

        store.addMessageToActive({
          id: uuidv4(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
        });

        store.updateActiveSession({
          fir_data: response.fir_data,
          status: response.status,
          completion_percentage: 100,
        });

        store.setShowFIRPanel(true);
        store.addToast('FIR generated!', 'success');

        // Refresh sidebar
        const listResp = await getMyConversations(1, 30);
        store.setConversations(listResp.items, listResp.page, listResp.has_more);
      } catch {
        store.addToast('Failed to generate FIR.', 'error');
      } finally {
        store.setTyping(false);
      }
    },
    [store],
  );

  // ── Rename conversation ───────────────────────────────────────────────────

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      try {
        await updateConversation(id, { title });
        // Update sidebar
        store.upsertConversation(
          store.conversations.find((c) => c.id === id)
            ? { ...store.conversations.find((c) => c.id === id)!, title }
            : { id, title, status: 'active', completion_percentage: 0, message_count: 0, preview: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        );
        // Update active session title if it's the active one
        if (store.activeSession?.db_id === id) {
          store.updateActiveSession({ title });
        }
        store.addToast('Conversation renamed.', 'success');
      } catch {
        store.addToast('Failed to rename.', 'error');
      }
    },
    [store],
  );

  // ── Archive conversation ──────────────────────────────────────────────────

  const archiveConversation = useCallback(
    async (id: string) => {
      try {
        await updateConversation(id, { status: 'archived' });
        const existing = store.conversations.find((c) => c.id === id);
        if (existing) {
          store.upsertConversation({ ...existing, status: 'archived' });
        }
        if (store.activeSession?.db_id === id) {
          store.clearActiveSession();
        }
        store.addToast('Conversation archived.', 'info');
      } catch {
        store.addToast('Failed to archive.', 'error');
      }
    },
    [store],
  );

  // ── Delete conversation ───────────────────────────────────────────────────

  const removeConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        store.removeConversation(id);
        store.addToast('Conversation deleted.', 'info');
      } catch {
        store.addToast('Failed to delete.', 'error');
      }
    },
    [store],
  );

  // ── Search ────────────────────────────────────────────────────────────────

  const searchChats = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        store.setSearchResults(null, '');
        return;
      }
      try {
        const results = await searchConversations(query);
        store.setSearchResults(results, query);
      } catch {
        store.setSearchResults([], query);
      }
    },
    [store],
  );

  return {
    fetchConversations,
    loadMoreConversations,
    startNewChat,
    loadConversation,
    sendChat,
    triggerGenerateFIR,
    renameConversation,
    archiveConversation,
    removeConversation,
    searchChats,
  };
}
