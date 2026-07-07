import axios, { type AxiosInstance } from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  auth_provider: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ── Axios instance ─────────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401 (one retry per request)
let refreshing = false;
let refreshQueue: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);
    original._retry = true;

    if (refreshing) {
      return new Promise((resolve) => {
        refreshQueue.push(() => {
          original.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
          resolve(api(original));
        });
      });
    }

    refreshing = true;
    const success = await useAuthStore.getState().refreshAccessToken();
    refreshing = false;

    if (success) {
      refreshQueue.forEach((cb) => cb());
      refreshQueue = [];
      original.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
      return api(original);
    }

    refreshQueue = [];
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    window.location.href = '/login';
    return Promise.reject(error);
  }
);

// ── Auth API calls ────────────────────────────────────────────────────────────
export const authAPI = {
  register: async (
    fullName: string, email: string, password: string, confirmPassword: string
  ) => {
    const r = await api.post('/api/v1/auth/register', {
      full_name: fullName, email, password, confirm_password: confirmPassword,
    });
    return r.data as { message: string };
  },

  login: async (email: string, password: string): Promise<TokenResponse> => {
    const r = await api.post('/api/v1/auth/login', { email, password, remember_me: false });
    return r.data as TokenResponse;
  },

  logout: async (refreshToken: string, _accessToken: string): Promise<void> => {
    await api.post('/api/v1/auth/logout', { refresh_token: refreshToken });
  },

  refresh: async (refreshToken: string): Promise<AccessTokenResponse> => {
    const r = await api.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
    return r.data as AccessTokenResponse;
  },

  getMe: async (accessToken: string): Promise<UserResponse> => {
    const r = await api.get('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return r.data as UserResponse;
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const r = await api.post('/api/v1/auth/verify-email', { token });
    return r.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const r = await api.post('/api/v1/auth/forgot-password', { email });
    return r.data;
  },

  resetPassword: async (
    token: string, newPassword: string, confirmPassword: string
  ): Promise<{ message: string }> => {
    const r = await api.post('/api/v1/auth/reset-password', {
      token, new_password: newPassword, confirm_password: confirmPassword,
    });
    return r.data;
  },

  getOAuthUrl: (provider: 'google' | 'github' | 'microsoft') =>
    `${BASE_URL}/api/v1/auth/oauth/${provider}`,
};

export default api;
