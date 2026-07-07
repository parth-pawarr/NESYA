import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Loader2, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../hooks/useAuth';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await forgotPassword(data.email);
      setSentEmail(data.email);
      setSuccess(true);
    } catch (err: unknown) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent you a reset link">
        <div className="auth-success-state">
          <div className="auth-success-icon auth-success-icon-mail">
            <div className="auth-mail-animation">
              <Mail size={36} strokeWidth={1.5} />
              <div className="auth-mail-dot" />
            </div>
          </div>
          <p className="auth-success-text">
            A password reset link has been sent to{' '}
            <strong style={{ color: 'var(--violet-300)' }}>{sentEmail}</strong>.
            Check your inbox and click the link to reset your password.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
            Didn't receive it? Check your spam folder or{' '}
            <button
              type="button"
              className="auth-link"
              onClick={() => setSuccess(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              try again
            </button>.
          </p>
          <Link to="/login" className="auth-btn-outline" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
            <ArrowLeft size={15} />
            Back to Sign In
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password?" subtitle="Enter your email to receive a reset link">
      {error && (
        <div className="auth-alert auth-alert-error" role="alert">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
        <div className="auth-field">
          <label className="auth-label" htmlFor="forgot-email">Email address</label>
          <div className={`auth-input-wrapper ${errors.email ? 'has-error' : ''}`}>
            <Mail size={15} className="auth-input-icon" />
            <input
              id="forgot-email"
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              {...register('email')}
            />
          </div>
          {errors.email && <span className="auth-field-error">{errors.email.message}</span>}
        </div>

        <button type="submit" className="auth-btn-primary" disabled={isLoading} id="forgot-submit">
          {isLoading ? (
            <><Loader2 size={16} className="auth-spin" /> Sending link…</>
          ) : 'Send reset link'}
        </button>
      </form>

      <Link to="/login" className="auth-btn-outline" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
        <ArrowLeft size={15} />
        Back to Sign In
      </Link>
    </AuthLayout>
  );
}
