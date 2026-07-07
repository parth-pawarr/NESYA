import type { UserResponse } from '../services/authService';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/authService';

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;        // In-memory only (never persisted)
  refreshToken: string | null;       // Persisted in localStorage
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;            // True after the initial token check
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  initialize: () => Promise<void>;
  clearError: () => void;
  setTokens: (accessToken: string, refreshToken: string, user: UserResponse) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // ── Initial State ────────────────────────────────────────────────────
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      // ── Actions ──────────────────────────────────────────────────────────
      setTokens: (accessToken, refreshToken, user) => {
        set({ accessToken, refreshToken, user, isAuthenticated: true, error: null });
      },

      clearError: () => set({ error: null }),

      initialize: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          set({ isInitialized: true });
          return;
        }
        try {
          const success = await get().refreshAccessToken();
          if (!success) {
            set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
          }
        } catch {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        } finally {
          set({ isInitialized: true });
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;
        try {
          const data = await authAPI.refresh(refreshToken);
          set({ accessToken: data.access_token });
          // Fetch updated user profile
          const user = await authAPI.getMe(data.access_token);
          set({ user, isAuthenticated: true });
          return true;
        } catch {
          return false;
        }
      },

      login: async (email, password, _rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authAPI.login(email, password);
          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err: unknown) {
          const msg = extractErrorMessage(err, 'Login failed. Please try again.');
          set({ isLoading: false, error: msg, isAuthenticated: false });
          throw new Error(msg);
        }
      },

      register: async (fullName, email, password, confirmPassword) => {
        set({ isLoading: true, error: null });
        try {
          await authAPI.register(fullName, email, password, confirmPassword);
          set({ isLoading: false });
        } catch (err: unknown) {
          const msg = extractErrorMessage(err, 'Registration failed. Please try again.');
          set({ isLoading: false, error: msg });
          throw new Error(msg);
        }
      },

      logout: async () => {
        const { accessToken, refreshToken } = get();
        try {
          if (accessToken && refreshToken) {
            await authAPI.logout(refreshToken, accessToken);
          }
        } catch {
          // Best-effort — always clear local state
        } finally {
          set({
            user: null, accessToken: null, refreshToken: null,
            isAuthenticated: false, error: null,
          });
        }
      },
    }),
    {
      name: 'nesya-auth',
      // Only persist the refresh token (access token stays in memory)
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    }
  )
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { detail?: string } }; message?: string };
    return e.response?.data?.detail ?? e.message ?? fallback;
  }
  return fallback;
}
