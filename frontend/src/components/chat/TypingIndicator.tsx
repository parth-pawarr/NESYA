import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <div className="message-avatar ai" style={{ width: 34, height: 34, borderRadius: 10 }}>
        ⚖️
      </div>
      <div className="typing-dots">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}
