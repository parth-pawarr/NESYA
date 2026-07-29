import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';

interface SpeechRecognitionResultLike {
  transcript: string;
  isFinal?: boolean;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export default function ChatInput({ onSend, disabled = false }: Props) {
  const [value, setValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const chunk = result[0]?.transcript ?? '';
          if (result[0]?.isFinal) {
            finalTranscript += chunk;
          } else {
            interimTranscript += chunk;
          }
        }

        if (finalTranscript) {
          setValue((prev) => {
            const base = prev.trim();
            const nextText = `${base ? `${base} ` : ''}${finalTranscript.trim()}`.trim();
            return nextText;
          });
          setVoiceError('');
        }

        if (interimTranscript && !finalTranscript) {
          setVoiceError('');
        }
      };

      recognition.onerror = (event) => {
        const message =
          event.error === 'not-allowed'
            ? 'Microphone access was denied. Please allow it and try again.'
            : event.error === 'no-speech'
              ? 'No speech was detected. Please try again.'
              : 'Voice input could not be started right now.';
        setVoiceError(message);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setVoiceSupported(true);
    } else {
      setVoiceSupported(false);
    }

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const handleSend = useCallback(() => {
    const msg = value.trim();
    if (!msg || disabled) return;
    onSend(msg);
    setValue('');
    setVoiceError('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setVoiceError('');
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  const toggleVoiceInput = useCallback(() => {
    if (!recognitionRef.current) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    setVoiceError('');
    setIsListening(true);
    recognitionRef.current.start();
  }, [isListening]);

  return (
    <div className="chat-input-area">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening for your voice…' : 'Describe the incident or answer the question above…'}
          disabled={disabled}
          rows={1}
          aria-label="Chat input"
        />
        {voiceSupported && (
          <button
            className={`voice-btn ${isListening ? 'active' : ''}`}
            onClick={toggleVoiceInput}
            disabled={disabled}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            type="button"
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          type="button"
        >
          <Send size={16} />
        </button>
      </div>
      <p className="input-hint">
        Press <strong>Enter</strong> to send · <strong>Shift+Enter</strong> for new line
        {voiceSupported ? ' · Tap the mic to speak' : ''}
      </p>
      {voiceError && <p className="voice-error">{voiceError}</p>}
    </div>
  );
}
