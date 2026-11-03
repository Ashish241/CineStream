import { useState, useEffect, useRef, useCallback } from 'react';

// SpeechRecognition interfaces for standard & webkit speech APIs
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: ISpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

export interface UseVoiceSearchOptions {
  onSearchResult?: (query: string) => void;
  defaultLang?: string;
}

export function useVoiceSearch(options?: UseVoiceSearchOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<string>(options?.defaultLang || 'en-IN');
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const onSearchResultRef = useRef(options?.onSearchResult);

  useEffect(() => {
    onSearchResultRef.current = options?.onSearchResult;
  }, [options?.onSearchResult]);

  // Check support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechClass));
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping speech recognition:', err);
      }
      setIsListening(false);
    }
  }, [isListening]);

  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.warn('Error aborting speech recognition:', err);
      }
      setIsListening(false);
      setInterimTranscript('');
    }
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    if (typeof window === 'undefined') return;

    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) {
      setError('Speech recognition is not supported on this browser or TV WebKit engine.');
      return;
    }

    try {
      // Abort previous instance if any
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechClass();
      recognitionRef.current = recognition;

      recognition.continuous = false; // TV remote mic behaves best when capturing a single query
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            currentFinal += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }

        if (currentFinal) {
          const cleaned = currentFinal.trim();
          setTranscript(cleaned);
          setInterimTranscript('');
          if (onSearchResultRef.current && cleaned) {
            onSearchResultRef.current(cleaned);
          }
        }
      };

      recognition.onspeechend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (event.error === 'no-speech') {
          setError('No voice detected. Please speak clearly into your TV remote or microphone.');
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone permission denied. Please allow microphone access in browser settings.');
        } else if (event.error === 'audio-capture') {
          setError('No microphone detected on this TV or device.');
        } else if (event.error === 'network') {
          setError('Speech network error. Check internet connection.');
        } else {
          setError(`Speech error: ${event.error || 'Unknown'}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setError(err?.message || 'Failed to start microphone. Please check permissions.');
    }
  }, [lang]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    lang,
    setLang,
    startListening,
    stopListening,
    abortListening,
    resetTranscript: () => {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
    },
  };
}
