'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(lang = 'ko-KR') {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef('');
  const onEndRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    setSupported(!!getSpeechRecognitionCtor());
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  /** 한 문장 인식 후 자동 종료 (단계별 말하기용) */
  const startOnce = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        setError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해 주세요.');
        return;
      }

      if (isListening) {
        stop();
        return;
      }

      setError(null);
      setTranscript('');

      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += chunk;
          else interim += chunk;
        }
        const combined = (final || interim).trim();
        setTranscript(combined);
        if (final.trim()) onFinal(final.trim());
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'aborted') return;
        const messages: Record<string, string> = {
          'not-allowed': '마이크 권한을 허용해 주세요.',
          'no-speech': '음성이 감지되지 않았습니다. 다시 말해 주세요.',
          network: '네트워크 오류가 발생했습니다.',
        };
        setError(messages[event.error] ?? '음성 인식 중 오류가 발생했습니다.');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        setIsListening(true);
      } catch {
        setError('음성 인식을 시작할 수 없습니다.');
        setIsListening(false);
      }
    },
    [lang, isListening, stop],
  );

  /** 마이크 한 번 — 말이 끝날 때까지 계속 듣고, 종료 시 전체 텍스트 반환 */
  const startContinuous = useCallback(
    (onEnd: (text: string) => void) => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        setError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해 주세요.');
        return;
      }

      if (isListening) {
        stop();
        return;
      }

      setError(null);
      setTranscript('');
      finalTranscriptRef.current = '';
      onEndRef.current = onEnd;

      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += chunk;
          } else {
            interim += chunk;
          }
        }
        setTranscript((finalTranscriptRef.current + interim).trim());
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'aborted') return;
        const messages: Record<string, string> = {
          'not-allowed': '마이크 권한을 허용해 주세요.',
          'no-speech': '음성이 감지되지 않았습니다. 다시 말해 주세요.',
          network: '네트워크 오류가 발생했습니다.',
        };
        setError(messages[event.error] ?? '음성 인식 중 오류가 발생했습니다.');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const full = finalTranscriptRef.current.trim();
        if (full) onEndRef.current?.(full);
        onEndRef.current = null;
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        setIsListening(true);
      } catch {
        setError('음성 인식을 시작할 수 없습니다.');
        setIsListening(false);
      }
    },
    [lang, isListening, stop],
  );

  return { isListening, transcript, error, supported, startOnce, startContinuous, stop, setError };
}
