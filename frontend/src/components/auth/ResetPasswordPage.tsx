import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../hooks/useAuth';

const PASSWORD_RE = {
  upper: /[A-Z]/,
  lower: /[a-z]/,
  digit: /\d/,
};

function getStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (PASSWORD_RE.upper.test(pw)) s++;
  if (PASSWORD_RE.lower.test(pw)) s++;
  if (PASSWORD_RE.digit.test(pw)) s++;
  if (pw.length >= 12) s++;
  return Math.min(s, 5);
}
const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10a37f'];

const schema = z.object({
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((v) => PASSWORD_RE.upper.test(v), 'Must contain an uppercase letter')
    .refine((v) => PASSWORD_RE.lower.test(v), 'Must contain a lowercase letter')
    .refine((v) => PASSWORD_RE.digit.test(v), 'Must contain a digit'),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});
type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const pwValue = watch('new_password', '');
  const strength = getStrength(pwValue);

  const onSubmit = async (data: FormData) => {
    if (!token) { setError('Invalid reset link. Please request a new one.'); return; }
    setIsLoading(true); setError(null);
    try {
      await resetPassword(token, data.new_password, data.confirm_password);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Reset failed. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="This reset link is missing a token">
        <div className="auth-success-state">
          <div className="auth-error-icon"><AlertCircle size={40} strokeWidth={1.5} /></div>
          <p className="auth-success-text">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link to="/forgot-password" className="auth-btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Request new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title="Password reset!" subtitle="Your password has been updated">
        <div className="auth-success-state">
          <div className="auth-success-icon"><CheckCircle size={40} strokeWidth={1.5} /></div>
          <p className="auth-success-text">
            Your password has been reset successfully. Redirecting you to sign in…
          </p>
          <div className="auth-redirect-timer">
            <Loader2 size={14} className="auth-spin" />
            <span>Redirecting in 3 seconds</span>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset password" subtitle="Choose a new secure password">
      {error && (
        <div className="auth-alert auth-alert-error" role="alert">
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
        <div className="auth-field">
          <label className="auth-label" htmlFor="reset-pw">New password</label>
          <div className={`auth-input-wrapper ${errors.new_password ? 'has-error' : ''}`}>
            <Lock size={15} className="auth-input-icon" />
            <input id="reset-pw" type={showPw ? 'text' : 'password'}
              className="auth-input" placeholder="Create a new password"
              autoComplete="new-password" {...register('new_password')} />
            <button type="button" className="auth-input-toggle"
              onClick={() => setShowPw(!showPw)} aria-label="Toggle">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {pwValue && (
            <div className="auth-strength">
              <div className="auth-strength-bars">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="auth-strength-bar"
                    style={{ background: i <= strength ? STRENGTH_COLORS[strength] : undefined }} />
                ))}
              </div>
              <span className="auth-strength-label" style={{ color: STRENGTH_COLORS[strength] }}>
                {STRENGTH_LABELS[strength]}
              </span>
            </div>
          )}
          {errors.new_password && <span className="auth-field-error">{errors.new_password.message}</span>}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="reset-confirm">Confirm new password</label>
          <div className={`auth-input-wrapper ${errors.confirm_password ? 'has-error' : ''}`}>
            <Lock size={15} className="auth-input-icon" />
            <input id="reset-confirm" type={showCf ? 'text' : 'password'}
              className="auth-input" placeholder="Repeat your new password"
              autoComplete="new-password" {...register('confirm_password')} />
            <button type="button" className="auth-input-toggle"
              onClick={() => setShowCf(!showCf)} aria-label="Toggle">
              {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.confirm_password && (
            <span className="auth-field-error">{errors.confirm_password.message}</span>
          )}
        </div>

        <button type="submit" className="auth-btn-primary" disabled={isLoading} id="reset-submit">
          {isLoading ? (
            <><Loader2 size={16} className="auth-spin" /> Resetting password…</>
          ) : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  );
}
