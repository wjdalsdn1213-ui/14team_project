'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Difficulty } from '@/lib/types';

// Web Speech API types (not included in TypeScript's standard DOM lib)
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionErrEvent {
  error: string;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface PrescribedExItem {
  id: string;
  name: string;
}

interface VoiceLogResult {
  exercise_name: string;
  sets: number;
  reps: number;
  pain_score: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface MatchedResult extends VoiceLogResult {
  exerciseId: string;
}

interface Props {
  prescribedExercises: PrescribedExItem[];
  onConfirm: (
    exerciseId: string,
    sets: number,
    reps: number,
    painScore: number,
    difficulty: Difficulty
  ) => Promise<void>;
}

type Status = 'idle' | 'recording' | 'analyzing' | 'preview' | 'error';

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  hard: 'text-red-600 bg-red-50 border-red-200',
};

const PAIN_COLOR = (score: number) =>
  score === 0 ? 'text-slate-400' : score <= 3 ? 'text-emerald-600' : score <= 6 ? 'text-amber-600' : 'text-red-600';

export default function VoiceLogRecorder({ prescribedExercises, onConfirm }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<MatchedResult | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTextRef = useRef('');

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => () => stopRecognition(), [stopRecognition]);

  const analyzeTranscript = async (text: string) => {
    setStatus('analyzing');
    try {
      const res = await fetch('/api/ai/voice-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          exercises: prescribedExercises.map(e => ({ id: e.id, name: e.name })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? '분석에 실패했습니다.');
      }
      const data = await res.json() as VoiceLogResult;

      const matched =
        prescribedExercises.find(
          e =>
            e.name === data.exercise_name ||
            e.name.includes(data.exercise_name) ||
            data.exercise_name.includes(e.name)
        ) ?? prescribedExercises[0];

      setResult({ ...data, exerciseId: matched?.id ?? '' });
      setStatus('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      setStatus('error');
    }
  };

  const startRecording = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.');
      setStatus('error');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;

    finalTextRef.current = '';
    setTranscript('');
    setStatus('recording');

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      let newFinal = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal += t;
        } else {
          interim += t;
        }
      }
      if (newFinal) {
        finalTextRef.current += newFinal;
      }
      setTranscript(finalTextRef.current + (interim ? interim : ''));
    };

    recognition.onerror = (event: SpeechRecognitionErrEvent) => {
      if (event.error !== 'aborted') {
        setError('음성 인식 오류가 발생했습니다. 다시 시도해주세요.');
        setStatus('error');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopAndAnalyze = () => {
    stopRecognition();
    const text = finalTextRef.current.trim() || transcript.trim();
    if (text) {
      analyzeTranscript(text);
    } else {
      setStatus('idle');
    }
  };

  const handleConfirm = async () => {
    if (!result?.exerciseId) return;
    setSaving(true);
    await onConfirm(result.exerciseId, result.sets, result.reps, result.pain_score, result.difficulty);
    setSaving(false);
    reset();
  };

  const reset = () => {
    stopRecognition();
    setStatus('idle');
    setTranscript('');
    setResult(null);
    setError('');
    finalTextRef.current = '';
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 mb-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
          <MicIcon className="text-white" size={16} />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-sm">음성으로 기록하기</h2>
          <p className="text-xs text-slate-500">말하면 AI가 자동으로 분석합니다</p>
        </div>
      </div>

      {/* Idle / Recording */}
      {(status === 'idle' || status === 'recording') && (
        <div className="flex flex-col items-center py-2">
          {/* Mic button with wave rings */}
          <div className="relative flex items-center justify-center w-24 h-24">
            {status === 'recording' && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25" />
                <span
                  className="absolute rounded-full bg-red-300 animate-ping opacity-15"
                  style={{ inset: '-10px', animationDelay: '0.25s' }}
                />
                <span
                  className="absolute rounded-full bg-red-200 animate-ping opacity-10"
                  style={{ inset: '-22px', animationDelay: '0.5s' }}
                />
              </>
            )}
            <button
              type="button"
              onClick={status === 'idle' ? startRecording : stopAndAnalyze}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                status === 'recording'
                  ? 'bg-red-500 hover:bg-red-600 scale-105 shadow-red-300'
                  : 'bg-blue-500 hover:bg-blue-600 hover:scale-105 shadow-blue-300'
              }`}
            >
              {status === 'recording' ? (
                <StopIcon />
              ) : (
                <MicIcon className="text-white" size={28} />
              )}
            </button>
          </div>

          <p
            className={`mt-4 text-sm font-semibold ${
              status === 'recording' ? 'text-red-500' : 'text-slate-400'
            }`}
          >
            {status === 'recording' ? '● 녹음 중 — 다시 누르면 분석 시작' : '눌러서 녹음 시작'}
          </p>

          <p
            className={`mt-1.5 text-xs text-center max-w-xs leading-relaxed transition-all ${
              status === 'recording' ? 'text-red-400/70' : 'text-slate-400'
            }`}
          >
            예: &ldquo;어깨 외회전 3세트 15회 통증 3점 난이도 보통&rdquo;
          </p>

          {transcript && (
            <div className="mt-4 w-full bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-100">
              <p className="text-xs text-blue-500 font-semibold mb-1.5">인식된 텍스트</p>
              <p className="text-sm text-slate-700 leading-relaxed">{transcript}</p>
            </div>
          )}
        </div>
      )}

      {/* Analyzing */}
      {status === 'analyzing' && (
        <div className="flex flex-col items-center py-8 gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-sm font-bold text-blue-600">AI 분석 중...</p>
            <p className="text-xs text-slate-400 mt-1">운동 정보를 추출하고 있어요</p>
          </div>
          {transcript && (
            <div className="w-full bg-white/80 rounded-xl p-3 border border-blue-100">
              <p className="text-xs text-slate-500 leading-relaxed">&ldquo;{transcript}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {/* Preview Result */}
      {status === 'preview' && result && (
        <div className="space-y-3">
          {transcript && (
            <div className="bg-white/70 rounded-xl p-3 border border-slate-100">
              <p className="text-xs text-slate-400 font-medium mb-1">인식된 음성</p>
              <p className="text-xs text-slate-600 leading-relaxed">&ldquo;{transcript}&rdquo;</p>
            </div>
          )}

          {/* Result card */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-blue-500 flex items-center gap-2">
              <SparkleIcon />
              <span className="text-white text-xs font-bold">AI 분석 결과</span>
            </div>
            <div className="p-4">
              <div className="mb-3 pb-3 border-b border-slate-100">
                <p className="text-xs text-slate-400 mb-0.5">운동</p>
                <p className="text-lg font-bold text-slate-900">{result.exercise_name}</p>
                {!result.exerciseId && (
                  <p className="text-xs text-red-500 mt-1">처방 목록에서 매칭되는 운동을 찾지 못했습니다.</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatBox label="세트" value={result.sets} />
                <StatBox label="횟수" value={result.reps} />
                <StatBox
                  label="통증"
                  value={result.pain_score}
                  className={PAIN_COLOR(result.pain_score)}
                />
              </div>
              <div className={`mt-2 rounded-xl p-3 text-center border ${DIFFICULTY_STYLES[result.difficulty]}`}>
                <p className="text-xs mb-0.5 opacity-60 font-medium">난이도</p>
                <p className="text-sm font-bold">{DIFFICULTY_LABELS[result.difficulty]}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
            >
              다시 녹음
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!result.exerciseId || saving}
              className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition-all disabled:opacity-50 shadow-sm shadow-blue-200 flex items-center justify-center gap-2"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : null}
              {saving ? '저장 중...' : '이대로 저장'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="space-y-3">
          <div className="bg-red-50 rounded-xl p-4 border border-red-100 text-center">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-2xl font-bold ${className ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function MicIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      <path
        d="M19 10v2a7 7 0 0 1-14 0v-2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}
