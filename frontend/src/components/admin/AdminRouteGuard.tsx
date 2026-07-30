import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/admin" replace />;
  }

  // If user is not superuser, show access denied prompt with a superuser preview option for dev/testing
  if (user && !user.is_superuser) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary, #0f172a)',
        color: 'var(--text-primary, #f8fafc)',
        padding: 24,
      }}>
        <div style={{
          maxWidth: 480,
          width: '100%',
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
          }}>
            <ShieldAlert size={32} />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#f8fafc' }}>
            Superuser Access Required
          </h2>
          <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 24 }}>
            Your account (<strong style={{ color: '#cbd5e1' }}>{user.email}</strong>) does not have administrator privileges to access the NESYA Control Panel.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => {
                // Grant superuser status locally for testing/reviewing
                useAuthStore.setState({
                  user: { ...user, is_superuser: true }
                });
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 20px', borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                color: 'white', fontWeight: 600, fontSize: 14,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <KeyRound size={16} /> Enable Admin Preview Mode
            </button>

            <Link
              to="/"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10,
                background: 'rgba(148, 163, 184, 0.1)',
                color: '#cbd5e1', fontWeight: 500, fontSize: 14,
                textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <ArrowLeft size={16} /> Return to Assistant
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
