import React, { useEffect, useCallback } from 'react';
import {
  Sun, Moon, PanelLeft, FileText, Loader2, BarChart3,
} from 'lucide-react';
import { useChatStore } from './store/chatStore';
import { useChat } from './hooks/useChat';
import Sidebar from './components/sidebar/Sidebar';
import ChatWindow from './components/chat/ChatWindow';
import FIRDocumentPanel from './components/fir/FIRDocument';
import FIRProgressBar from './components/fir/FIRProgressBar';
import ToastContainer from './components/ui/ToastContainer';

export default function App() {
  const {
    activeSessionId,
    sessions,
    isTyping,
    isLoading,
    theme,
    showFIRPanel,
    showSidebar,
    toggleTheme,
    setShowFIRPanel,
    setShowSidebar,
    setActiveSession,
  } = useChatStore();

  const { initSession, sendChat, startNewChat, triggerGenerateFIR } = useChat();

  const activeSession = activeSessionId ? sessions[activeSessionId] : null;
  const firData = activeSession?.fir_data;
  const completion = activeSession?.completion_percentage ?? 0;

  // Apply theme class to root
  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'light-mode' : '';
  }, [theme]);

  // Auto-start session on first load
  useEffect(() => {
    if (!activeSessionId) {
      initSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = useCallback(
    (msg: string) => {
      sendChat(msg);
    },
    [sendChat]
  );

  const handleNewChat = useCallback(async () => {
    await startNewChat();
  }, [startNewChat]);

  const handleSelectSession = useCallback(
    (id: string) => {
      setActiveSession(id);
    },
    [setActiveSession]
  );

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? '' : 'collapsed'}`}>
        <Sidebar
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
        />
      </div>

      {/* Main Chat Area */}
      <main className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              className="header-btn"
              onClick={() => setShowSidebar(!showSidebar)}
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              <PanelLeft size={16} />
            </button>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                NESYA FIR Assistant
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: isTyping ? 'var(--warning)' : 'var(--success)',
                    display: 'inline-block',
                    boxShadow: `0 0 6px ${isTyping ? 'var(--warning)' : 'var(--success)'}`,
                  }}
                />
                {isTyping ? 'Analyzing…' : isLoading ? 'Connecting…' : 'AI Legal Assistant · Online'}
              </div>
            </div>
          </div>

          <div className="chat-header-right">
            {/* Completion indicator in header */}
            {completion > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(16,163,127,0.08)',
                border: '1px solid var(--border)',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 12,
                color: 'var(--text-primary)',
              }}>
                <BarChart3 size={12} />
                {completion}% Complete
              </div>
            )}

            {/* Toggle FIR Panel */}
            {firData && (
              <button
                className="header-btn"
                onClick={() => setShowFIRPanel(!showFIRPanel)}
                title="View FIR Document"
                aria-label="Toggle FIR panel"
                style={{
                  background: showFIRPanel
                    ? 'rgba(16,163,127,0.16)'
                    : 'rgba(148,163,184,0.04)',
                  borderColor: showFIRPanel ? 'rgba(16,163,127,0.28)' : 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <FileText size={16} />
              </button>
            )}

            {/* Generate FIR manually */}
            {!firData && completion > 0 && (
              <button
                className="header-btn"
                onClick={() => triggerGenerateFIR()}
                title="Generate FIR now"
                style={{ color: 'var(--text-primary)' }}
                disabled={isTyping}
              >
                {isTyping ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={16} />}
              </button>
            )}

            {/* Theme toggle */}
            <button
              className="header-btn"
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Progress Bar */}
        <FIRProgressBar />

        {/* Loading skeleton when initializing */}
        {isLoading && !activeSessionId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <Loader2
                size={40}
                style={{ color: 'var(--violet-400)', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Connecting to NESYA AI…</p>
            </div>
          </div>
        ) : (
          <ChatWindow onSend={handleSend} />
        )}
      </main>

      {/* FIR Document Panel */}
      {firData && showFIRPanel && (
        <FIRDocumentPanel
          fir={firData}
          onRegenerate={() => triggerGenerateFIR()}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Spin animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
