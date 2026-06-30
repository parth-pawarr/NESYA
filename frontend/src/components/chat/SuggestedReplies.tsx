import React from 'react';
import { Zap } from 'lucide-react';

interface Props {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export default function SuggestedReplies({ suggestions, onSelect }: Props) {
  return (
    <div className="suggestions-container">
      <Zap size={12} style={{ color: 'var(--violet-400)', flexShrink: 0, marginTop: 2 }} />
      {suggestions.map((s, i) => (
        <button
          key={i}
          className="suggestion-chip"
          onClick={() => onSelect(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
