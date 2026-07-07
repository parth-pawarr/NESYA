import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/authService';

export function useAuth() {
  const {
    user, accessToken, isAuthenticated, isLoading, isInitialized, error,
    login, register, logout, clearError, setTokens,
  } = useAuthStore();

  const forgotPassword = async (email: string) => {
    return authAPI.forgotPassword(email);
  };

  const resetPassword = async (token: string, password: string, confirm: string) => {
    return authAPI.resetPassword(token, password, confirm);
  };

  const verifyEmail = async (token: string) => {
    return authAPI.verifyEmail(token);
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    clearError,
    setTokens,
  };
}
