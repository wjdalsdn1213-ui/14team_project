'use client';

import { useApp } from '@/lib/context/AppContext';
import { MOCK_EXERCISES } from '@/lib/mock-data/exercises';
import { getPatientStats, getPainBgColor, getDifficultyLabel } from '@/lib/utils/stats';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import DonutChart from '@/components/charts/DonutChart';
import PainTrendChart from '@/components/charts/PainTrendChart';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import VoiceExerciseLogger from '@/components/patient/VoiceExerciseLogger';
import { APP_TODAY } from '@/lib/constants/date';

export default function PatientDashboard() {
  const { currentUser, getPatientLogs, getPatientPrescription } = useApp();
  if (!currentUser) return null;

  const logs = getPatientLogs(currentUser.id);
  const prescription = getPatientPrescription(currentUser.id);
  const stats = getPatientStats(logs, prescription);

  const todayStr = APP_TODAY;
  const todayLogs = logs.filter(l => l.date === todayStr);
  const todayExercises = prescription?.exercises ?? [];
  const completedIds = new Set(todayLogs.map(l => l.exerciseId));
  const allDone = todayExercises.length > 0 && completedIds.size >= todayExercises.length;

  const painColor =
    stats.avgPainScore <= 3 ? 'text-emerald-600'
    : stats.avgPainScore <= 6 ? 'text-amber-600'
    : 'text-red-600';

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <p className="text-sm font-medium text-slate-400 mb-1">2026년 5월 7일 · 목요일</p>
        <h1 className="text-3xl font-bold text-slate-900">
          안녕하세요, <span className="text-blue-600">{currentUser.name}</span>님
        </h1>
        <p className="text-slate-500 mt-1">오늘도 재활 운동 화이팅이에요!</p>
      </div>

      {/* 전체 완료 축하 배너 */}
      {allDone && (
        <div className="mb-6 flex items-center gap-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl px-6 py-4 text-white card-shadow">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
            🎉
          </div>
          <div>
            <p className="font-bold text-base">오늘 운동 완료!</p>
            <p className="text-emerald-100 text-sm mt-0.5">모든 운동을 마쳤어요. 정말 수고하셨습니다!</p>
          </div>
        </div>
      )}

      {/* 통계 3개 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-5 col-span-1 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 self-start">이번 주 수행률</p>
          <DonutChart value={stats.completionRate} size={110} strokeWidth={13} />
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">평균 통증 (7일)</p>
          <div className="flex items-end gap-1">
            <span className={`text-3xl font-bold ${painColor}`}>{stats.avgPainScore}</span>
            <span className="text-sm text-slate-400 mb-1">/10</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {stats.avgPainScore <= 3 ? '양호한 상태' : stats.avgPainScore <= 6 ? '관리 필요' : '주의 필요'}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">연속 운동일</p>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-violet-600">{stats.streak}</span>
            <span className="text-sm text-slate-400 mb-1">일</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats.streak > 0 ? `${stats.streak}일 연속 중` : '오늘 시작해봐요'}</p>
        </Card>
      </div>

      <VoiceExerciseLogger patientId={currentUser.id} />

      {/* 오늘의 운동 */}
      <Card className="mb-6">
        <div className="px-6 pt-6 pb-4 border-b border-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">오늘의 운동</h2>
              <p className="text-xs text-slate-400 mt-0.5">{completedIds.size}/{todayExercises.length}개 완료</p>
            </div>
            {allDone && <Badge variant="success" dot>완료</Badge>}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${allDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: todayExercises.length > 0 ? `${(completedIds.size / todayExercises.length) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500 min-w-[36px] text-right">
              {todayExercises.length > 0 ? `${Math.round((completedIds.size / todayExercises.length) * 100)}%` : '—'}
            </span>
          </div>
        </div>

        <div className="px-6 py-4">
          {todayExercises.length === 0 ? (
            <EmptyState
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
              title="오늘 처방된 운동이 없습니다"
              description="치료사에게 문의해 운동 처방을 받으세요."
            />
          ) : (
            <div className="space-y-2.5">
              {todayExercises.map(pe => {
                const ex = MOCK_EXERCISES.find(e => e.id === pe.exerciseId);
                const done = completedIds.has(pe.exerciseId);
                const log = todayLogs.find(l => l.exerciseId === pe.exerciseId);
                return (
                  <div key={pe.exerciseId}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all ${done ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-transparent'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${done ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-200'}`}>
                        {done ? '✓' : ''}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${done ? 'text-emerald-800' : 'text-slate-800'}`}>{ex?.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{pe.targetSets}세트 × {pe.targetReps}회</p>
                      </div>
                    </div>
                    {log && (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${getPainBgColor(log.painScore)}`}>통증 {log.painScore}</span>
                        <Badge variant="neutral">{getDifficultyLabel(log.difficulty)}</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <Link href="/patient/exercises"
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
            + 운동 기록 추가
          </Link>
        </div>
      </Card>

      {/* 통증 추이 */}
      <Card className="px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-slate-900">통증 추이</h2>
            <p className="text-xs text-slate-400 mt-0.5">최근 2주</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-rose-400">
            <span className="w-6 border-t-2 border-dashed border-rose-300" />
            <span>주의선 (7점)</span>
          </div>
        </div>
        <PainTrendChart logs={logs} daysBack={14} />
      </Card>
    </div>
  );
}
