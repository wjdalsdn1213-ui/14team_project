'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/lib/context/ToastContext';
import { useExerciseLogForm } from '@/lib/hooks/useExerciseLogForm';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import {
  isSkipCommand,
  matchExercise,
  normalizeSpeech,
  parseDifficulty,
  parseMemo,
  parsePainScore,
  parseSetsAndReps,
} from '@/lib/voice/parseVoiceInput';
import { Difficulty } from '@/lib/types';
import { getDifficultyLabel, getPainBgColor } from '@/lib/utils/stats';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';

type Step = 'exercise' | 'reps' | 'pain' | 'difficulty' | 'memo' | 'save';

const VOICE_STEPS: { id: Step; label: string; hint: string; optional?: boolean }[] = [
  { id: 'exercise', label: '운동', hint: '운동 이름을 말해 주세요. 예: "외회전" 또는 "어깨 외회전"' },
  { id: 'reps', label: '횟수', hint: '세트와 횟수를 말해 주세요. 예: "3세트 15회"' },
  { id: 'pain', label: '통증', hint: '통증 점수를 말해 주세요. 예: "통증 3점"' },
  { id: 'difficulty', label: '난이도', hint: '쉬움, 보통, 어려움 중 하나를 말해 주세요' },
  { id: 'memo', label: '메모', hint: '메모가 있으면 말하고, 없으면 "건너뛰기"', optional: true },
  { id: 'save', label: '저장', hint: '내용을 확인하고 저장하세요' },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; active: string }[] = [
  { value: 'easy', label: '쉬움', active: 'bg-emerald-500 text-white border-emerald-500' },
  { value: 'medium', label: '보통', active: 'bg-amber-500 text-white border-amber-500' },
  { value: 'hard', label: '어려움', active: 'bg-red-500 text-white border-red-500' },
];

interface VoiceExerciseLoggerProps {
  patientId: string;
}

export default function VoiceExerciseLogger({ patientId }: VoiceExerciseLoggerProps) {
  const { showToast } = useToast();
  const form = useExerciseLogForm(patientId);
  const speech = useSpeechRecognition('ko-KR');
  const [step, setStep] = useState<Step>('exercise');
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());
  const [lastParsed, setLastParsed] = useState<string | null>(null);

  const stepIndex = VOICE_STEPS.findIndex(s => s.id === step);
  const currentStep = VOICE_STEPS[stepIndex];
  const voiceSteps = VOICE_STEPS.filter(s => s.id !== 'save');

  const markCompleteAndAdvance = useCallback((from: Step) => {
    setCompletedSteps(prev => {
      const nextSteps = new Set(prev);
      nextSteps.add(from);
      return nextSteps;
    });
    const idx = VOICE_STEPS.findIndex(s => s.id === from);
    const next = VOICE_STEPS[idx + 1];
    if (next) setStep(next.id);
  }, []);

  const tryParseStep = useCallback(
    (raw: string, targetStep: Step): boolean => {
      const text = normalizeSpeech(raw);
      const exercises = form.availableExercises.map(e => ({ id: e.id, name: e.name }));

      switch (targetStep) {
        case 'exercise': {
          const id = matchExercise(text, exercises);
          if (!id) return false;
          form.selectExercise(id);
          return true;
        }
        case 'reps': {
          const { sets, reps } = parseSetsAndReps(text);
          if (sets === undefined && reps === undefined) return false;
          if (sets !== undefined) form.setSets(Math.min(10, Math.max(1, sets)));
          if (reps !== undefined) form.setReps(Math.min(100, Math.max(1, reps)));
          return true;
        }
        case 'pain': {
          const pain = parsePainScore(text);
          if (pain === null) return false;
          form.setPainScore(pain);
          return true;
        }
        case 'difficulty': {
          const diff = parseDifficulty(text);
          if (!diff) return false;
          form.setDifficulty(diff);
          return true;
        }
        case 'memo': {
          if (isSkipCommand(text)) return true;
          const parsedMemo = parseMemo(text);
          if (parsedMemo) form.setMemo(parsedMemo);
          else if (text.length > 0) form.setMemo(text);
          else return false;
          return true;
        }
        default:
          return false;
      }
    },
    [form],
  );

  const applyStepVoice = useCallback(
    (raw: string) => {
      if (!raw.trim() || step === 'save') return;
      setLastParsed(raw);

      if (tryParseStep(raw, step)) {
        markCompleteAndAdvance(step);
        const label = currentStep.label;
        showToast(`${label} 단계 완료 ✓`);
      } else {
        showToast('인식하지 못했습니다. 다시 말하거나 화면에서 입력해 주세요.');
      }
    },
    [step, tryParseStep, markCompleteAndAdvance, currentStep.label, showToast],
  );

  const handleMic = () => {
    if (step === 'save') return;
    speech.startOnce(applyStepVoice);
  };

  const handleSave = async () => {
    if (!form.isComplete) {
      showToast('운동을 선택하고 횟수·통증·난이도를 확인해 주세요.');
      return;
    }
    const ok = await form.submitLog();
    if (ok) {
      showToast('운동 기록이 저장됐습니다!');
      setStep('exercise');
      setCompletedSteps(new Set());
      setLastParsed(null);
    }
  };

  const painLabel =
    form.painScore === 0 ? '통증 없음'
    : form.painScore <= 3 ? '가벼운 통증'
    : form.painScore <= 6 ? '중간 통증'
    : '심한 통증';

  if (form.availableExercises.length === 0) {
    return (
      <Card className="mb-6">
        <EmptyState
          icon={<span className="text-2xl">🎤</span>}
          title="처방된 운동이 없습니다"
          description="음성 기록을 사용하려면 먼저 운동 처방이 필요합니다."
        />
      </Card>
    );
  }

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-slate-50">
        <h2 className="font-bold text-slate-900 text-lg">음성으로 운동 기록</h2>
        <p className="text-xs text-slate-400 mt-0.5">단계별로 말하면 완료 시 ✓ 표시 후 다음 단계로 넘어갑니다</p>
      </div>

      {/* 단계 진행 + 체크 */}
      <div className="px-6 py-4 border-b border-slate-50">
        <div className="flex gap-1">
          {voiceSteps.map(s => {
            const done = completedSteps.has(s.id);
            const current = step === s.id;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1.5">
                <StepIndicator done={done} current={current} />
                <span
                  className={`text-[10px] font-semibold ${
                    done ? 'text-emerald-600' : current ? 'text-violet-600' : 'text-slate-300'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 음성 안내 (현재 단계) */}
      {step !== 'save' && (
        <div className="px-6 py-4 bg-gradient-to-br from-violet-50 to-blue-50 border-b border-slate-100">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">
            {currentStep.label} 단계
            {completedSteps.has(step) && (
              <span className="ml-2 text-emerald-600">✓ 완료</span>
            )}
          </p>
          <p className="text-sm text-slate-700">{currentStep.hint}</p>

          {speech.supported ? (
            <div className="mt-4 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleMic}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all shadow-lg ${
                  speech.isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-red-200'
                    : 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-200'
                }`}
                aria-label="음성 인식"
              >
                🎤
              </button>
              <p className="text-xs text-slate-500">
                {speech.isListening ? '듣는 중...' : '마이크를 눌러 말하기'}
              </p>
              {speech.transcript && (
                <p className="text-sm text-slate-600 bg-white/80 px-3 py-2 rounded-xl w-full text-center">
                  {speech.transcript}
                </p>
              )}
              {speech.error && <p className="text-xs text-red-500">{speech.error}</p>}
            </div>
          ) : (
            <p className="text-xs text-amber-600 mt-3">Chrome에서 마이크 권한을 허용해 주세요.</p>
          )}

          {lastParsed && (
            <p className="text-xs text-slate-500 mt-2 text-center">
              인식: &quot;{lastParsed}&quot;
            </p>
          )}
        </div>
      )}

      <div className="px-6 py-5 space-y-5">
        {(step === 'exercise' || step === 'save' || completedSteps.has('exercise')) && (
          <section className={step === 'exercise' ? 'ring-2 ring-violet-200 rounded-2xl p-4 -mx-1' : ''}>
            <StepHeading label="운동 선택" done={completedSteps.has('exercise')} active={step === 'exercise'} />
            <div className="space-y-2">
              {form.availableExercises.map(ex => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => form.selectExercise(ex.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                    form.selectedExId === ex.id
                      ? 'border-violet-400 bg-violet-50'
                      : 'border-transparent bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-800">{ex.name}</span>
                  <span className="text-xs text-slate-400">
                    {ex.prescribed.targetSets}×{ex.prescribed.targetReps}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {(step === 'reps' || step === 'save' || completedSteps.has('reps')) && (
          <section className={step === 'reps' ? 'ring-2 ring-violet-200 rounded-2xl p-4 -mx-1' : ''}>
            <StepHeading label="수행 횟수" done={completedSteps.has('reps')} active={step === 'reps'} />
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: '세트', val: form.sets, setVal: form.setSets, min: 1, max: 10 },
                { label: '횟수', val: form.reps, setVal: form.setReps, min: 1, max: 100 },
              ].map(({ label, val, setVal, min, max }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-slate-400 mb-2">{label}</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setVal(v => Math.max(min, v - 1))}
                      className="w-9 h-9 rounded-xl border-2 border-slate-200 text-slate-500 font-bold"
                    >
                      −
                    </button>
                    <span className="text-2xl font-bold text-slate-900 w-8 text-center tabular-nums">{val}</span>
                    <button
                      type="button"
                      onClick={() => setVal(v => Math.min(max, v + 1))}
                      className="w-9 h-9 rounded-xl border-2 border-slate-200 text-slate-500 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {(step === 'pain' || step === 'save' || completedSteps.has('pain')) && (
          <section className={step === 'pain' ? 'ring-2 ring-violet-200 rounded-2xl p-4 -mx-1' : ''}>
            <StepHeading label="통증 점수" done={completedSteps.has('pain')} active={step === 'pain'} />
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-bold px-2 py-1 rounded-lg ${getPainBgColor(form.painScore)}`}>
                {form.painScore} · {painLabel}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={form.painScore}
              onChange={e => form.setPainScore(Number(e.target.value))}
              className="w-full accent-violet-500 mb-2"
            />
            <div className="flex gap-1">
              {Array.from({ length: 11 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => form.setPainScore(i)}
                  className={`flex-1 h-7 rounded-lg text-xs font-bold transition-all ${
                    i === form.painScore
                      ? `${getPainBgColor(i)} scale-105`
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </section>
        )}

        {(step === 'difficulty' || step === 'save' || completedSteps.has('difficulty')) && (
          <section className={step === 'difficulty' ? 'ring-2 ring-violet-200 rounded-2xl p-4 -mx-1' : ''}>
            <StepHeading label="난이도" done={completedSteps.has('difficulty')} active={step === 'difficulty'} />
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => form.setDifficulty(opt.value)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                    form.difficulty === opt.value ? opt.active : 'border-slate-100 text-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {(step === 'memo' || step === 'save' || completedSteps.has('memo')) && (
          <section className={step === 'memo' ? 'ring-2 ring-violet-200 rounded-2xl p-4 -mx-1' : ''}>
            <StepHeading label="메모" done={completedSteps.has('memo')} active={step === 'memo'} optional />
            <textarea
              value={form.memo}
              onChange={e => form.setMemo(e.target.value)}
              placeholder="오늘 운동하면서 느낀 점..."
              rows={2}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </section>
        )}

        {step === 'save' && form.selectedEx && (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-sm space-y-1.5">
            <p className="font-semibold text-emerald-800 mb-2">입력 완료 ✓</p>
            <p><span className="text-slate-500">운동</span> <strong>{form.selectedEx.name}</strong></p>
            <p><span className="text-slate-500">수행</span> {form.sets}세트 × {form.reps}회</p>
            <p><span className="text-slate-500">통증</span> {form.painScore}점</p>
            <p><span className="text-slate-500">난이도</span> {getDifficultyLabel(form.difficulty)}</p>
            {form.memo && <p><span className="text-slate-500">메모</span> {form.memo}</p>}
          </div>
        )}
      </div>

      <div className="px-6 pb-6 flex gap-2">
        {stepIndex > 0 && step !== 'save' && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep(VOICE_STEPS[stepIndex - 1].id)}
          >
            이전
          </Button>
        )}
        {step !== 'save' ? (
          <Button
            type="button"
            className="flex-1"
            onClick={() => markCompleteAndAdvance(step)}
          >
            {completedSteps.has(step) ? '다음 단계' : '건너뛰고 다음'}
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1"
            onClick={handleSave}
            disabled={!form.isComplete || form.loading}
          >
            {form.loading ? <Spinner /> : null}
            {form.loading ? '저장 중...' : '기록 저장하기'}
          </Button>
        )}
      </div>
    </Card>
  );
}

function StepIndicator({ done, current }: { done: boolean; current: boolean }) {
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
        done
          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
          : current
            ? 'bg-violet-600 text-white ring-2 ring-violet-200'
            : 'bg-slate-100 text-slate-300'
      }`}
    >
      {done ? '✓' : current ? '●' : ''}
    </div>
  );
}

function StepHeading({
  label,
  done,
  active,
  optional,
}: {
  label: string;
  done: boolean;
  active: boolean;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className={`text-sm font-bold ${active ? 'text-violet-700' : 'text-slate-900'}`}>
        {label}
        {optional && <span className="text-slate-300 font-normal"> (선택)</span>}
      </h3>
      {done && (
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          ✓ 완료
        </span>
      )}
    </div>
  );
}
