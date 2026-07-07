import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/authService';

/**
 * OAuth Callback Handler
 * After the OAuth provider redirects to /auth/callback#access_token=...&refresh_token=...
 * this component reads the tokens from the URL fragment, fetches the user profile,
 * stores everything in the auth store, then navigates to /.
 */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);

  useEffect(() => {
    const hash = window.location.hash.slice(1); // remove leading '#'
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    // Clear the fragment from the URL immediately (security hygiene)
    window.history.replaceState(null, '', window.location.pathname);

    (async () => {
      try {
        const user = await authAPI.getMe(accessToken);
        setTokens(accessToken, refreshToken, user);
        navigate('/', { replace: true });
      } catch {
        navigate('/login?error=oauth_failed', { replace: true });
      }
    })();
  }, []);

  return (
    <div className="auth-loading-screen">
      <div className="auth-loading-content">
        <div className="auth-loading-logo"><span>🛡️</span></div>
        <Loader2 size={28} className="auth-spin" style={{ color: 'var(--violet-400)' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
          Completing sign in…
        </p>
      </div>
    </div>
  );
}
