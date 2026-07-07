import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const location = useLocation();

  // While the store is hydrating / checking the refresh token, show a loader
  if (!isInitialized) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-content">
          <div className="auth-loading-logo">
            <span>🛡️</span>
          </div>
          <Loader2 size={28} className="auth-spin" style={{ color: 'var(--violet-400)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
            Loading NESYA…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the attempted path so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
