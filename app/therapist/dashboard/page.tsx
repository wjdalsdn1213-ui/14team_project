'use client';

import { useApp } from '@/lib/context/AppContext';
import { getPatientStats } from '@/lib/utils/stats';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import Link from 'next/link';
import VoiceTherapistComment from '@/components/therapist/VoiceTherapistComment';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getTodayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 · ${WEEKDAYS[d.getDay()]}요일`;
}

const ATTENTION_CONFIG = {
  critical: { label: '즉시 확인', labelStyle: 'text-red-500',   border: 'border-l-[3px] border-l-red-400' },
  warning:  { label: '관심 필요', labelStyle: 'text-amber-500', border: 'border-l-[3px] border-l-amber-400' },
  normal:   { label: '양호',      labelStyle: 'text-green-500', border: 'border-l-[3px] border-l-green-400' },
};

export default function TherapistDashboard() {
  const { currentUser, getTherapistPatients, getPatientLogs, getPatientPrescription } = useApp();
  if (!currentUser) return null;

  const patients = getTherapistPatients(currentUser.id);
  const patientData = patients.map(p => {
    const logs = getPatientLogs(p.id);
    const prescription = getPatientPrescription(p.id);
    const stats = getPatientStats(logs, prescription);
    return { patient: p, stats };
  });

  const critical = patientData.filter(d => d.stats.attentionLevel === 'critical');
  const warning  = patientData.filter(d => d.stats.attentionLevel === 'warning');
  const normal   = patientData.filter(d => d.stats.attentionLevel === 'normal');
  const sorted   = [...critical, ...warning, ...normal];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <p className="text-sm font-medium text-slate-400 mb-1">{getTodayLabel()}</p>
        <h1 className="text-3xl font-bold text-slate-900">환자 현황</h1>
        <p className="text-slate-500 mt-1">담당 환자 {patients.length}명의 재활 현황을 확인하세요.</p>
      </div>

      <VoiceTherapistComment therapistId={currentUser.id} patients={patients} />

      {/* 요약 카드 — 모노톤 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: '즉시 확인', count: critical.length, sub: '즉각 조치 필요' },
          { label: '관심 필요', count: warning.length,  sub: '모니터링 강화' },
          { label: '양호',      count: normal.length,   sub: '정상 진행 중' },
        ].map(({ label, count, sub }) => (
          <Card key={label} className="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
            <p className="text-4xl font-bold text-slate-900">{count}</p>
            <p className="text-xs text-slate-400 mt-1">{sub}</p>
          </Card>
        ))}
      </div>

      {/* 환자 목록 */}
      <div className="space-y-2.5">
        {sorted.map(({ patient, stats }) => {
          const cfg = ATTENTION_CONFIG[stats.attentionLevel];

          return (
            <Link key={patient.id} href={`/therapist/patients/${patient.id}`}>
              <Card hover className={`overflow-hidden ${cfg.border}`}>
                <div className="flex items-center gap-5 px-5 py-4">
                  {/* 아바타 */}
                  <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 text-sm font-bold flex-shrink-0">
                    {patient.avatarInitials}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="font-bold text-slate-900">{patient.name}</span>
                      <span className={`text-xs font-semibold ${cfg.labelStyle}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-2.5">
                      <span>
                        통증{' '}
                        <span className="font-bold text-slate-700">{stats.avgPainScore}</span>
                        <span className="text-slate-300">/10</span>
                      </span>
                      <span>
                        수행률{' '}
                        <span className="font-bold text-slate-700">{stats.completionRate}%</span>
                      </span>
                      <span>
                        연속{' '}
                        <span className="font-bold text-slate-700">{stats.streak}일</span>
                      </span>
                    </div>
                    <ProgressBar value={stats.completionRate} color="bg-blue-400" height="h-1" />
                  </div>

                  <svg
                    className="text-slate-300 flex-shrink-0"
                    width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
