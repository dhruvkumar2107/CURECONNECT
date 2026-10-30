// Browser-native voice: Web Speech API for recognition and speechSynthesis for read-aloud.
// No audio is sent to CureConnect or Gemini — only the recognised, user-reviewed text is.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from './types';

type RecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

const getRecognition = (): RecognitionCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

const speechLang = (language: Language, sample = '') => {
  if (language === 'hi') return 'hi-IN';
  if (language === 'en') return 'en-IN';
  return /[ऀ-ॿ]/.test(sample) ? 'hi-IN' : 'en-IN';
};

const RECOGNITION_ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access was blocked. Allow it in your browser settings to use voice input.',
  'service-not-allowed': 'Voice input is not allowed in this browser.',
  'audio-capture': 'No microphone was found. Check that one is connected.',
  network: 'Voice recognition needs an internet connection in this browser.',
  'no-speech': 'No speech was detected. Try again and speak clearly.',
  'language-not-supported': 'This language is not supported for voice input in your browser.',
};

export function useSpeechInput(onText: (text: string, isFinal: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<SpeechRecognitionLike | null>(null);
  const supported = typeof window !== 'undefined' && Boolean(getRecognition());
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const stop = useCallback(() => {
    ref.current?.stop();
  }, []);

  const start = useCallback((language: Language) => {
    const Ctor = getRecognition();
    if (!Ctor) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge, or type your message.');
      return;
    }
    ref.current?.abort();
    const rec = new Ctor();
    rec.lang = speechLang(language);
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let text = '';
      let final = false;
      for (let i = 0; i < e.results.length; i += 1) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      onTextRef.current(text, final);
    };
    rec.onerror = (e) => {
      if (e.error !== 'aborted') setError(RECOGNITION_ERRORS[e.error] ?? 'Voice input stopped because of an error.');
    };
    rec.onend = () => setListening(false);
    setError(null);
    try {
      rec.start();
      ref.current = rec;
      setListening(true);
    } catch {
      setError('Could not start voice input. Please try again.');
    }
  }, []);

  useEffect(() => () => ref.current?.abort(), []);

  return { supported, listening, error, start, stop, clearError: () => setError(null) };
}

export function useSpeechOutput() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  const speak = useCallback(
    (id: string, text: string, language: Language) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 6000));
      utterance.lang = speechLang(language, text);
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang === utterance.lang);
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
      utterance.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speakingId, speak, stop };
}
