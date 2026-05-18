'use client';

import { useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { useToast } from '@/lib/context/ToastContext';
import { MOCK_EXERCISES, BODY_PART_LABELS } from '@/lib/mock-data/exercises';
import { Difficulty, ExerciseLog } from '@/lib/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; active: string }[] = [
  { value: 'easy',   label: '쉬움',   active: 'bg-emerald-500 text-white border-emerald-500' },
  { value: 'medium', label: '보통',   active: 'bg-amber-500 text-white border-amber-500' },
  { value: 'hard',   label: '어려움', active: 'bg-red-500 text-white border-red-500' },
];

export default function ExercisesPage() {
  const { currentUser, addLog, getPatientPrescription } = useApp();
  const { showToast } = useToast();

  const [selectedExId, setSelectedExId] = useState('');
  const [reps, setReps] = useState(10);
  const [sets, setSets] = useState(3);
  const [painScore, setPainScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);

  if (!currentUser) return null;

  const prescription = getPatientPrescription(currentUser.id);
  const prescribedExercises = prescription?.exercises ?? [];

  // 처방받은 운동만 표시
  const availableExercises = prescribedExercises
    .map(pe => {
      const ex = MOCK_EXERCISES.find(e => e.id === pe.exerciseId);
      return ex ? { ...ex, prescribed: pe } : null;
    })
    .filter(Boolean) as (typeof MOCK_EXERCISES[0] & { prescribed: typeof prescribedExercises[0] })[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExId) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    const log: ExerciseLog = {
      id: `log-${Date.now()}`,
      patientId: currentUser.id,
      exerciseId: selectedExId,
      date: '2026-05-07',
      actualReps: reps,
      actualSets: sets,
      painScore,
      difficulty,
      memo: memo || undefined,
    };
    await addLog(log);
    setLoading(false);
    showToast('운동 기록이 저장됐습니다!');
    setSelectedExId('');
    setReps(10);
    setSets(3);
    setPainScore(0);
    setDifficulty('medium');
    setMemo('');
  };

  const selectedEx = availableExercises.find(e => e.id === selectedExId);
  const painLabel =
    painScore === 0 ? '통증 없음'
    : painScore <= 3 ? '가벼운 통증'
    : painScore <= 6 ? '중간 통증'
    : '심한 통증';
  const painColor =
    painScore === 0 ? 'text-slate-400'
    : painScore <= 3 ? 'text-emerald-600'
    : painScore <= 6 ? 'text-amber-600'
    : 'text-red-600';
  const sliderColor =
    painScore <= 3 ? 'accent-emerald-500'
    : painScore <= 6 ? 'accent-amber-500'
    : 'accent-red-500';

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">운동 기록</h1>
        <p className="text-slate-500 mt-1">오늘 수행한 운동을 기록하세요</p>
      </div>

      {/* 처방 없음 */}
      {availableExercises.length === 0 ? (
        <Card className="py-4">
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>
              </svg>
            }
            title="처방된 운동이 없습니다"
            description="담당 치료사에게 문의하여 운동 처방을 받으세요."
          />
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 운동 선택 */}
          <Card className="overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50">
              <h2 className="font-bold text-slate-900">운동 선택</h2>
              <p className="text-xs text-slate-400 mt-0.5">처방받은 운동 {availableExercises.length}개</p>
            </div>
            <div className="px-4 py-4 space-y-2">
              {availableExercises.map(ex => {
                const isSelected = selectedExId === ex.id;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setSelectedExId(ex.id);
                      setReps(ex.prescribed.targetReps);
                      setSets(ex.prescribed.targetSets);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50 shadow-sm shadow-blue-100'
                        : 'border-transparent bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{ex.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-600 font-semibold px-1.5 py-0.5 rounded-md">처방</span>
                      </div>
                      <span className="text-xs text-slate-400">{BODY_PART_LABELS[ex.bodyPart]}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {ex.prescribed.targetSets}×{ex.prescribed.targetReps}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedEx && (
              <div className="mx-4 mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 leading-relaxed">{selectedEx.description}</p>
                <p className="text-xs font-bold text-blue-800 mt-1.5">
                  목표: {selectedEx.prescribed.targetSets}세트 × {selectedEx.prescribed.targetReps}회
                </p>
              </div>
            )}
          </Card>

          {/* 수행 횟수 */}
          <Card className="px-6 py-5">
            <h2 className="font-bold text-slate-900 mb-5">수행 횟수</h2>
            <div className="grid grid-cols-2 gap-8">
              {[
                { label: '세트', val: sets, setVal: setSets, min: 1, max: 10 },
                { label: '횟수', val: reps, setVal: setReps, min: 1, max: 100 },
              ].map(({ label, val, setVal, min, max }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">{label}</p>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => setVal(v => Math.max(min, v - 1))}
                      className="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 font-bold text-lg transition-all">−</button>
                    <span className="text-3xl font-bold text-slate-900 w-10 text-center tabular-nums">{val}</span>
                    <button type="button" onClick={() => setVal(v => Math.min(max, v + 1))}
                      className="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 font-bold text-lg transition-all">+</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 통증 점수 */}
          <Card className="px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900">통증 점수</h2>
              <div className="text-right">
                <span className={`text-3xl font-bold ${painColor}`}>{painScore}</span>
                <p className={`text-xs font-medium ${painColor} mt-0.5`}>{painLabel}</p>
              </div>
            </div>
            <input type="range" min={0} max={10} value={painScore}
              onChange={e => setPainScore(Number(e.target.value))}
              className={`w-full h-2 mt-4 mb-3 rounded-full appearance-none cursor-pointer ${sliderColor}`} />
            <div className="flex gap-1 mt-1">
              {Array.from({ length: 11 }).map((_, i) => {
                const c = i === 0 ? 'bg-slate-200' : i <= 3 ? 'bg-emerald-400' : i <= 6 ? 'bg-amber-400' : 'bg-red-400';
                return (
                  <button key={i} type="button" onClick={() => setPainScore(i)}
                    className={`flex-1 h-7 rounded-lg text-xs font-bold transition-all ${
                      i === painScore ? `${c} text-white scale-110 shadow-sm` : `${c} opacity-25 hover:opacity-50`
                    }`}>{i}</button>
                );
              })}
            </div>
          </Card>

          {/* 난이도 */}
          <Card className="px-6 py-5">
            <h2 className="font-bold text-slate-900 mb-4">난이도</h2>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTY_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setDifficulty(opt.value)}
                  className={`py-3.5 rounded-2xl border-2 text-sm font-bold transition-all ${
                    difficulty === opt.value ? opt.active : 'border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                  }`}>{opt.label}</button>
              ))}
            </div>
          </Card>

          {/* 메모 */}
          <Card className="px-6 py-5">
            <h2 className="font-bold text-slate-900 mb-3">메모 <span className="text-slate-300 font-normal text-sm">선택사항</span></h2>
            <textarea value={memo} onChange={e => setMemo(e.target.value)}
              placeholder="오늘 운동하면서 느낀 점을 남겨보세요..." rows={3}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
          </Card>

          <div className="flex gap-3">
            <Button type="submit" size="lg" className="flex-1" disabled={!selectedExId || loading}>
              {loading ? <Spinner /> : null}
              {loading ? '저장 중...' : '기록 저장하기'}
            </Button>
            <Link href="/patient/logs" className="flex-1">
              <Button variant="secondary" size="lg" className="w-full">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                수행기록 보기
              </Button>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
