'use client';

import { useState, useRef } from 'react';
import { Difficulty } from '@/lib/types';

type SpeechRecognitionInstance = InstanceType<NonNullable<Window['SpeechRecognition']>>;

interface ExerciseItem {
  id: string;
  name: string;
}

interface Props {
  prescribedExercises: ExerciseItem[];
  onConfirm: (
    exerciseId: string,
    sets: number,
    reps: number,
    painScore: number,
    difficulty: Difficulty
  ) => Promise<void>;
}

type PhaseStatus = 'idle' | 'recording' | 'success' | 'error';

interface CollectedData {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  painScore: number;
  difficulty: Difficulty;
}

const STEP_CONFIG = [
  {
    label: '운동 선택',
    hint: '처방된 운동 이름을 말씀해주세요',
    example: '',
  },
  {
    label: '세트 수',
    hint: '세트 수를 말씀해주세요',
    example: '"3세트"',
  },
  {
    label: '횟수',
    hint: '횟수를 말씀해주세요',
    example: '"15회"',
  },
  {
    label: '통증 점수',
    hint: '통증 점수를 말씀해주세요',
    example: '"3점" 또는 "없어요"',
  },
  {
    label: '난이도',
    hint: '난이도를 말씀해주세요',
    example: '"쉬워요" / "보통" / "힘들었어요"',
  },
];

// --- Parsers ---

function matchExercise(text: string, exercises: ExerciseItem[]): ExerciseItem | null {
  const t = text.replace(/\s/g, '').toLowerCase();
  if (!t) return null;

  for (const ex of exercises) {
    const name = ex.name.replace(/\s/g, '').toLowerCase();
    if (name === t) return ex;
  }

  let best: ExerciseItem | null = null;
  let bestScore = 0;
  for (const ex of exercises) {
    const name = ex.name.replace(/\s/g, '').toLowerCase();
    if (name.includes(t) || t.includes(name)) {
      const score = Math.min(t.length, name.length);
      if (score > bestScore) {
        bestScore = score;
        best = ex;
      }
    }
  }
  return best;
}

function parseSets(text: string): number | null {
  const m = text.match(/(\d+)\s*세트/);
  if (m) return parseInt(m[1]);
  const m2 = text.match(/^(\d+)$/);
  if (m2) {
    const n = parseInt(m2[1]);
    if (n >= 1 && n <= 20) return n;
  }
  return null;
}

function parseReps(text: string): number | null {
  const m = text.match(/(\d+)\s*회/);
  if (m) return parseInt(m[1]);
  const m2 = text.match(/^(\d+)$/);
  if (m2) {
    const n = parseInt(m2[1]);
    if (n >= 1 && n <= 100) return n;
  }
  return null;
}

function parsePain(text: string): number | null {
  const noWords = ['없어요', '없음', '안아파', '안아프', '없다', '괜찮아', '없어', '통증없'];
  for (const w of noWords) {
    if (text.includes(w)) return 0;
  }
  const m = text.match(/(\d+)\s*점/);
  if (m) {
    const n = parseInt(m[1]);
    return Math.min(10, Math.max(0, n));
  }
  const m2 = text.match(/^(\d+)$/);
  if (m2) {
    const n = parseInt(m2[1]);
    if (n >= 0 && n <= 10) return n;
  }
  return null;
}

function parseDifficulty(text: string): Difficulty | null {
  if (/쉬워|편해|편했|쉬음|쉬웠|쉬었|easy/i.test(text)) return 'easy';
  if (/보통|중간|medium|적당|적절|그냥/i.test(text)) return 'medium';
  if (/힘들|어려|힘겨|힘겼|hard|힘들었|힘들어/i.test(text)) return 'hard';
  return null;
}

function difficultyLabel(d: Difficulty): string {
  return d === 'easy' ? '쉬워요' : d === 'medium' ? '보통' : '힘들었어요';
}

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  hard: 'text-red-600 bg-red-50 border-red-200',
};

const PAIN_COLOR = (score: number) =>
  score === 0
    ? 'text-slate-400'
    : score <= 3
    ? 'text-emerald-600'
    : score <= 6
    ? 'text-amber-600'
    : 'text-red-600';

// --- Component ---

export default function VoiceLogRecorder({ prescribedExercises, onConfirm }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepValues, setStepValues] = useState<(string | null)[]>(Array(5).fill(null));
  const [phase, setPhase] = useState<PhaseStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [collectedData, setCollectedData] = useState<Partial<CollectedData>>({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const recogRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTextRef = useRef('');

  // Refs kept in sync each render so SpeechRecognition callbacks see fresh values
  const currentStepRef = useRef(0);
  currentStepRef.current = currentStep;
  const stepValuesRef = useRef<(string | null)[]>(Array(5).fill(null));
  stepValuesRef.current = stepValues;
  const collectedDataRef = useRef<Partial<CollectedData>>({});
  collectedDataRef.current = collectedData;
  const exercisesRef = useRef(prescribedExercises);
  exercisesRef.current = prescribedExercises;

  // Handler called from recognition.onend — stored in ref to always be fresh
  const handleRecognizedRef = useRef<(text: string) => void>(null!);
  handleRecognizedRef.current = (text: string) => {
    const step = currentStepRef.current;
    const data = collectedDataRef.current;
    const values = [...stepValuesRef.current] as (string | null)[];
    let newData = { ...data };

    if (step === 0) {
      const match = matchExercise(text, exercisesRef.current);
      if (!match) {
        setPhase('error');
        setErrorMsg(`"${text}"에 해당하는 운동을 찾을 수 없습니다.`);
        return;
      }
      newData = { ...newData, exerciseId: match.id, exerciseName: match.name };
      values[0] = match.name;
    } else if (step === 1) {
      const sets = parseSets(text);
      if (sets === null) {
        setPhase('error');
        setErrorMsg(`세트 수를 인식하지 못했습니다. "${text}" — "3세트" 형식으로 말씀해주세요.`);
        return;
      }
      newData = { ...newData, sets };
      values[1] = `${sets}세트`;
    } else if (step === 2) {
      const reps = parseReps(text);
      if (reps === null) {
        setPhase('error');
        setErrorMsg(`횟수를 인식하지 못했습니다. "${text}" — "15회" 형식으로 말씀해주세요.`);
        return;
      }
      newData = { ...newData, reps };
      values[2] = `${reps}회`;
    } else if (step === 3) {
      const pain = parsePain(text);
      if (pain === null) {
        setPhase('error');
        setErrorMsg(`통증 점수를 인식하지 못했습니다. "${text}" — "3점" 또는 "없어요"로 말씀해주세요.`);
        return;
      }
      newData = { ...newData, painScore: pain };
      values[3] = pain === 0 ? '없음' : `${pain}점`;
    } else if (step === 4) {
      const diff = parseDifficulty(text);
      if (!diff) {
        setPhase('error');
        setErrorMsg(`난이도를 인식하지 못했습니다. "${text}" — "쉬워요", "보통", "힘들었어요" 중 하나로 말씀해주세요.`);
        return;
      }
      newData = { ...newData, difficulty: diff };
      values[4] = difficultyLabel(diff);
    }

    setCollectedData(newData);
    setStepValues(values);
    setPhase('success');

    if (step < 4) {
      setTimeout(() => {
        setCurrentStep(step + 1);
        setPhase('idle');
        setTranscript('');
        setErrorMsg('');
      }, 1400);
    } else {
      setTimeout(() => {
        setConfirming(true);
      }, 1400);
    }
  };

  const startRecording = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setPhase('error');
      setErrorMsg('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해주세요.');
      return;
    }

    finalTextRef.current = '';
    setTranscript('');
    setErrorMsg('');
    setPhase('recording');

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      if (finalText) finalTextRef.current = finalText;
      setTranscript(finalText || interimText);
    };

    recognition.onend = () => {
      const text = finalTextRef.current.trim();
      if (!text) {
        setPhase('error');
        setErrorMsg('음성이 인식되지 않았습니다. 마이크에 가까이 대고 다시 말씀해주세요.');
        return;
      }
      handleRecognizedRef.current(text);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted') return;
      if (event.error === 'no-speech') {
        setPhase('error');
        setErrorMsg('음성이 감지되지 않았습니다. 다시 시도해주세요.');
        return;
      }
      setPhase('error');
      setErrorMsg('마이크 오류: ' + event.error);
    };

    recogRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recogRef.current) {
      try { recogRef.current.stop(); } catch { /* ignore */ }
    }
  };

  const retryStep = () => {
    setPhase('idle');
    setTranscript('');
    setErrorMsg('');
  };

  const goToStep = (stepIndex: number) => {
    if (recogRef.current) {
      try { recogRef.current.abort(); } catch { /* ignore */ }
      recogRef.current = null;
    }
    const newValues = stepValues.map((v, i) => (i < stepIndex ? v : null)) as (string | null)[];
    setStepValues(newValues);
    setCurrentStep(stepIndex);
    setPhase('idle');
    setTranscript('');
    setErrorMsg('');
    setConfirming(false);

    // Preserve data only for steps before the reset point
    const d = collectedData;
    const newData: Partial<CollectedData> = {};
    if (stepIndex > 0 && d.exerciseId) { newData.exerciseId = d.exerciseId; newData.exerciseName = d.exerciseName; }
    if (stepIndex > 1 && d.sets !== undefined) newData.sets = d.sets;
    if (stepIndex > 2 && d.reps !== undefined) newData.reps = d.reps;
    if (stepIndex > 3 && d.painScore !== undefined) newData.painScore = d.painScore;
    setCollectedData(newData);
  };

  const handleConfirm = async () => {
    const d = collectedData as CollectedData;
    setSaving(true);
    try {
      await onConfirm(d.exerciseId, d.sets, d.reps, d.painScore, d.difficulty);
      resetAll();
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    if (recogRef.current) {
      try { recogRef.current.abort(); } catch { /* ignore */ }
      recogRef.current = null;
    }
    setCurrentStep(0);
    setStepValues(Array(5).fill(null));
    setPhase('idle');
    setTranscript('');
    setErrorMsg('');
    setCollectedData({});
    setConfirming(false);
  };

  // --- Confirm Screen ---
  if (confirming) {
    const d = collectedData as CollectedData;
    return (
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 mb-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
            <MicIcon className="text-white" size={16} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm">기록 확인</h2>
            <p className="text-xs text-slate-500">내용을 확인하고 저장해주세요</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 space-y-3 mb-4">
          <ConfirmRow label="운동" value={d.exerciseName} />
          <ConfirmRow label="세트" value={`${d.sets}세트`} />
          <ConfirmRow label="횟수" value={`${d.reps}회`} />
          <ConfirmRow
            label="통증"
            value={d.painScore === 0 ? '없음 (0점)' : `${d.painScore}점`}
            valueClass={PAIN_COLOR(d.painScore)}
          />
          <div className={`rounded-xl p-3 text-center border ${DIFFICULTY_STYLES[d.difficulty]}`}>
            <p className="text-xs mb-0.5 opacity-60 font-medium">난이도</p>
            <p className="text-sm font-bold">{difficultyLabel(d.difficulty)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => goToStep(0)}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            처음부터 다시
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition-all disabled:opacity-50 shadow-sm shadow-blue-200 flex items-center justify-center gap-2"
          >
            {saving && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    );
  }

  // --- Stepper ---
  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
            <MicIcon className="text-white" size={16} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm">음성으로 기록하기</h2>
            <p className="text-xs text-slate-500">단계마다 하나씩 말씀해주세요</p>
          </div>
        </div>
        {stepValues.some(v => v !== null) && (
          <button
            type="button"
            onClick={resetAll}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {STEP_CONFIG.map((step, i) => {
          const isDone = stepValues[i] !== null;
          const isCurrent = i === currentStep;
          const isPending = !isDone && !isCurrent;

          return (
            <div key={i}>
              {/* Step row */}
              <button
                type="button"
                onClick={() => isDone ? goToStep(i) : undefined}
                disabled={isPending || isCurrent}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                  isCurrent
                    ? 'bg-white shadow-sm border border-blue-200'
                    : isDone
                    ? 'hover:bg-white/60 cursor-pointer'
                    : 'opacity-40 cursor-default'
                }`}
              >
                {/* Indicator */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDone ? <CheckIcon /> : i + 1}
                </div>

                {/* Label */}
                <span
                  className={`font-semibold text-sm flex-1 ${
                    isCurrent ? 'text-blue-700' : isDone ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {i + 1}단계 · {step.label}
                </span>

                {/* Recognized value */}
                {isDone && (
                  <span className="text-emerald-600 font-semibold text-sm">{stepValues[i]}</span>
                )}
                {isDone && (
                  <span className="text-slate-300 text-xs">수정</span>
                )}
              </button>

              {/* Expanded area for current step */}
              {isCurrent && (
                <div className="mx-3 mt-1 mb-2 space-y-3">
                  {/* Hint */}
                  <p className="text-xs text-slate-500 pl-1">
                    {step.hint}
                    {step.example && (
                      <span className="ml-1 text-blue-500 font-medium">예: {step.example}</span>
                    )}
                  </p>

                  {/* Exercise chips (step 0 only) */}
                  {i === 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {prescribedExercises.map(ex => (
                        <span
                          key={ex.id}
                          className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium"
                        >
                          {ex.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Transcript box */}
                  {(phase === 'recording' || (transcript && phase !== 'error')) && phase !== 'success' && (
                    <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700 min-h-[40px] border border-slate-100">
                      {transcript ? (
                        transcript
                      ) : (
                        <span className="text-slate-400 animate-pulse">듣고 있어요...</span>
                      )}
                    </div>
                  )}

                  {/* Success box */}
                  {phase === 'success' && (
                    <div className="bg-emerald-50 rounded-xl p-3 text-sm text-emerald-700 border border-emerald-200 flex items-center gap-2">
                      <span className="text-emerald-500 font-bold text-base">✓</span>
                      <span className="font-medium">{transcript}</span>
                    </div>
                  )}

                  {/* Error box */}
                  {phase === 'error' && (
                    <div className="bg-red-50 rounded-xl p-3 text-sm text-red-700 border border-red-100">
                      {errorMsg}
                    </div>
                  )}

                  {/* Mic / Stop button */}
                  {phase !== 'success' && (
                    phase !== 'recording' ? (
                      <button
                        type="button"
                        onClick={phase === 'error' ? retryStep : startRecording}
                        className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-all shadow-sm shadow-blue-200 flex items-center justify-center gap-2"
                      >
                        <MicIcon className="text-white" size={16} />
                        {phase === 'error' ? '다시 말하기' : '말하기 시작'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <span className="w-3 h-3 bg-white rounded-sm" />
                        <span className="animate-pulse">녹음 중 — 완료하려면 누르세요</span>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Sub-components ---

function ConfirmRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span className={`text-sm font-bold ${valueClass ?? 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
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
