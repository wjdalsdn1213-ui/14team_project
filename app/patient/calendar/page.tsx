'use client';

import { useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { ExerciseLog } from '@/lib/types';
import { MOCK_EXERCISES } from '@/lib/mock-data/exercises';
import { getPainBgColor, getDifficultyLabel, formatDate } from '@/lib/utils/stats';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import CalendarView from '@/components/shared/CalendarView';
import EmptyState from '@/components/ui/EmptyState';

export default function PatientCalendarPage() {
  const { currentUser, getPatientLogs } = useApp();
  const [popupDate, setPopupDate] = useState<string | null>(null);
  const [popupLogs, setPopupLogs] = useState<ExerciseLog[]>([]);

  if (!currentUser) return null;

  const logs = getPatientLogs(currentUser.id);
  const completedDays = new Set(logs.map(l => l.date)).size;

  const handleSelectDate = (date: string, dayLogs: ExerciseLog[]) => {
    setPopupDate(date);
    setPopupLogs(dayLogs);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">운동 캘린더</h1>
        <p className="text-slate-500 mt-1">날짜를 클릭하면 해당 날의 기록을 볼 수 있어요</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">운동한 날</p>
          <p className="text-4xl font-bold text-blue-600">{completedDays}<span className="text-base font-normal text-slate-400 ml-1">일</span></p>
          <p className="text-xs text-slate-400 mt-1">최근 30일 기준</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">총 기록</p>
          <p className="text-4xl font-bold text-violet-600">{logs.length}<span className="text-base font-normal text-slate-400 ml-1">건</span></p>
          <p className="text-xs text-slate-400 mt-1">운동 기록 누적</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-5 mb-5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />낮은 통증 (0–3)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />중간 (4–6)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />높은 통증 (7–10)</span>
        </div>
        {/* 팝업 전용 모드: 인라인 상세 숨김 */}
        <CalendarView logs={logs} onSelectDate={handleSelectDate} hideDetail />
      </Card>

      {/* 날짜 기록 팝업 */}
      <Modal
        isOpen={!!popupDate}
        onClose={() => setPopupDate(null)}
        title={popupDate ? formatDate(popupDate) : ''}
        size="sm"
      >
        {popupLogs.length === 0 ? (
          <EmptyState
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
            title="이 날은 기록이 없어요"
            description="운동 기록 입력 페이지에서 추가하세요."
          />
        ) : (
          <div className="space-y-3">
            {popupLogs.map(log => {
              const ex = MOCK_EXERCISES.find(e => e.id === log.exerciseId);
              return (
                <div key={log.id} className="bg-slate-50 rounded-2xl px-4 py-3.5">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-bold text-slate-800">{ex?.name}</p>
                    <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${getPainBgColor(log.painScore)}`}>통증 {log.painScore}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{log.actualSets}세트 × {log.actualReps}회</span>
                    <span className="text-slate-300">·</span>
                    <span>{getDifficultyLabel(log.difficulty)}</span>
                  </div>
                  {log.memo && <p className="text-xs text-slate-400 mt-2 italic">&quot;{log.memo}&quot;</p>}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
