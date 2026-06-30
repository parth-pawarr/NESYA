import React, { useRef, useEffect } from 'react';
import { useChatStore, type LocalMessage } from '../../store/chatStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import SuggestedReplies from './SuggestedReplies';
import ChatInput from './ChatInput';
import EmptyState from '../ui/EmptyState';

interface Props {
  onSend: (msg: string) => void;
}

export default function ChatWindow({ onSend }: Props) {
  const { activeSessionId, sessions, isTyping } = useChatStore();
  const session = activeSessionId ? sessions[activeSessionId] : null;
  const messages: LocalMessage[] = session?.messages ?? [];
  const suggestedReplies = session?.suggested_replies ?? [];
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <>
      {/* Messages */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Replies */}
      {suggestedReplies.length > 0 && !isTyping && (
        <SuggestedReplies
          suggestions={suggestedReplies}
          onSelect={onSend}
        />
      )}

      {/* Input */}
      <ChatInput onSend={onSend} disabled={isTyping} />
    </>
  );
}
