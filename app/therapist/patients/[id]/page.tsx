'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/lib/context/AppContext';
import { useToast } from '@/lib/context/ToastContext';
import { MOCK_EXERCISES } from '@/lib/mock-data/exercises';
import {
  getPatientStats, generateAISummary, getPainBgColor,
  getDifficultyLabel, formatDate,
} from '@/lib/utils/stats';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import CalendarView from '@/components/shared/CalendarView';
import PainTrendChart from '@/components/charts/PainTrendChart';
import CompletionChart from '@/components/charts/CompletionChart';
import DonutChart from '@/components/charts/DonutChart';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';

type Tab = 'overview' | 'calendar' | 'records' | 'comments';

const STATUS_LABEL: Record<string, { label: string; style: string }> = {
  acute:       { label: '급성기',      style: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
  subacute:    { label: '아급성기',    style: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200' },
  chronic:     { label: '만성기',      style: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  maintenance: { label: '유지기',      style: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' },
};

const ATTENTION_CONFIG = {
  critical: { label: '즉시 확인', badge: 'critical' as const },
  warning:  { label: '관심 필요', badge: 'warning' as const },
  normal:   { label: '양호',      badge: 'normal' as const },
};

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    users,
    getPatientLogs, getPatientPrescription, getPatientProfile,
    getPatientComments, addComment, addExercisesToPrescription,
    currentUser, getAISummary,
  } = useApp();
  const { showToast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [calPopupDate, setCalPopupDate] = useState<string | null>(null);
  const [calPopupLogs, setCalPopupLogs] = useState<ReturnType<typeof getPatientLogs>>([]);
  const [addExModalOpen, setAddExModalOpen] = useState(false);
  const [selectedExId, setSelectedExId] = useState('');
  const [addReps, setAddReps] = useState(10);
  const [addSets, setAddSets] = useState(3);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Look up patient from API-loaded users list
  const patient = users.find(u => u.id === id);

  const logs = patient ? getPatientLogs(patient.id) : [];
  const prescription = patient ? getPatientPrescription(patient.id) : undefined;
  const profile = patient ? getPatientProfile(patient.id) : undefined;
  const patientComments = patient ? getPatientComments(patient.id) : [];
  const stats = getPatientStats(logs, prescription);
  const cfg = ATTENTION_CONFIG[stats.attentionLevel];
  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // Fetch AI summary from API, fall back to local generation
  useEffect(() => {
    if (!patient) return;
    setAiLoading(true);
    getAISummary(patient.id)
      .then(summary => setAiSummary(summary))
      .catch(() => setAiSummary(generateAISummary(patient.name, stats, logs.slice(-10))))
      .finally(() => setAiLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  if (!patient) {
    return <div className="p-8 text-slate-400">환자를 찾을 수 없습니다.</div>;
  }

  const painColor =
    stats.avgPainScore <= 3 ? 'text-emerald-600'
    : stats.avgPainScore <= 6 ? 'text-amber-600'
    : 'text-red-600';

  const statusStyle = profile ? STATUS_LABEL[profile.status] : null;

  const prescribedIds = new Set(prescription?.exercises.map(e => e.exerciseId) ?? []);
  const availableExercises = MOCK_EXERCISES.filter(e => !prescribedIds.has(e.id));

  const handleSelectExercise = (exId: string) => {
    setSelectedExId(exId);
    const ex = MOCK_EXERCISES.find(e => e.id === exId);
    if (ex) { setAddReps(ex.defaultReps); setAddSets(ex.defaultSets); }
  };

  const handleAddExercise = () => {
    if (!prescription || !selectedExId) return;
    addExercisesToPrescription(prescription.id, [{ exerciseId: selectedExId, targetReps: addReps, targetSets: addSets }]);
    setAddExModalOpen(false);
    setSelectedExId('');
    showToast('운동이 처방에 추가됐습니다!');
  };

  const handleSaveComment = async () => {
    if (!commentText.trim() || !currentUser) return;
    setSavingComment(true);
    await new Promise(r => setTimeout(r, 500));
    addComment({
      id: `cmt-${Date.now()}`,
      patientId: patient.id,
      therapistId: currentUser.id,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    });
    setCommentText('');
    setSavingComment(false);
    showToast('코멘트가 저장됐습니다!');
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',  label: '개요' },
    { key: 'calendar',  label: '캘린더' },
    { key: 'records',   label: '기록' },
    { key: 'comments',  label: `코멘트${patientComments.length > 0 ? ` (${patientComments.length})` : ''}` },
  ];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors flex-shrink-0 mt-0.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
              {patient.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
                <Badge variant={cfg.badge} dot>{cfg.label}</Badge>
                {statusStyle && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle.style}`}>
                    {profile?.statusLabel}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">{patient.email}</p>
            </div>
          </div>

          {profile && (
            <div className="ml-0 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">진단명</p>
                  <p className="text-sm font-semibold text-slate-800">{profile.diagnosis}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>발생일 <span className="text-slate-600 font-medium">{profile.injuryDate}</span></span>
                    {profile.surgeryDate && (
                      <span>수술일 <span className="text-slate-600 font-medium">{profile.surgeryDate}</span></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <Link href={`/therapist/chat/${patient.id}`}>
          <Button variant="outline" size="sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            채팅
          </Button>
        </Link>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-5 flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 self-start">수행률</p>
          <DonutChart value={stats.completionRate} size={100} strokeWidth={12} />
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">평균 통증</p>
          <div className="flex items-end gap-1">
            <span className={`text-4xl font-bold ${painColor}`}>{stats.avgPainScore}</span>
            <span className="text-slate-300 mb-1">/10</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">최근 7일 평균</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">연속 운동</p>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-violet-600">{stats.streak}</span>
            <span className="text-slate-400 mb-1 text-sm">일</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">연속 운동일 수</p>
        </Card>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-2xl p-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              tab === t.key ? 'bg-white text-slate-900 card-shadow' : 'text-slate-400 hover:text-slate-600'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* 개요 */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-slate-900">AI 재활 요약</h2>
                <p className="text-xs text-slate-400">AI 분석 결과</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 min-h-[80px] flex items-center justify-center">
              {aiLoading ? (
                <Spinner />
              ) : (
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line w-full">{aiSummary}</p>
              )}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="font-bold text-slate-900 mb-1">통증 추이</h2>
            <p className="text-xs text-slate-400 mb-5">최근 2주</p>
            <PainTrendChart logs={logs} daysBack={14} />
          </Card>
          <Card className="p-6">
            <h2 className="font-bold text-slate-900 mb-1">주간 수행률</h2>
            <p className="text-xs text-slate-400 mb-5">최근 4주 비교</p>
            <CompletionChart logs={logs} prescription={prescription} weeksBack={4} />
          </Card>
          {prescription && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-slate-900">현재 처방</h2>
                  <span className="text-xs text-slate-400">{prescription.startDate}{prescription.endDate ? ` ~ ${prescription.endDate}` : ' ~ 진행 중'}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSelectedExId(''); setAddExModalOpen(true); }}>
                  + 처방 추가
                </Button>
              </div>
              <div className="divide-y divide-slate-50">
                {prescription.exercises.map(pe => {
                  const exName = pe.exerciseName ?? MOCK_EXERCISES.find(e => e.id === pe.exerciseId)?.name;
                  return (
                    <div key={pe.exerciseId} className="flex items-center justify-between py-3">
                      <span className="text-sm font-medium text-slate-800">{exName}</span>
                      <span className="text-xs text-slate-400 font-medium">{pe.targetSets}세트 × {pe.targetReps}회</span>
                    </div>
                  );
                })}
              </div>
              {prescription.notes && (
                <div className="mt-4 p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs font-semibold text-amber-700 mb-1">치료사 메모</p>
                  <p className="text-xs text-amber-600">{prescription.notes}</p>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* 캘린더 */}
      {tab === 'calendar' && (
        <>
          <Card className="p-6">
            <div className="flex items-center gap-5 mb-5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />낮은 통증 (0–3)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />중간 (4–6)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />높은 통증 (7–10)</span>
            </div>
            <CalendarView
              logs={logs}
              hideDetail
              onSelectDate={(date, dayLogs) => {
                setCalPopupDate(date);
                setCalPopupLogs(dayLogs);
              }}
            />
          </Card>
          <Modal
            isOpen={!!calPopupDate}
            onClose={() => setCalPopupDate(null)}
            title={calPopupDate ? formatDate(calPopupDate) : ''}
            size="sm"
          >
            {calPopupLogs.length === 0 ? (
              <EmptyState
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                }
                title="이 날은 기록이 없어요"
              />
            ) : (
              <div className="space-y-3">
                {calPopupLogs.map(log => {
                  const exName = log.exerciseName ?? MOCK_EXERCISES.find(e => e.id === log.exerciseId)?.name;
                  return (
                    <div key={log.id} className="bg-slate-50 rounded-2xl px-4 py-3.5">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-bold text-slate-800">{exName}</p>
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
        </>
      )}

      {/* 처방 추가 모달 */}
      <Modal
        isOpen={addExModalOpen}
        onClose={() => setAddExModalOpen(false)}
        title="운동 추가"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-2">운동 선택</label>
            {availableExercises.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">추가 가능한 운동이 없습니다.</p>
            ) : (
              <select
                value={selectedExId}
                onChange={e => handleSelectExercise(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">운동을 선택하세요</option>
                {availableExercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            )}
          </div>
          {selectedExId && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-2">세트 수</label>
                <input
                  type="number" min={1} max={10} value={addSets}
                  onChange={e => setAddSets(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-2">반복 횟수</label>
                <input
                  type="number" min={1} max={100} value={addReps}
                  onChange={e => setAddReps(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setAddExModalOpen(false)}>취소</Button>
            <Button size="sm" onClick={handleAddExercise} disabled={!selectedExId}>추가하기</Button>
          </div>
        </div>
      </Modal>

      {/* 기록 */}
      {tab === 'records' && (
        <Card className="p-6">
          <h2 className="font-bold text-slate-900 mb-5">최근 기록 <span className="text-slate-300 font-normal">({recentLogs.length}건)</span></h2>
          {recentLogs.length === 0 ? (
            <EmptyState
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
              title="운동 기록이 없습니다"
            />
          ) : (
            <div className="space-y-3">
              {recentLogs.map(log => {
                const exName = log.exerciseName ?? MOCK_EXERCISES.find(e => e.id === log.exerciseId)?.name;
                return (
                  <div key={log.id} className="bg-slate-50 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{exName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(log.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${getPainBgColor(log.painScore)}`}>통증 {log.painScore}</span>
                        <Badge variant="neutral">{getDifficultyLabel(log.difficulty)}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{log.actualSets}세트 × {log.actualReps}회</p>
                    {log.memo && <p className="text-xs text-slate-400 mt-2 italic">&quot;{log.memo}&quot;</p>}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* 코멘트 */}
      {tab === 'comments' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-bold text-slate-900 mb-3">코멘트 작성</h2>
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="환자 상태, 치료 방향, 특이사항 등을 기록하세요..."
              rows={3}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <div className="flex justify-end mt-3">
              <Button onClick={handleSaveComment} disabled={!commentText.trim() || savingComment} size="sm">
                {savingComment ? <Spinner /> : null}
                {savingComment ? '저장 중...' : '코멘트 저장'}
              </Button>
            </div>
          </Card>

          {patientComments.length === 0 ? (
            <Card className="py-4">
              <EmptyState
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
                title="아직 코멘트가 없습니다"
                description="위에서 첫 번째 코멘트를 작성해보세요."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {patientComments.map(cmt => (
                <Card key={cmt.id} className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">치료사 코멘트</span>
                    <span className="text-xs text-slate-400">
                      {new Date(cmt.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}{' '}
                      {new Date(cmt.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{cmt.content}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
