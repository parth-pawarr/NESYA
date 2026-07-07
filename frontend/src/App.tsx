import React, { useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  Sun, Moon, PanelLeft, FileText, Loader2, BarChart3, LogOut, User,
} from 'lucide-react';
import { useChatStore } from './store/chatStore';
import { useAuthStore } from './store/authStore';
import { useChat } from './hooks/useChat';
import Sidebar from './components/sidebar/Sidebar';
import ChatWindow from './components/chat/ChatWindow';
import FIRDocumentPanel from './components/fir/FIRDocument';
import FIRProgressBar from './components/fir/FIRProgressBar';
import ToastContainer from './components/ui/ToastContainer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './components/auth/LoginPage';
import SignUpPage from './components/auth/SignUpPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import VerifyEmailPage from './components/auth/VerifyEmailPage';
import OAuthCallback from './components/auth/OAuthCallback';

// ── Chat App (protected) ──────────────────────────────────────────────────────
function ChatApp() {
  const {
    activeSessionId, sessions, isTyping, isLoading, theme,
    showFIRPanel, showSidebar, toggleTheme, setShowFIRPanel,
    setShowSidebar, setActiveSession,
  } = useChatStore();

  const { initSession, sendChat, startNewChat, triggerGenerateFIR } = useChat();
  const { user, logout } = useAuthStore();

  const activeSession = activeSessionId ? sessions[activeSessionId] : null;
  const firData = activeSession?.fir_data;
  const completion = activeSession?.completion_percentage ?? 0;

  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'light-mode' : '';
  }, [theme]);

  useEffect(() => {
    if (!activeSessionId) initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = useCallback((msg: string) => sendChat(msg), [sendChat]);
  const handleNewChat = useCallback(async () => { await startNewChat(); }, [startNewChat]);
  const handleSelectSession = useCallback((id: string) => setActiveSession(id), [setActiveSession]);

  return (
    <div className="app-layout">
      <div className={`sidebar ${showSidebar ? '' : 'collapsed'}`}>
        <Sidebar onNewChat={handleNewChat} onSelectSession={handleSelectSession} />
      </div>

      <main className="chat-main">
        <header className="chat-header">
          <div className="chat-header-left">
            <button className="header-btn" onClick={() => setShowSidebar(!showSidebar)}
              title="Toggle sidebar" aria-label="Toggle sidebar">
              <PanelLeft size={16} />
            </button>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                NESYA FIR Assistant
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isTyping ? 'var(--warning)' : 'var(--success)',
                  display: 'inline-block',
                  boxShadow: `0 0 6px ${isTyping ? 'var(--warning)' : 'var(--success)'}`,
                }} />
                {isTyping ? 'Analyzing…' : isLoading ? 'Connecting…' : 'AI Legal Assistant · Online'}
              </div>
            </div>
          </div>

          <div className="chat-header-right">
            {completion > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(16,163,127,0.08)', border: '1px solid var(--border)',
                padding: '4px 10px', borderRadius: 20, fontSize: 12, color: 'var(--text-primary)',
              }}>
                <BarChart3 size={12} />
                {completion}% Complete
              </div>
            )}
            {firData && (
              <button className="header-btn" onClick={() => setShowFIRPanel(!showFIRPanel)}
                title="View FIR Document" aria-label="Toggle FIR panel"
                style={{
                  background: showFIRPanel ? 'rgba(16,163,127,0.16)' : 'rgba(148,163,184,0.04)',
                  borderColor: showFIRPanel ? 'rgba(16,163,127,0.28)' : 'var(--border)',
                  color: 'var(--text-primary)',
                }}>
                <FileText size={16} />
              </button>
            )}
            {!firData && completion > 0 && (
              <button className="header-btn" onClick={() => triggerGenerateFIR()}
                title="Generate FIR now" style={{ color: 'var(--text-primary)' }} disabled={isTyping}>
                {isTyping
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : <FileText size={16} />}
              </button>
            )}

            {/* User avatar */}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--violet-500), var(--cyan-500))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
                  border: '1px solid rgba(16,163,127,0.3)',
                }}>
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : user.full_name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            <button className="header-btn" onClick={toggleTheme}
              title="Toggle theme" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button className="header-btn" onClick={() => logout()}
              title="Sign out" aria-label="Sign out"
              style={{ color: 'var(--text-muted)' }}>
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <FIRProgressBar />

        {isLoading && !activeSessionId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <Loader2 size={40} style={{ color: 'var(--violet-400)', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Connecting to NESYA AI…</p>
            </div>
          </div>
        ) : (
          <ChatWindow onSend={handleSend} />
        )}
      </main>

      {firData && showFIRPanel && (
        <FIRDocumentPanel fir={firData} onRegenerate={() => triggerGenerateFIR()} />
      )}

      <ToastContainer />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── App Initializer ───────────────────────────────────────────────────────────
function AppInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => { initialize(); }, [initialize]);

  // Show a minimal splash while the store hydrates (< 300ms typically)
  if (!isInitialized) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-content">
          <div className="auth-loading-logo">🛡️</div>
          <Loader2 size={28} className="auth-spin" style={{ color: '#10a37f' }} />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />

          {/* Protected chat app */}
          <Route path="/" element={
            <ProtectedRoute>
              <ChatApp />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppInitializer>
    </BrowserRouter>
  );
}
