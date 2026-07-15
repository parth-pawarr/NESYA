/**
 * NESYA — Chat & Conversation API service.
 * All chat calls are authenticated via the JWT access token injected
 * by the shared axios interceptor in authService.ts.
 */
import authApi from './authService'; // shared axios instance with JWT interceptor

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  session_id?: string;
  complainant_name?: string;
  complainant_contact?: string;
  police_station?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface LegalSection {
  section_id: string;
  title: string;
  confidence: number;
  explanation: string;
  punishment: string;
}

export interface QualityFlag {
  flag_type: string;
  description: string;
  recommendation: string;
}

export interface FIRDocument {
  fir_number: string;
  date_of_report: string;
  complainant_name: string;
  complainant_contact: string;
  police_station: string;
  victim?: string;
  accused_details: string;
  incident_date: string;
  incident_time: string;
  incident_location: string;
  location_type: string;
  crime_type: string;
  description: string;
  witness_details: string[];
  property_details: string[];
  financial_loss: string | null;
  legal_sections: LegalSection[];
  quality_flags: QualityFlag[];
  overall_confidence: number;
  processing_status?: string;
  recommended_action?: string;
  raw_nlp: Record<string, unknown>;
  raw_rule_engine: Record<string, unknown>;
}

export interface ChatResponse {
  session_id: string;
  status: 'collecting' | 'analyzing' | 'fir_ready' | 'error';
  message: string;
  missing_fields: string[];
  completion_percentage: number;
  fir_data?: FIRDocument;
  suggested_replies: string[];
  conversation: ConversationMessage[];
}

/** Message as returned from the DB (GET /conversations/{id}) */
export interface MessageOut {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta?: Record<string, unknown> | null;
  created_at: string;
}

/** Sidebar list item — returned by GET /conversations */
export interface ConversationSummary {
  id: string;
  title: string | null;
  status: 'active' | 'completed' | 'archived';
  completion_percentage: number;
  message_count: number;
  preview: string | null;
  created_at: string;
  updated_at: string;
}

/** Full conversation with messages — returned by GET /conversations/{id} */
export interface ConversationDetail {
  id: string;
  title: string | null;
  status: 'active' | 'completed' | 'archived';
  completion_percentage: number;
  session_id: string | null;
  police_station: string | null;
  messages: MessageOut[];
  created_at: string;
  updated_at: string;
}

export interface ConversationListResponse {
  items: ConversationSummary[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// ── Chat API calls (all authenticated via authApi interceptor) ─────────────────

const BASE = '/api/v1';

export const startSession = async (sessionId?: string, title?: string): Promise<ChatResponse> => {
  const { data } = await authApi.post<ChatResponse>(`${BASE}/start`, {
    session_id: sessionId ?? null,
    title: title ?? null,
  });
  return data;
};

export const sendMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  const { data } = await authApi.post<ChatResponse>(`${BASE}/chat`, request);
  return data;
};

export const generateFIR = async (
  sessionId: string,
  complainantName?: string,
  complainantContact?: string,
  policeStation?: string,
): Promise<ChatResponse> => {
  const { data } = await authApi.post<ChatResponse>(`${BASE}/generate-fir`, {
    session_id: sessionId,
    complainant_name: complainantName,
    complainant_contact: complainantContact,
    police_station: policeStation,
  });
  return data;
};

// ── Conversation CRUD (persistent, user-specific) ──────────────────────────────

export const getMyConversations = async (
  page = 1,
  limit = 30,
  statusFilter?: string,
): Promise<ConversationListResponse> => {
  const params: Record<string, string | number> = { page, limit };
  if (statusFilter) params.status = statusFilter;
  const { data } = await authApi.get<ConversationListResponse>(`${BASE}/conversations`, { params });
  return data;
};

export const getConversationDetail = async (id: string): Promise<ConversationDetail> => {
  const { data } = await authApi.get<ConversationDetail>(`${BASE}/conversations/${id}`);
  return data;
};

export const createConversation = async (
  sessionId: string,
  title?: string,
): Promise<ConversationDetail> => {
  const { data } = await authApi.post<ConversationDetail>(`${BASE}/conversations`, {
    session_id: sessionId,
    title: title ?? null,
  });
  return data;
};

export const updateConversation = async (
  id: string,
  updates: { title?: string; status?: string },
): Promise<ConversationDetail> => {
  const { data } = await authApi.patch<ConversationDetail>(`${BASE}/conversations/${id}`, updates);
  return data;
};

export const deleteConversation = async (id: string): Promise<void> => {
  await authApi.delete(`${BASE}/conversations/${id}`);
};

export const searchConversations = async (
  query: string,
  limit = 20,
): Promise<ConversationSummary[]> => {
  const { data } = await authApi.post<ConversationSummary[]>(
    `${BASE}/conversations/search`,
    { query },
    { params: { limit } },
  );
  return data;
};

export const resetSession = async (sessionId: string) => {
  const { data } = await authApi.post(`${BASE}/reset`, { session_id: sessionId });
  return data;
};

export default authApi;
