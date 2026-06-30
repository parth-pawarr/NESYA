import axios from 'axios';

const BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

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
  victim: string;
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
  processing_status: string;
  recommended_action: string;
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

export interface ConversationSummary {
  session_id: string;
  created_at: string;
  updated_at: string;
  is_complete: boolean;
  message_count: number;
  preview: string;
}

// ── API Calls ──────────────────────────────────────────────────────────────
export const startSession = async (sessionId?: string): Promise<ChatResponse> => {
  const params = sessionId ? `?session_id=${sessionId}` : '';
  const { data } = await api.post<ChatResponse>(`/start${params}`);
  return data;
};

export const sendMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  const { data } = await api.post<ChatResponse>('/chat', request);
  return data;
};

export const analyzeNarrative = async (narrative: string, sessionId?: string) => {
  const { data } = await api.post('/analyze', { narrative, session_id: sessionId });
  return data;
};

export const generateFIR = async (
  sessionId: string,
  complainantName?: string,
  complainantContact?: string,
  policeStation?: string
): Promise<ChatResponse> => {
  const { data } = await api.post<ChatResponse>('/generate-fir', {
    session_id: sessionId,
    complainant_name: complainantName,
    complainant_contact: complainantContact,
    police_station: policeStation,
  });
  return data;
};

export const getConversation = async (sessionId: string) => {
  const { data } = await api.get(`/conversation/${sessionId}`);
  return data;
};

export const getAllConversations = async (): Promise<{ sessions: ConversationSummary[] }> => {
  const { data } = await api.get('/conversations');
  return data;
};

export const resetSession = async (sessionId: string) => {
  const { data } = await api.post('/reset', { session_id: sessionId });
  return data;
};

export default api;
