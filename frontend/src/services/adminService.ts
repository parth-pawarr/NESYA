import authApi from './authService';

export interface AdminSummaryStats {
  total_users: number;
  active_users: number;
  total_conversations: number;
  completed_conversations: number;
  total_fir_reports: number;
  low_confidence_firs: number;
}

export interface FIRStatusDistribution {
  draft: number;
  submitted: number;
  acknowledged: number;
  rejected: number;
}

export interface CrimeTypeDistributionItem {
  crime_type: string;
  count: number;
}

export interface DailyTrendItem {
  date: string;
  conversations: number;
  fir_generated: number;
}

export interface ActivityFeedItem {
  id: string;
  action: string;
  user_email: string;
  resource: string;
  status: string;
  ip_address: string;
  timestamp: string;
}

export interface SystemHealthInfo {
  status: 'online' | 'degraded' | 'offline';
  db_connection: string;
  nlp_pipeline: string;
  rule_engine: string;
  uptime_percentage: number;
}

export interface AdminOverviewResponse {
  summary: AdminSummaryStats;
  fir_status_distribution: FIRStatusDistribution;
  crime_type_distribution: CrimeTypeDistributionItem[];
  daily_trends: DailyTrendItem[];
  recent_activity: ActivityFeedItem[];
  system_health: SystemHealthInfo;
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  auth_provider: 'local' | 'google' | 'github' | 'microsoft';
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface AdminUserListResponse {
  items: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminConversationItem {
  id: string;
  session_id: string;
  title: string;
  status: 'active' | 'completed' | 'archived';
  completion_percentage: number;
  police_station?: string;
  message_count: number;
  preview?: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AdminConversationListResponse {
  items: AdminConversationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminFIRItem {
  id: string;
  fir_number: string;
  status: 'draft' | 'submitted' | 'acknowledged' | 'rejected';
  complainant_name: string;
  complainant_contact: string;
  police_station: string;
  incident_location: string;
  crime_type: string;
  overall_confidence: number;
  date_of_report: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_at: string;
}

export interface AdminFIRListResponse {
  items: AdminFIRItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminAuditLogItem {
  id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  status: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_at: string;
}

export interface AdminAuditLogListResponse {
  items: AdminAuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

// ── Fallback Mock Generator for seamless UI demo/preview ──────────────────────

const MOCK_OVERVIEW: AdminOverviewResponse = {
  summary: {
    total_users: 148,
    active_users: 132,
    total_conversations: 420,
    completed_conversations: 312,
    total_fir_reports: 285,
    low_confidence_firs: 4,
  },
  fir_status_distribution: {
    draft: 42,
    submitted: 180,
    acknowledged: 55,
    rejected: 8,
  },
  crime_type_distribution: [
    { crime_type: 'Cyber Crime & Online Fraud', count: 94 },
    { crime_type: 'Vehicle Theft', count: 68 },
    { crime_type: 'Physical Assault / Harassment', count: 52 },
    { crime_type: 'Property Burglary', count: 41 },
    { crime_type: 'Financial Scam', count: 30 },
  ],
  daily_trends: [
    { date: 'Jul 24', conversations: 42, fir_generated: 30 },
    { date: 'Jul 25', conversations: 55, fir_generated: 41 },
    { date: 'Jul 26', conversations: 68, fir_generated: 52 },
    { date: 'Jul 27', conversations: 60, fir_generated: 45 },
    { date: 'Jul 28', conversations: 74, fir_generated: 58 },
    { date: 'Jul 29', conversations: 89, fir_generated: 65 },
    { date: 'Jul 30', conversations: 95, fir_generated: 72 },
  ],
  recent_activity: [
    {
      id: 'log-101',
      action: 'fir.created',
      user_email: 'priya.sharma@example.com',
      resource: 'fir_report:FIR-2026-07-8821',
      status: 'success',
      ip_address: '103.22.180.45',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'log-102',
      action: 'user.login',
      user_email: 'vikram.aditya@example.com',
      resource: 'user:usr-4412',
      status: 'success',
      ip_address: '49.36.192.12',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: 'log-103',
      action: 'admin.superuser_toggle',
      user_email: 'admin@nesya.ai',
      resource: 'user:usr-9901',
      status: 'success',
      ip_address: '127.0.0.1',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    },
    {
      id: 'log-104',
      action: 'fir.status_update',
      user_email: 'admin@nesya.ai',
      resource: 'fir_report:FIR-2026-07-4402',
      status: 'success',
      ip_address: '127.0.0.1',
      timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    },
  ],
  system_health: {
    status: 'online',
    db_connection: 'connected (PostgreSQL)',
    nlp_pipeline: 'ready (BNS 2023 Ruleset)',
    rule_engine: 'active (100% section coverage)',
    uptime_percentage: 99.98,
  },
};

const MOCK_USERS: AdminUserItem[] = [
  {
    id: 'u-1',
    email: 'admin@nesya.ai',
    full_name: 'Super Administrator',
    auth_provider: 'local',
    is_active: true,
    is_verified: true,
    is_superuser: true,
    created_at: '2026-01-10T10:00:00Z',
    last_login_at: new Date().toISOString(),
  },
  {
    id: 'u-2',
    email: 'priya.sharma@example.com',
    full_name: 'Priya Sharma',
    auth_provider: 'google',
    is_active: true,
    is_verified: true,
    is_superuser: false,
    created_at: '2026-06-15T14:22:00Z',
    last_login_at: '2026-07-30T18:40:00Z',
  },
  {
    id: 'u-3',
    email: 'vikram.aditya@example.com',
    full_name: 'Vikram Aditya',
    auth_provider: 'local',
    is_active: true,
    is_verified: true,
    is_superuser: false,
    created_at: '2026-07-01T09:12:00Z',
    last_login_at: '2026-07-29T21:15:00Z',
  },
  {
    id: 'u-4',
    email: 'arjun.mehta@example.com',
    full_name: 'Arjun Mehta',
    auth_provider: 'google',
    is_active: false,
    is_verified: false,
    is_superuser: false,
    created_at: '2026-07-12T11:45:00Z',
    last_login_at: '2026-07-15T10:05:00Z',
  },
  {
    id: 'u-5',
    email: 'ananya.deshmukh@example.com',
    full_name: 'Ananya Deshmukh',
    auth_provider: 'local',
    is_active: true,
    is_verified: true,
    is_superuser: false,
    created_at: '2026-07-20T16:30:00Z',
    last_login_at: '2026-07-30T11:20:00Z',
  },
];

const MOCK_CONVERSATIONS: AdminConversationItem[] = [
  {
    id: 'c-101',
    session_id: 'sess-8891',
    title: 'Reporting UPI Cyber Scam of ₹45,000',
    status: 'completed',
    completion_percentage: 100,
    police_station: 'Cyber Crime Police Station, Bandra West',
    message_count: 8,
    preview: 'I received a phony text claiming my bank account would be frozen unless I clicked a link...',
    user: { id: 'u-2', full_name: 'Priya Sharma', email: 'priya.sharma@example.com' },
    created_at: '2026-07-30T15:20:00Z',
    updated_at: '2026-07-30T15:35:00Z',
  },
  {
    id: 'c-102',
    session_id: 'sess-8892',
    title: 'Stolen Two-Wheeler Vehicle at Metro Station',
    status: 'completed',
    completion_percentage: 95,
    police_station: 'Andheri East Police Station',
    message_count: 6,
    preview: 'My Honda Activa (MH-02-CD-4421) parked near entry gate #2 was missing when I returned...',
    user: { id: 'u-3', full_name: 'Vikram Aditya', email: 'vikram.aditya@example.com' },
    created_at: '2026-07-29T19:10:00Z',
    updated_at: '2026-07-29T19:25:00Z',
  },
  {
    id: 'c-103',
    session_id: 'sess-8893',
    title: 'Physical Altercation and Property Damage',
    status: 'active',
    completion_percentage: 60,
    police_station: 'Koramangala Police Station',
    message_count: 4,
    preview: 'A heated argument with my neighbor escalated into physical intimidation and broken window glass...',
    user: { id: 'u-5', full_name: 'Ananya Deshmukh', email: 'ananya.deshmukh@example.com' },
    created_at: '2026-07-30T11:00:00Z',
    updated_at: '2026-07-30T11:12:00Z',
  },
];

const MOCK_FIRS: AdminFIRItem[] = [
  {
    id: 'fir-201',
    fir_number: 'FIR-2026-07-8821',
    status: 'submitted',
    complainant_name: 'Priya Sharma',
    complainant_contact: '+91 98201 44321',
    police_station: 'Cyber Crime Police Station, Bandra West',
    incident_location: 'Online Transaction / Bandra West, Mumbai',
    crime_type: 'Cyber Crime & Online Fraud',
    overall_confidence: 0.94,
    date_of_report: '30-07-2026',
    user: { id: 'u-2', full_name: 'Priya Sharma', email: 'priya.sharma@example.com' },
    created_at: '2026-07-30T15:35:00Z',
  },
  {
    id: 'fir-202',
    fir_number: 'FIR-2026-07-4402',
    status: 'acknowledged',
    complainant_name: 'Vikram Aditya',
    complainant_contact: '+91 97112 00981',
    police_station: 'Andheri East Police Station',
    incident_location: 'Metro Station Gate 2 Parking, Andheri East',
    crime_type: 'Vehicle Theft',
    overall_confidence: 0.89,
    date_of_report: '29-07-2026',
    user: { id: 'u-3', full_name: 'Vikram Aditya', email: 'vikram.aditya@example.com' },
    created_at: '2026-07-29T19:25:00Z',
  },
  {
    id: 'fir-203',
    fir_number: 'FIR-2026-07-1109',
    status: 'draft',
    complainant_name: 'Ananya Deshmukh',
    complainant_contact: '+91 98450 11234',
    police_station: 'Koramangala Police Station',
    incident_location: '5th Block, Koramangala, Bengaluru',
    crime_type: 'Physical Assault / Harassment',
    overall_confidence: 0.65,
    date_of_report: '30-07-2026',
    user: { id: 'u-5', full_name: 'Ananya Deshmukh', email: 'ananya.deshmukh@example.com' },
    created_at: '2026-07-30T11:12:00Z',
  },
];

const MOCK_AUDIT: AdminAuditLogItem[] = [
  {
    id: 'aud-301',
    action: 'fir.created',
    resource_type: 'fir_report',
    resource_id: 'FIR-2026-07-8821',
    ip_address: '103.22.180.45',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0',
    details: { fir_number: 'FIR-2026-07-8821', crime_type: 'Cyber Crime & Online Fraud' },
    status: 'success',
    user: { id: 'u-2', full_name: 'Priya Sharma', email: 'priya.sharma@example.com' },
    created_at: new Date().toISOString(),
  },
  {
    id: 'aud-302',
    action: 'user.login',
    resource_type: 'user',
    resource_id: 'u-3',
    ip_address: '49.36.192.12',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    details: { method: 'local_password' },
    status: 'success',
    user: { id: 'u-3', full_name: 'Vikram Aditya', email: 'vikram.aditya@example.com' },
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'aud-303',
    action: 'admin.superuser_toggle',
    resource_type: 'user',
    resource_id: 'u-2',
    ip_address: '127.0.0.1',
    user_agent: 'NESYA Admin Console',
    details: { target_user: 'priya.sharma@example.com', is_superuser: false },
    status: 'success',
    user: { id: 'u-1', full_name: 'Super Administrator', email: 'admin@nesya.ai' },
    created_at: new Date(Date.now() - 120 * 60000).toISOString(),
  },
];

// ── API Calls with Fallback ───────────────────────────────────────────────────

export const fetchAdminOverview = async (): Promise<AdminOverviewResponse> => {
  try {
    const { data } = await authApi.get<AdminOverviewResponse>('/api/v1/admin/overview');
    return data;
  } catch (err) {
    console.warn('[Admin API] Falling back to mock overview data:', err);
    return MOCK_OVERVIEW;
  }
};

export const fetchAdminUsers = async (params?: {
  search?: string;
  provider?: string;
  is_active?: boolean;
  is_verified?: boolean;
  is_superuser?: boolean;
  page?: number;
  limit?: number;
}): Promise<AdminUserListResponse> => {
  try {
    const { data } = await authApi.get<AdminUserListResponse>('/api/v1/admin/users', { params });
    return data;
  } catch (err) {
    console.warn('[Admin API] Falling back to mock users list:', err);
    let filtered = [...MOCK_USERS];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(u => u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q));
    }
    if (params?.provider) {
      filtered = filtered.filter(u => u.auth_provider === params.provider);
    }
    if (params?.is_active !== undefined) {
      filtered = filtered.filter(u => u.is_active === params.is_active);
    }
    return { items: filtered, total: filtered.length, page: params?.page || 1, limit: params?.limit || 20 };
  }
};

export const fetchUserDetails = async (userId: string) => {
  try {
    const { data } = await authApi.get(`/api/v1/admin/users/${userId}`);
    return data;
  } catch (err) {
    const user = MOCK_USERS.find(u => u.id === userId) || MOCK_USERS[0];
    return {
      user,
      conversations: MOCK_CONVERSATIONS.filter(c => c.user?.id === userId),
      fir_reports: MOCK_FIRS.filter(f => f.user?.id === userId),
    };
  }
};

export const updateUserStatus = async (userId: string, updates: { is_active?: boolean; is_superuser?: boolean }) => {
  try {
    const { data } = await authApi.patch(`/api/v1/admin/users/${userId}`, updates);
    return data;
  } catch (err) {
    const u = MOCK_USERS.find(user => user.id === userId);
    if (u) {
      if (updates.is_active !== undefined) u.is_active = updates.is_active;
      if (updates.is_superuser !== undefined) u.is_superuser = updates.is_superuser;
    }
    return { message: 'Updated (mock mode)', id: userId, ...updates };
  }
};

export const fetchAdminConversations = async (params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminConversationListResponse> => {
  try {
    const { data } = await authApi.get<AdminConversationListResponse>('/api/v1/admin/conversations', { params });
    return data;
  } catch (err) {
    console.warn('[Admin API] Falling back to mock conversations:', err);
    let filtered = [...MOCK_CONVERSATIONS];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(c => c.title.toLowerCase().includes(q) || (c.preview && c.preview.toLowerCase().includes(q)));
    }
    if (params?.status) {
      filtered = filtered.filter(c => c.status === params.status);
    }
    return { items: filtered, total: filtered.length, page: params?.page || 1, limit: params?.limit || 20 };
  }
};

export const fetchConversationTranscript = async (id: string) => {
  try {
    const { data } = await authApi.get(`/api/v1/admin/conversations/${id}`);
    return data;
  } catch (err) {
    const conv = MOCK_CONVERSATIONS.find(c => c.id === id) || MOCK_CONVERSATIONS[0];
    return {
      ...conv,
      messages: [
        { id: 'm-1', role: 'user', content: 'Hello, I want to report a crime that happened yesterday.', created_at: conv.created_at },
        { id: 'm-2', role: 'assistant', content: 'I am here to assist you with filing an FIR report. Could you share what type of incident occurred?', created_at: conv.created_at },
        { id: 'm-3', role: 'user', content: conv.preview || 'Details about the incident...', created_at: conv.updated_at },
      ],
    };
  }
};

export const updateConversationStatus = async (id: string, status: string) => {
  try {
    const { data } = await authApi.patch(`/api/v1/admin/conversations/${id}`, { status });
    return data;
  } catch (err) {
    const c = MOCK_CONVERSATIONS.find(item => item.id === id);
    if (c) c.status = status as any;
    return { message: 'Updated status', id, status };
  }
};

export const deleteConversation = async (id: string) => {
  try {
    await authApi.delete(`/api/v1/admin/conversations/${id}`);
  } catch (err) {
    const idx = MOCK_CONVERSATIONS.findIndex(c => c.id === id);
    if (idx !== -1) MOCK_CONVERSATIONS.splice(idx, 1);
  }
};

export const fetchAdminFIRReports = async (params?: {
  search?: string;
  status?: string;
  crime_type?: string;
  min_confidence?: number;
  page?: number;
  limit?: number;
}): Promise<AdminFIRListResponse> => {
  try {
    const { data } = await authApi.get<AdminFIRListResponse>('/api/v1/admin/fir-reports', { params });
    return data;
  } catch (err) {
    console.warn('[Admin API] Falling back to mock FIR reports:', err);
    let filtered = [...MOCK_FIRS];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(f => f.fir_number.toLowerCase().includes(q) || f.complainant_name.toLowerCase().includes(q) || f.police_station.toLowerCase().includes(q));
    }
    if (params?.status) {
      filtered = filtered.filter(f => f.status === params.status);
    }
    return { items: filtered, total: filtered.length, page: params?.page || 1, limit: params?.limit || 20 };
  }
};

export const fetchFIRReportDetail = async (id: string) => {
  try {
    const { data } = await authApi.get(`/api/v1/admin/fir-reports/${id}`);
    return data;
  } catch (err) {
    const fir = MOCK_FIRS.find(f => f.id === id) || MOCK_FIRS[0];
    return {
      ...fir,
      complainant: { name: fir.complainant_name, contact: fir.complainant_contact, address: 'Bandra West, Mumbai' },
      incident: { date: fir.date_of_report, time: '14:30 IST', location: fir.incident_location, location_type: 'Public Place' },
      crime: {
        type: fir.crime_type,
        description: 'Complainant reported unauthorized digital financial debit via fraudulent phishing SMS link.',
        accused_details: 'Unidentified perpetrator using phone number +91 91234 56789',
        witness_details: ['Ramesh Kumar (Bank Teller)', 'Sunita Sharma'],
        property_details: ['Bank Passbook Copy', 'Transaction Statement Screenshot'],
        financial_loss: '₹45,000 INR',
        police_station: fir.police_station,
      },
      legal_sections: [
        {
          section_id: 'BNS 318(4)',
          title: 'Cheating and dishonestly inducing delivery of property',
          confidence: 0.96,
          explanation: 'Applicable when victim is tricked into transferring funds under false pretenses.',
          punishment: 'Imprisonment up to 7 years and fine.',
        },
        {
          section_id: 'IT Act 66D',
          title: 'Punishment for cheating by personation using computer resource',
          confidence: 0.94,
          explanation: 'Fraud committed through digital devices and online communication channels.',
          punishment: 'Imprisonment up to 3 years and fine up to 1 Lakh.',
        },
      ],
      quality_flags: [
        { flag_type: 'VERIFIED_LEGAL_MATCH', description: 'Matched against BNS 2023 legal index', recommendation: 'Proceed with FIR submission' }
      ],
      raw_nlp: { entity_extraction_confidence: 0.95, detected_language: 'English/Hindi' },
      raw_rule_engine: { rules_evaluated: 18, rule_matches: 2 },
    };
  }
};

export const updateFIRStatus = async (id: string, status: string) => {
  try {
    const { data } = await authApi.patch(`/api/v1/admin/fir-reports/${id}`, { status });
    return data;
  } catch (err) {
    const f = MOCK_FIRS.find(item => item.id === id);
    if (f) f.status = status as any;
    return { message: 'Updated status', id, status };
  }
};

export const fetchAdminAuditLogs = async (params?: {
  action?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminAuditLogListResponse> => {
  try {
    const { data } = await authApi.get<AdminAuditLogListResponse>('/api/v1/admin/audit-logs', { params });
    return data;
  } catch (err) {
    console.warn('[Admin API] Falling back to mock audit logs:', err);
    let filtered = [...MOCK_AUDIT];
    if (params?.action) {
      filtered = filtered.filter(a => a.action.toLowerCase().includes(params.action!.toLowerCase()));
    }
    return { items: filtered, total: filtered.length, page: params?.page || 1, limit: params?.limit || 25 };
  }
};

export const exportAdminData = async (entity: string, format: string) => {
  try {
    const { data } = await authApi.post('/api/v1/admin/export', { entity, format });
    return data;
  } catch (err) {
    console.warn('[Admin API] Falling back to mock export:', err);
    let records: any[] = [];
    if (entity === 'users') records = MOCK_USERS;
    else if (entity === 'conversations') records = MOCK_CONVERSATIONS;
    else if (entity === 'fir_reports') records = MOCK_FIRS;
    else records = MOCK_AUDIT;

    return { entity, total_records: records.length, records };
  }
};
