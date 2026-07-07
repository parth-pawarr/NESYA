import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../hooks/useAuth';

type State = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('No verification token found in the URL. Please use the link from your email.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await verifyEmail(token);
        if (!cancelled) {
          setMessage(res.message);
          setState('success');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const e = err as { response?: { data?: { detail?: string } } };
          setMessage(e.response?.data?.detail ?? 'Verification failed. The link may have expired.');
          setState('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const content: Record<State, React.ReactNode> = {
    loading: (
      <div className="auth-verify-state">
        <Loader2 size={48} className="auth-spin auth-verify-icon" style={{ color: 'var(--violet-400)' }} />
        <h3 className="auth-verify-title">Verifying your email…</h3>
        <p className="auth-verify-text">Please wait while we confirm your email address.</p>
      </div>
    ),
    success: (
      <div className="auth-verify-state">
        <div className="auth-success-icon">
          <CheckCircle size={48} strokeWidth={1.5} />
        </div>
        <h3 className="auth-verify-title" style={{ color: 'var(--success)' }}>Email verified!</h3>
        <p className="auth-verify-text">{message}</p>
        <Link to="/login" className="auth-btn-primary" id="verify-go-login"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Continue to Sign In
        </Link>
      </div>
    ),
    error: (
      <div className="auth-verify-state">
        <div className="auth-error-icon">
          <AlertCircle size={48} strokeWidth={1.5} />
        </div>
        <h3 className="auth-verify-title" style={{ color: 'var(--error)' }}>Verification failed</h3>
        <p className="auth-verify-text">{message}</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/login" className="auth-btn-outline" id="verify-go-login-err"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Go to Sign In
          </Link>
          <Link to="/signup" className="auth-btn-primary"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Register again
          </Link>
        </div>
      </div>
    ),
  };

  return (
    <AuthLayout
      title={state === 'loading' ? 'Email Verification' : undefined}
      subtitle={state === 'loading' ? 'Just a moment…' : undefined}
    >
      {content[state]}
    </AuthLayout>
  );
}
