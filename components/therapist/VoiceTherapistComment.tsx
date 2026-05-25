'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context/AppContext';
import { useToast } from '@/lib/context/ToastContext';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import { matchPatient } from '@/lib/voice/matchPatient';
import { isSaveCommand, normalizeSpeech } from '@/lib/voice/parseVoiceInput';
import { User } from '@/lib/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type Step = 'patient' | 'comment' | 'done';

interface VoiceTherapistCommentProps {
  therapistId: string;
  patients: User[];
  /** 환자 상세 페이지 등 이미 선택된 경우 */
  preselectedPatientId?: string;
}

export default function VoiceTherapistComment({
  patients,
  preselectedPatientId,
}: VoiceTherapistCommentProps) {
  const { addComment, currentUser } = useApp();
  const { showToast } = useToast();
  const router = useRouter();
  const speech = useSpeechRecognition('ko-KR');

  const initialPatientId = preselectedPatientId ?? '';
  const [step, setStep] = useState<Step>(initialPatientId ? 'comment' : 'patient');
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(
    () => new Set(initialPatientId ? (['patient'] as Step[]) : []),
  );
  const [lastParsed, setLastParsed] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const saveComment = useCallback(
    async (content: string) => {
      if (!content.trim() || !selectedPatientId || !currentUser) return false;
      setSaving(true);
      try {
        await addComment({
          id: `cmt-${Date.now()}`,
          patientId: selectedPatientId,
          therapistId: currentUser.id,
          content: content.trim(),
          createdAt: new Date().toISOString(),
        });
        setStep('done');
        setCompletedSteps(prev => {
          const nextSteps = new Set(prev);
          nextSteps.add('comment');
          return nextSteps;
        });
        showToast(`${selectedPatient?.name ?? '환자'}님 코멘트가 저장됐습니다!`);
        return true;
      } finally {
        setSaving(false);
      }
    },
    [selectedPatientId, selectedPatient?.name, currentUser, addComment, showToast],
  );

  const applyPatientVoice = useCallback(
    (raw: string) => {
      const text = normalizeSpeech(raw);
      setLastParsed(text);
      const id = matchPatient(text, patients.map(p => ({ id: p.id, name: p.name })));
      if (id) {
        setSelectedPatientId(id);
        setCompletedSteps(prev => {
          const nextSteps = new Set(prev);
          nextSteps.add('patient');
          return nextSteps;
        });
        setStep('comment');
        const name = patients.find(p => p.id === id)?.name;
        showToast(`${name} 환자 선택 ✓`);
      } else {
        showToast('환자 이름을 인식하지 못했습니다. 다시 말하거나 목록에서 선택해 주세요.');
      }
    },
    [patients, showToast],
  );

  const applyCommentVoice = useCallback(
    async (raw: string) => {
      const text = normalizeSpeech(raw);
      setLastParsed(text);
      if (!text) return;

      if (isSaveCommand(text) && text.length < 12) {
        showToast('코멘트 내용을 말한 뒤 저장해 주세요.');
        return;
      }

      const content = text.replace(/^(코멘트|메모)\s*/, '').trim() || text;
      await saveComment(content);
    },
    [saveComment, showToast],
  );

  const handleMic = () => {
    if (step === 'patient') {
      speech.startOnce(applyPatientVoice);
    } else if (step === 'comment') {
      speech.startContinuous(applyCommentVoice);
    }
  };

  const handleManualPatient = (id: string) => {
    setSelectedPatientId(id);
    setCompletedSteps(prev => {
      const nextSteps = new Set(prev);
      nextSteps.add('patient');
      return nextSteps;
    });
    setStep('comment');
  };

  const resetFlow = () => {
    if (preselectedPatientId) {
      setStep('comment');
      setCompletedSteps(new Set<Step>(['patient']));
      setSelectedPatientId(preselectedPatientId);
    } else {
      setStep('patient');
      setCompletedSteps(new Set());
      setSelectedPatientId('');
    }
    setLastParsed(null);
  };

  if (patients.length === 0) return null;

  const patientDone = completedSteps.has('patient');
  const commentDone = completedSteps.has('comment');

  return (
    <Card className="mb-6 overflow-hidden border border-blue-100">
      <div className="px-6 pt-6 pb-4 border-b border-slate-50 bg-gradient-to-r from-blue-50 to-slate-50">
        <h2 className="font-bold text-slate-900 text-lg">음성으로 코멘트 남기기</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {preselectedPatientId
            ? '코멘트를 말하면 자동으로 저장됩니다'
            : '환자 이름 → 코멘트 순으로 말하면 자동 저장됩니다'}
        </p>
      </div>

      {/* 단계 표시 */}
      {!preselectedPatientId && (
        <div className="px-6 py-3 flex gap-6 border-b border-slate-50">
          <StepChip label="환자" done={patientDone} active={step === 'patient'} />
          <StepChip label="코멘트" done={commentDone} active={step === 'comment'} />
          <StepChip label="완료" done={step === 'done'} active={step === 'done'} />
        </div>
      )}

      {step === 'done' ? (
        <div className="px-6 py-8 text-center">
          <p className="text-3xl mb-2">✓</p>
          <p className="font-bold text-slate-900">코멘트가 저장되었습니다</p>
          <p className="text-sm text-slate-500 mt-1">{selectedPatient?.name} 환자</p>
          <div className="mt-6 flex gap-2 justify-center">
            <Button variant="secondary" size="sm" onClick={resetFlow}>
              또 작성하기
            </Button>
            {selectedPatientId && (
              <Button
                size="sm"
                onClick={() => router.push(`/therapist/patients/${selectedPatientId}?tab=comments`)}
              >
                코멘트 보기
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="px-6 py-4 bg-blue-50/60 border-b border-slate-100">
            {step === 'patient' && (
              <p className="text-sm text-slate-700 mb-1">
                환자 이름을 말해 주세요. 예: &quot;이서연&quot;, &quot;박지훈&quot;
              </p>
            )}
            {step === 'comment' && selectedPatient && (
              <p className="text-sm text-slate-700 mb-1">
                <span className="font-semibold text-blue-700">{selectedPatient.name}</span> 환자
                코멘트를 말해 주세요. 끝나면 마이크를 다시 누르면{' '}
                <span className="font-semibold">자동 저장</span>됩니다.
              </p>
            )}

            {speech.supported ? (
              <div className="mt-3 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleMic}
                  disabled={saving}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-lg transition-all ${
                    speech.isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  🎤
                </button>
                <p className="text-xs text-slate-500">
                  {saving
                    ? '저장 중...'
                    : speech.isListening
                      ? step === 'comment'
                        ? '듣는 중… 다 말했으면 마이크를 다시 눌러 저장'
                        : '듣는 중...'
                      : '마이크를 눌러 말하기'}
                </p>
                {speech.transcript && (
                  <p className="text-sm text-slate-600 bg-white/90 px-3 py-2 rounded-xl w-full text-center">
                    {speech.transcript}
                  </p>
                )}
                {speech.error && <p className="text-xs text-red-500">{speech.error}</p>}
              </div>
            ) : (
              <p className="text-xs text-amber-600 mt-2">Chrome에서 마이크 권한을 허용해 주세요.</p>
            )}

            {lastParsed && (
              <p className="text-xs text-slate-500 mt-2 text-center">
                인식: &quot;{lastParsed}&quot;
              </p>
            )}
          </div>

          {step === 'patient' && !preselectedPatientId && (
            <div className="px-6 py-4 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-400 mb-2">또는 직접 선택</p>
              {patients.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleManualPatient(p.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    selectedPatientId === p.id
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-transparent bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                    {p.avatarInitials}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function StepChip({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
          done
            ? 'bg-emerald-500 text-white'
            : active
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-300'
        }`}
      >
        {done ? '✓' : '●'}
      </span>
      <span
        className={`text-xs font-semibold ${
          done ? 'text-emerald-600' : active ? 'text-blue-600' : 'text-slate-300'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
