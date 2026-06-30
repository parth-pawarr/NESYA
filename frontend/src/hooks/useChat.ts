import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useChatStore } from '../store/chatStore';
import {
  startSession,
  sendMessage,
  generateFIR,
  type ChatRequest,
} from '../services/api';

export function useChat() {
  const store = useChatStore();

  const initSession = useCallback(async () => {
    store.setLoading(true);
    try {
      const response = await startSession();
      const sid = response.session_id;

      store.createSession(sid);
      store.setActiveSession(sid);

      // Add welcome message
      store.addMessage(sid, {
        id: uuidv4(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      });

      store.updateSession(sid, {
        missing_fields: response.missing_fields,
        completion_percentage: response.completion_percentage,
        status: response.status,
        suggested_replies: response.suggested_replies,
      });

      return sid;
    } catch (err) {
      console.error('Failed to start session:', err);
      store.addToast('Failed to connect to the server. Is the backend running?', 'error');
      return null;
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const sendChat = useCallback(
    async (
      message: string,
      opts?: {
        complainant_name?: string;
        complainant_contact?: string;
        police_station?: string;
      }
    ) => {
      const sid = store.activeSessionId;
      if (!sid) return;

      // Add user message optimistically
      store.addMessage(sid, {
        id: uuidv4(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      });

      store.setTyping(true);

      try {
        const req: ChatRequest = {
          message,
          session_id: sid,
          ...opts,
        };

        const response = await sendMessage(req);

        // Add AI response
        store.addMessage(sid, {
          id: uuidv4(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
        });

        store.updateSession(sid, {
          missing_fields: response.missing_fields,
          completion_percentage: response.completion_percentage,
          status: response.status,
          suggested_replies: response.suggested_replies,
          fir_data: response.fir_data,
        });

        // Show FIR panel automatically when ready
        if (response.status === 'fir_ready') {
          store.setShowFIRPanel(true);
          store.addToast('FIR generated successfully!', 'success');
        }

        return response;
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.detail ||
          'I encountered a problem. Please try again.';

        store.addMessage(sid, {
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
    [store]
  );

  const triggerGenerateFIR = useCallback(
    async (opts?: {
      complainant_name?: string;
      complainant_contact?: string;
      police_station?: string;
    }) => {
      const sid = store.activeSessionId;
      if (!sid) return;

      store.setTyping(true);
      try {
        const response = await generateFIR(
          sid,
          opts?.complainant_name,
          opts?.complainant_contact,
          opts?.police_station
        );

        store.addMessage(sid, {
          id: uuidv4(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
        });

        store.updateSession(sid, {
          fir_data: response.fir_data,
          status: response.status,
          completion_percentage: 100,
        });

        store.setShowFIRPanel(true);
        store.addToast('FIR generated!', 'success');
      } catch (err) {
        store.addToast('Failed to generate FIR.', 'error');
      } finally {
        store.setTyping(false);
      }
    },
    [store]
  );

  const startNewChat = useCallback(async () => {
    return await initSession();
  }, [initSession]);

  return {
    initSession,
    sendChat,
    triggerGenerateFIR,
    startNewChat,
  };
}
