'use client';

import { useApp } from '@/lib/context/AppContext';
import { MOCK_EXERCISES } from '@/lib/mock-data/exercises';
import { getPainBgColor, getDifficultyLabel, formatDate } from '@/lib/utils/stats';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';

export default function PatientLogsPage() {
  const { currentUser, getPatientLogs } = useApp();
  if (!currentUser) return null;

  const logs = getPatientLogs(currentUser.id);
  const sorted = [...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/patient/exercises"
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors flex-shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">수행기록</h1>
          <p className="text-slate-500 mt-1">총 {sorted.length}건의 기록</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            }
            title="아직 운동 기록이 없어요"
            description="운동 기록 입력 페이지에서 첫 기록을 추가해보세요."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map(log => {
            const ex = MOCK_EXERCISES.find(e => e.id === log.exerciseId);
            return (
              <Card key={log.id} className="px-5 py-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{ex?.name ?? log.exerciseId}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(log.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${getPainBgColor(log.painScore)}`}>
                      통증 {log.painScore}
                    </span>
                    <Badge variant="neutral">{getDifficultyLabel(log.difficulty)}</Badge>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {log.actualSets}세트 × {log.actualReps}회
                </p>
                {log.memo && (
                  <p className="text-xs text-slate-400 mt-2 italic">&quot;{log.memo}&quot;</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
