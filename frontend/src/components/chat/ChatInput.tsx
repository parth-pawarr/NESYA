import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { translateText } from '../../services/api';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal?: boolean;
  [index: number]: SpeechRecognitionAlternativeLike | undefined;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
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

type VoiceLanguage = 'en' | 'hi' | 'mr';

type TranslationSourceLanguage = 'hi' | 'mr' | 'auto';

const containsDevanagari = (text: string) => /[\u0900-\u097F]/.test(text);

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
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [hasLocalText, setHasLocalText] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceLanguageRef = useRef<VoiceLanguage>('en');
  const originalLocalTextRef = useRef<string>('');

  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const chunk = result?.[0]?.transcript ?? '';
          if (result?.isFinal) {
            finalTranscript += chunk;
          } else {
            interimTranscript += chunk;
          }
        }

        if (finalTranscript) {
          const transcript = finalTranscript.trim();
          setValue((prev) => `${prev.trim() ? `${prev.trim()} ` : ''}${transcript}`.trim());
          setVoiceError('');
          // Mark that text comes from a local language (non-English)
          if (voiceLanguageRef.current !== 'en') {
            setHasLocalText(true);
            originalLocalTextRef.current = transcript;
          }
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
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      recognitionRef.current = null;
    };
  }, []);

  const handleSend = useCallback(() => {
    let msg = value.trim();
    if (!msg || disabled) return;
    
    // If there's original local language text, append it on a separate line
    if (originalLocalTextRef.current && voiceLanguage !== 'en') {
      msg = `${msg}\n(${originalLocalTextRef.current})`;
    }
    
    onSend(msg);
    setValue('');
    setVoiceError('');
    setHasLocalText(false);
    originalLocalTextRef.current = '';
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, voiceLanguage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);
    setVoiceError('');
    setHasLocalText(containsDevanagari(text));
    if (!containsDevanagari(text)) {
      originalLocalTextRef.current = '';
    }
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  const stopVoiceInput = useCallback(() => {
    recognitionRef.current?.stop();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setIsListening(false);
  }, []);

  const handleVoiceLanguageChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const language = event.target.value as VoiceLanguage;
    voiceLanguageRef.current = language;
    setVoiceLanguage(language);
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
    }
  }, []);

  const handleTranslateToEnglish = useCallback(async () => {
    const msg = value.trim();
    if (!msg) return;

    const sourceLanguage: TranslationSourceLanguage =
      voiceLanguage !== 'en' ? voiceLanguage : 'auto';

    // Save the original local language text before translation
    originalLocalTextRef.current = msg;

    setIsTranslating(true);
    setVoiceError('');
    try {
      const translated = await translateText(msg, sourceLanguage);
      setValue(translated);
      setHasLocalText(false);
    } catch {
      setVoiceError('Could not translate. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }, [value, voiceLanguage]);

  const toggleVoiceInput = useCallback(async () => {
    if (!recognitionRef.current) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      stopVoiceInput();
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is unavailable in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setVoiceError('');
      setIsListening(true);
      recognitionRef.current.lang = voiceLanguage === 'hi' ? 'hi-IN' : voiceLanguage === 'mr' ? 'mr-IN' : 'en-IN';
      recognitionRef.current.start();
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Microphone permission was denied or unavailable.';
      setVoiceError(message);
      setIsListening(false);
    }
  }, [isListening, stopVoiceInput, voiceLanguage]);

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
          <select
            className="voice-language-select"
            value={voiceLanguage}
            onChange={handleVoiceLanguageChange}
            disabled={isListening || disabled}
            aria-label="Voice input language"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
          </select>
        )}
        {voiceSupported && (
          <button
            className={`voice-btn ${isListening ? 'active' : ''}`}
            onClick={toggleVoiceInput}
            disabled={disabled || isTranslating}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            type="button"
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
        {hasLocalText && (
          <button
            className="translate-btn"
            onClick={handleTranslateToEnglish}
            disabled={disabled || isTranslating}
            aria-label="Translate to English"
            type="button"
            title="Translate local language text to English"
          >
            📝 Translate
          </button>
        )}
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!value.trim() || disabled || isTranslating}
          aria-label="Send message"
          type="button"
        >
          <Send size={16} />
        </button>
      </div>
      <p className="input-hint">
        Press <strong>Enter</strong> to send · <strong>Shift+Enter</strong> for new line
        {voiceSupported ? ' · Choose a voice language, then tap the mic' : ''}
      </p>
      {voiceError && <p className="voice-error">{voiceError}</p>}
    </div>
  );
}
