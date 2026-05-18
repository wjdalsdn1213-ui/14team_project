'use client';

import { useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { useToast } from '@/lib/context/ToastContext';
import { MOCK_EXERCISES, BODY_PART_LABELS } from '@/lib/mock-data/exercises';
import { Prescription, PrescribedExercise } from '@/lib/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';

type ModalStep = 1 | 2;
type PrescMode = 'add' | 'new';

export default function PrescriptionsPage() {
  const { currentUser, prescriptions, addPrescription, addExercisesToPrescription, getPatientPrescription, users } = useApp();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>(1);
  const [patientId, setPatientId] = useState('');
  const [mode, setMode] = useState<PrescMode>('new');
  const [selectedExercises, setSelectedExercises] = useState<PrescribedExercise[]>([]);
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState('2026-05-07');

  if (!currentUser) return null;

  const myPatients = users.filter(u => u.role === 'patient' && u.therapistId === currentUser.id);
  const myPrescriptions = prescriptions.filter(p => p.therapistId === currentUser.id);

  const openModal = () => {
    setStep(1);
    setPatientId('');
    setMode('new');
    setSelectedExercises([]);
    setNotes('');
    setStartDate('2026-05-07');
    setIsOpen(true);
  };

  const handleSelectPatient = (pid: string) => {
    setPatientId(pid);
    const existing = getPatientPrescription(pid);
    setMode(existing ? 'add' : 'new');
    setSelectedExercises([]);
    setStep(2);
  };

  const toggleExercise = (exId: string) => {
    setSelectedExercises(prev => {
      const exists = prev.find(e => e.exerciseId === exId);
      if (exists) return prev.filter(e => e.exerciseId !== exId);
      const ex = MOCK_EXERCISES.find(e => e.id === exId)!;
      return [...prev, { exerciseId: exId, targetReps: ex.defaultReps, targetSets: ex.defaultSets }];
    });
  };

  const updateExercise = (exId: string, field: 'targetReps' | 'targetSets', val: number) => {
    setSelectedExercises(prev => prev.map(e => e.exerciseId === exId ? { ...e, [field]: val } : e));
  };

  const handleSave = async () => {
    if (!patientId || selectedExercises.length === 0) return;

    if (mode === 'add') {
      const existing = getPatientPrescription(patientId);
      if (existing) {
        await addExercisesToPrescription(existing.id, selectedExercises);
        showToast(`${selectedExercises.length}개 운동이 기존 처방에 추가됐습니다!`);
      }
    } else {
      const presc: Prescription = {
        id: `presc-${Date.now()}`,
        patientId,
        therapistId: currentUser.id,
        exercises: selectedExercises,
        startDate,
        notes: notes || undefined,
      };
      await addPrescription(presc);
      showToast('새 처방이 저장됐습니다!');
    }
    setIsOpen(false);
  };

  const getPatient = (id: string) => users.find(u => u.id === id);
  const selectedPatient = getPatient(patientId);
  const existingPresc = patientId ? getPatientPrescription(patientId) : undefined;

  const existingExIds = new Set(existingPresc?.exercises.map(e => e.exerciseId) ?? []);
  const availableForAdd = mode === 'add'
    ? MOCK_EXERCISES.filter(e => !existingExIds.has(e.id))
    : MOCK_EXERCISES;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">처방 관리</h1>
          <p className="text-slate-500 mt-1">환자별 운동 처방을 조회하고 추가합니다</p>
        </div>
        <Button onClick={openModal}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          새 처방
        </Button>
      </div>

      {/* 처방 목록 */}
      <div className="space-y-4">
        {myPrescriptions.length === 0 ? (
          <Card className="py-12 flex flex-col items-center gap-2">
            <p className="text-slate-400 text-sm">아직 처방된 운동이 없습니다.</p>
            <p className="text-slate-300 text-xs">위 버튼으로 첫 처방을 추가해보세요.</p>
          </Card>
        ) : myPrescriptions.map(presc => {
          const patient = getPatient(presc.patientId);
          return (
            <Card key={presc.id} className="overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 text-sm font-bold">
                      {patient?.avatarInitials}
                    </div>
                    <div>
                      <Link
                        href={`/therapist/patients/${presc.patientId}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
                      >
                        {patient?.name}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {presc.startDate}{presc.endDate ? ` ~ ${presc.endDate}` : ' ~ 진행 중'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="neutral">{presc.exercises.length}개 운동</Badge>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="divide-y divide-slate-50">
                  {presc.exercises.map(pe => {
                    const ex = MOCK_EXERCISES.find(e => e.id === pe.exerciseId);
                    return (
                      <div key={pe.exerciseId} className="flex items-center justify-between py-3">
                        <div>
                          <span className="text-sm font-semibold text-slate-800">{ex?.name}</span>
                          <span className="text-xs text-slate-400 ml-2">{BODY_PART_LABELS[ex?.bodyPart ?? '']}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg tabular-nums">
                          {pe.targetSets}세트 × {pe.targetReps}회
                        </span>
                      </div>
                    );
                  })}
                </div>

                {presc.notes && (
                  <div className="mt-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-xs font-semibold text-slate-500 mb-1">치료사 메모</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{presc.notes}</p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* 처방 모달 */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={step === 1 ? '환자 선택' : `처방 추가 — ${selectedPatient?.name}`}
        size="lg"
      >
        {step === 1 ? (
          /* ── Step 1: 환자 선택 ── */
          <div className="space-y-2">
            <p className="text-sm text-slate-500 mb-4">처방을 추가할 환자를 선택하세요.</p>
            {myPatients.map(p => {
              const existing = getPatientPrescription(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-transparent bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold flex-shrink-0">
                      {p.avatarInitials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {existing ? `처방 중 (${existing.exercises.length}개 운동)` : '처방 없음'}
                      </p>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              );
            })}
          </div>
        ) : (
          /* ── Step 2: 운동 추가 ── */
          <div className="space-y-5">
            {/* 뒤로 가기 */}
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              환자 다시 선택
            </button>

            {/* 기존 처방 여부에 따른 모드 선택 */}
            {existingPresc ? (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">처방 방식</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { val: 'add' as PrescMode, label: '기존 처방에 추가', desc: `현재 ${existingPresc.exercises.length}개 운동에 추가` },
                    { val: 'new' as PrescMode, label: '새 처방 만들기', desc: '기존 처방과 별도로 새로 생성' },
                  ] as const).map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => { setMode(opt.val); setSelectedExercises([]); }}
                      className={`px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        mode === opt.val
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-100 hover:border-slate-200 bg-slate-50'
                      }`}
                    >
                      <p className={`text-sm font-bold ${mode === opt.val ? 'text-blue-700' : 'text-slate-700'}`}>{opt.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-700 font-semibold">처방 없음</p>
                <p className="text-xs text-amber-600 mt-0.5">이 환자에게 첫 처방을 생성합니다.</p>
              </div>
            )}

            {/* 운동 선택 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                운동 선택{' '}
                <span className="text-blue-500 normal-case font-medium">({selectedExercises.length}개 선택)</span>
                {mode === 'add' && availableForAdd.length < MOCK_EXERCISES.length && (
                  <span className="text-slate-400 normal-case font-normal ml-1">— 이미 처방된 운동 제외</span>
                )}
              </label>
              {availableForAdd.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400 border border-slate-100 rounded-xl">
                  추가 가능한 운동이 없습니다. 모든 운동이 이미 처방되어 있습니다.
                </div>
              ) : (
                <div className="space-y-1 max-h-52 overflow-y-auto rounded-xl border border-slate-100 p-2">
                  {availableForAdd.map(ex => {
                    const selected = selectedExercises.find(e => e.exerciseId === ex.id);
                    return (
                      <div
                        key={ex.id}
                        className={`rounded-xl border transition-colors ${selected ? 'border-blue-200 bg-blue-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}
                      >
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => toggleExercise(ex.id)}
                            className="w-4 h-4 accent-blue-600 rounded flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-slate-800">{ex.name}</span>
                            <span className="text-xs text-slate-400 ml-2">{BODY_PART_LABELS[ex.bodyPart]}</span>
                          </div>
                        </div>
                        {selected && (
                          <div className="flex gap-4 px-4 pb-3">
                            {(['targetSets', 'targetReps'] as const).map(field => (
                              <label key={field} className="flex items-center gap-2 text-xs text-slate-600">
                                <span className="font-semibold">{field === 'targetSets' ? '세트' : '횟수'}</span>
                                <input
                                  type="number"
                                  min={field === 'targetSets' ? 1 : 1}
                                  max={field === 'targetSets' ? 10 : 100}
                                  value={selected[field]}
                                  onChange={e => updateExercise(ex.id, field, Number(e.target.value))}
                                  className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white tabular-nums"
                                />
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 새 처방 옵션: 시작일 + 메모 */}
            {mode === 'new' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">메모 (선택)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder="주의사항, 강도 조절 가이드 등을 입력하세요"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>취소</Button>
              <Button
                onClick={handleSave}
                disabled={selectedExercises.length === 0}
              >
                {mode === 'add' ? '기존 처방에 추가' : '새 처방 저장'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
