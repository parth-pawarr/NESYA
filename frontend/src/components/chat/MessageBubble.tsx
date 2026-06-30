import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import type { LocalMessage } from '../../store/chatStore';
import { useChatStore } from '../../store/chatStore';

interface Props {
  message: LocalMessage;
}

export default function MessageBubble({ message }: Props) {
  const [copied, setCopied] = useState(false);
  const { addToast } = useChatStore();
  const isAI = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    addToast('Message copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`message-wrapper ${isAI ? 'ai' : 'user'}`}>
      {/* Avatar */}
      <div className={`message-avatar ${isAI ? 'ai' : 'user'}`}>
        {isAI ? '⚖️' : 'U'}
      </div>

      {/* Content */}
      <div className="message-content">
        <div className={`message-bubble ${isAI ? 'ai' : 'user'}`}>
          {isAI ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                strong: ({ children }) => (
                  <strong style={{ color: 'var(--violet-300)', fontWeight: 600 }}>
                    {children}
                  </strong>
                ),
                p: ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
                ul: ({ children }) => (
                  <ul style={{ paddingLeft: '18px', margin: '4px 0 8px' }}>{children}</ul>
                ),
                li: ({ children }) => (
                  <li style={{ marginBottom: '4px' }}>{children}</li>
                ),
                ol: ({ children }) => (
                  <ol style={{ paddingLeft: '18px', margin: '4px 0 8px' }}>{children}</ol>
                ),
                code: ({ children }) => (
                  <code
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      background: 'rgba(16,163,127,0.12)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    {children}
                  </code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <p style={{ margin: 0 }}>{message.content}</p>
          )}
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="message-time">{formattedTime}</span>
          <div className="message-actions">
            <button className="msg-action-btn" onClick={handleCopy} title="Copy message">
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
