import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye, EyeOff, Mail, Lock, Loader2, AlertCircle,
  ArrowRight, CheckCircle2,
} from 'lucide-react';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/authService';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

/* ── OAuth Provider Icons ─────────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="10.5" height="10.5" fill="#f25022" rx="0.8"/>
      <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7fba00" rx="0.8"/>
      <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00a4ef" rx="0.8"/>
      <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#ffb900" rx="0.8"/>
    </svg>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export default function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [failedEmail, setFailedEmail] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const emailValue = watch('email');

  useEffect(() => {
    return () => clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear the "no account" suggestion when the user changes the email
  useEffect(() => {
    if (failedEmail && emailValue !== failedEmail) {
      setFailedEmail(null);
      setAttemptCount(0);
    }
  }, [emailValue, failedEmail]);

  const onSubmit = async (data: FormData) => {
    clearError();
    setFailedEmail(null);
    try {
      await login(data.email, data.password, data.rememberMe);
      setLoginSuccess(true);
      setTimeout(() => navigate(from, { replace: true }), 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      
      // If the user doesn't exist, automatically redirect to sign up
      if (msg.toLowerCase().includes('user not found')) {
        navigate('/signup', {
          state: { prefillEmail: data.email },
        });
        return;
      }
      
      // Otherwise, just show the standard error in the UI
      setAttemptCount(attemptCount + 1);
    }
  };

  const handleOAuth = (provider: 'google' | 'github' | 'microsoft') => {
    window.location.href = authAPI.getOAuthUrl(provider);
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to NESYA">

      {/* Error */}
      {error && (
        <div className="lp-alert lp-alert--error" role="alert" aria-live="assertive">
          <AlertCircle size={15} className="lp-alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Success flash */}
      {loginSuccess && (
        <div className="lp-alert lp-alert--success" role="status">
          <CheckCircle2 size={15} className="lp-alert-icon" />
          <span>Signed in successfully! Redirecting…</span>
        </div>
      )}

      {/* ── OAuth Row ──────────────────────────────────────── */}
      <div className="lp-oauth-row">
        <button
          type="button"
          className="lp-oauth-btn"
          onClick={() => handleOAuth('google')}
          id="oauth-google"
          aria-label="Continue with Google"
        >
          <GoogleIcon />
          <span>Google</span>
        </button>
        <button
          type="button"
          className="lp-oauth-btn"
          onClick={() => handleOAuth('github')}
          id="oauth-github"
          aria-label="Continue with GitHub"
        >
          <GitHubIcon />
          <span>GitHub</span>
        </button>
        <button
          type="button"
          className="lp-oauth-btn"
          onClick={() => handleOAuth('microsoft')}
          id="oauth-microsoft"
          aria-label="Continue with Microsoft"
        >
          <MicrosoftIcon />
          <span>Microsoft</span>
        </button>
      </div>

      {/* ── Divider ────────────────────────────────────────── */}
      <div className="lp-divider" aria-hidden="true">
        <span className="lp-divider-line" />
        <span className="lp-divider-text">or sign in with email</span>
        <span className="lp-divider-line" />
      </div>

      {/* ── Form ───────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} className="lp-form" noValidate autoComplete="on">
        {/* Email */}
        <div className="lp-field">
          <label className="lp-label" htmlFor="login-email">Email address</label>
          <div className={`lp-input-wrap ${errors.email ? 'lp-input-wrap--error' : emailValue ? 'lp-input-wrap--filled' : ''}`}>
            <Mail size={16} className="lp-input-icon" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              className="lp-input"
              placeholder="you@example.com"
              autoComplete="email"
              spellCheck={false}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <span className="lp-field-error" role="alert">
              <AlertCircle size={12} />
              {errors.email.message}
            </span>
          )}
        </div>

        {/* Password */}
        <div className="lp-field">
          <div className="lp-label-row">
            <label className="lp-label" htmlFor="login-password">Password</label>
            <Link to="/forgot-password" className="lp-forgot" tabIndex={0}>
              Forgot password?
            </Link>
          </div>
          <div className={`lp-input-wrap ${errors.password ? 'lp-input-wrap--error' : ''}`}>
            <Lock size={16} className="lp-input-icon" aria-hidden="true" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="lp-input"
              placeholder="Enter your password"
              autoComplete="current-password"
              {...register('password')}
            />
            <button
              type="button"
              className="lp-toggle-btn"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={0}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <span className="lp-field-error" role="alert">
              <AlertCircle size={12} />
              {errors.password.message}
            </span>
          )}
        </div>

        {/* Remember me */}
        <label className="lp-checkbox-label">
          <input
            type="checkbox"
            className="lp-checkbox"
            id="login-remember"
            {...register('rememberMe')}
          />
          <span className="lp-checkbox-custom" aria-hidden="true" />
          <span className="lp-checkbox-text">Remember me for 7 days</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          className={`lp-submit-btn ${isValid && !isLoading ? 'lp-submit-btn--active' : ''}`}
          disabled={isLoading || loginSuccess}
          id="login-submit"
          aria-label="Sign in to NESYA"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="lp-spin" />
              <span>Signing in…</span>
            </>
          ) : loginSuccess ? (
            <>
              <CheckCircle2 size={16} />
              <span>Success!</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight size={16} className="lp-btn-arrow" />
            </>
          )}
        </button>
      </form>

      {/* Sign up link */}
      <p className="lp-footer">
        Don't have an account?{' '}
        <Link to="/signup" className="lp-footer-link">
          Create free account
        </Link>
      </p>
    </AuthLayout>
  );
}
