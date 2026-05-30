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
import { apiFetchPrescriptionRecommend } from '@/lib/api';
import type { PrescriptionRecommendResult, RecommendedExercise } from '@/lib/api';
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
    users, exercises,
    getPatientLogs, getPatientPrescription, getPatientProfile,
    getPatientComments, addComment, addExercisesToPrescription,
    updatePrescribedExercise, removePrescribedExercise,
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
  const [recResult, setRecResult] = useState<PrescriptionRecommendResult | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState('');
  const [showRecModal, setShowRecModal] = useState(false);
  const [addExModalFromAI, setAddExModalFromAI] = useState(false);
  const [editExOpen, setEditExOpen] = useState(false);
  const [editExId, setEditExId] = useState('');
  const [editExName, setEditExName] = useState('');
  const [editExSets, setEditExSets] = useState(3);
  const [editExReps, setEditExReps] = useState(10);
  const [editExSaving, setEditExSaving] = useState(false);
  const [deleteExOpen, setDeleteExOpen] = useState(false);
  const [deleteExId, setDeleteExId] = useState('');
  const [deleteExName, setDeleteExName] = useState('');
  const [deleteExLoading, setDeleteExLoading] = useState(false);

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
  const availableExercises = exercises.filter(e => !prescribedIds.has(e.id));

  const handleSelectExercise = (exId: string) => {
    setSelectedExId(exId);
    const ex = exercises.find(e => e.id === exId);
    if (ex) { setAddReps(ex.defaultReps); setAddSets(ex.defaultSets); }
  };

  const handleApplyAIRec = (rec?: RecommendedExercise) => {
    const adj = rec ?? recResult?.recommended_exercise;
    if (!adj) return;
    const matchedEx = exercises.find(
      e => e.name === adj.exercise_name || adj.exercise_name.includes(e.name) || e.name.includes(adj.exercise_name),
    );
    if (matchedEx) {
      setSelectedExId(matchedEx.id);
      setAddSets(adj.recommended_sets ?? matchedEx.defaultSets);
      setAddReps(adj.recommended_reps ?? matchedEx.defaultReps);
    } else {
      setSelectedExId('');
      setAddSets(adj.recommended_sets ?? 3);
      setAddReps(adj.recommended_reps ?? 10);
    }
    setAddExModalFromAI(true);
    setShowRecModal(false);
    setAddExModalOpen(true);
  };

  const handleAddExercise = async () => {
    if (!prescription || !selectedExId) return;
    await addExercisesToPrescription(prescription.id, [{ exerciseId: selectedExId, targetReps: addReps, targetSets: addSets }]);
    setAddExModalOpen(false);
    setAddExModalFromAI(false);
    setSelectedExId('');
    showToast('운동이 처방에 추가됐습니다!');
  };

  const handleGetRecommendation = async () => {
    if (!patient) return;
    setRecError('');
    setRecLoading(true);
    setShowRecModal(true);
    try {
      const data = await apiFetchPrescriptionRecommend(patient.id);
      setRecResult(data);
    } catch (e) {
      setRecError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setRecLoading(false);
    }
  };

  const openEditEx = (exId: string, exName: string, sets: number, reps: number) => {
    setEditExId(exId);
    setEditExName(exName);
    setEditExSets(sets);
    setEditExReps(reps);
    setEditExOpen(true);
  };

  const handleEditExSave = async () => {
    if (!prescription) return;
    setEditExSaving(true);
    try {
      await updatePrescribedExercise(prescription.id, editExId, { targetSets: editExSets, targetReps: editExReps });
      showToast('처방이 수정됐습니다!');
      setEditExOpen(false);
    } finally {
      setEditExSaving(false);
    }
  };

  const openDeleteEx = (exId: string, exName: string) => {
    setDeleteExId(exId);
    setDeleteExName(exName);
    setDeleteExOpen(true);
  };

  const handleDeleteExConfirm = async () => {
    if (!prescription) return;
    setDeleteExLoading(true);
    try {
      await removePrescribedExercise(prescription.id, deleteExId);
      showToast(`${deleteExName} 운동이 삭제됐습니다.`);
      setDeleteExOpen(false);
    } finally {
      setDeleteExLoading(false);
    }
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
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            onClick={handleGetRecommendation}
            disabled={recLoading}
            className="bg-violet-500 hover:bg-violet-600 text-white border-0 shadow-sm shadow-violet-200 whitespace-nowrap"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            AI 처방 추천
          </Button>
          <Link href={`/therapist/chat/${patient.id}`}>
            <Button variant="outline" size="sm" className="w-full">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              채팅
            </Button>
          </Link>
        </div>
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
                  const exName = pe.exerciseName ?? MOCK_EXERCISES.find(e => e.id === pe.exerciseId)?.name ?? '알 수 없는 운동';
                  return (
                    <div key={pe.exerciseId} className="flex items-center justify-between py-3 group">
                      <span className="text-sm font-medium text-slate-800">{exName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-medium tabular-nums">{pe.targetSets}세트 × {pe.targetReps}회</span>
                        <button
                          type="button"
                          onClick={() => openEditEx(pe.exerciseId, exName, pe.targetSets, pe.targetReps)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="편집"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteEx(pe.exerciseId, exName)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="삭제"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
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
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />낮은 통증 (0?3)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />중간 (4?6)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />높은 통증 (7?10)</span>
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
        onClose={() => { setAddExModalOpen(false); setAddExModalFromAI(false); }}
        title={addExModalFromAI ? 'AI 추천 처방 적용' : '운동 추가'}
        size="sm"
      >
        <div className="space-y-4">
          {addExModalFromAI && (
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <p className="text-xs font-semibold text-violet-700">AI가 추천한 세트/횟수가 자동 입력됐습니다. 수정 후 저장하세요.</p>
            </div>
          )}
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
            <Button variant="ghost" size="sm" onClick={() => { setAddExModalOpen(false); setAddExModalFromAI(false); }}>취소</Button>
            <Button size="sm" onClick={handleAddExercise} disabled={!selectedExId}>
              {addExModalFromAI ? 'AI 추천 처방 저장' : '추가하기'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 처방 운동 편집 모달 */}
      <Modal isOpen={editExOpen} onClose={() => setEditExOpen(false)} title="처방 운동 편집" size="sm">
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-0.5">운동</p>
            <p className="text-sm font-bold text-slate-800">{editExName}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2">세트 수</label>
              <input
                type="number" min={1} max={10} value={editExSets}
                onChange={e => setEditExSets(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2">반복 횟수</label>
              <input
                type="number" min={1} max={100} value={editExReps}
                onChange={e => setEditExReps(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setEditExOpen(false)}>취소</Button>
            <Button size="sm" onClick={handleEditExSave} disabled={editExSaving}>
              {editExSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 처방 운동 삭제 확인 모달 */}
      <Modal isOpen={deleteExOpen} onClose={() => setDeleteExOpen(false)} title="운동 삭제" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-700"><span className="font-black">{deleteExName}</span>을(를) 처방에서 삭제하시겠습니까?</p>
              <p className="text-xs text-red-500 mt-1">이 작업은 되돌릴 수 없습니다.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteExOpen(false)}>취소</Button>
            <Button
              size="sm"
              onClick={handleDeleteExConfirm}
              disabled={deleteExLoading}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              {deleteExLoading ? '삭제 중...' : '삭제'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI 처방 추천 Modal */}
      <Modal
        isOpen={showRecModal}
        onClose={() => setShowRecModal(false)}
        title="AI 처방 추천"
        size="lg"
      >
        {recLoading && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm font-bold text-violet-600">AI가 환자 데이터를 분석 중입니다...</p>
              <p className="text-xs text-slate-400 mt-1">운동 기록, 통증 추이, 처방 현황을 종합하고 있어요</p>
            </div>
          </div>
        )}

        {!recLoading && recError && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-red-600 mb-1">분석 실패</p>
            <p className="text-xs text-slate-400">{recError}</p>
            <Button size="sm" className="mt-4" onClick={handleGetRecommendation}>다시 시도</Button>
          </div>
        )}

        {!recLoading && !recError && recResult && (() => {
          const completionColor = stats.completionRate >= 70 ? 'text-emerald-600' : stats.completionRate >= 40 ? 'text-amber-600' : 'text-red-600';
          const completionBg   = stats.completionRate >= 70 ? 'bg-emerald-50 border-emerald-100' : stats.completionRate >= 40 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';
          const painColor2 = stats.avgPainScore <= 3 ? 'text-emerald-600' : stats.avgPainScore <= 6 ? 'text-amber-600' : 'text-red-600';
          const painBg    = stats.avgPainScore <= 3 ? 'bg-emerald-50 border-emerald-100' : stats.avgPainScore <= 6 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';
          const riskColor = stats.attentionLevel === 'normal' ? 'text-emerald-600' : stats.attentionLevel === 'warning' ? 'text-amber-600' : 'text-red-600';
          const riskBg    = stats.attentionLevel === 'normal' ? 'bg-emerald-50 border-emerald-100' : stats.attentionLevel === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';
          const rec = recResult.recommended_exercise;

          return (
            <div className="space-y-4">
              {/* ① AI 추천 신규 처방 ? 메인 히어로 카드 */}
              {rec ? (
                <div className="rounded-2xl overflow-hidden border border-violet-200 shadow-sm shadow-violet-100">
                  <div className="bg-gradient-to-r from-violet-500 to-violet-600 px-5 py-3 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span className="text-sm font-bold text-white">AI 추천 신규 처방</span>
                    <span className="ml-auto text-xs text-violet-200">현재 처방에 없는 운동</span>
                  </div>
                  <div className="bg-white px-5 py-4">
                    <p className="text-xl font-black text-slate-900 mb-1">{rec.exercise_name}</p>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-lg">
                        {rec.recommended_sets ?? '?'}세트 × {rec.recommended_reps ?? '?'}회
                      </span>
                      <span className="text-xs text-slate-500">{rec.reason}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">{rec.recommendation}</p>
                    <button
                      type="button"
                      onClick={() => handleApplyAIRec(rec)}
                      className="w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white font-bold text-sm shadow-sm shadow-violet-200 transition-all flex items-center justify-center gap-2"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      AI 추천 처방 적용하기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-center">
                  <p className="text-sm text-slate-400">추천할 새 운동이 없습니다</p>
                  <p className="text-xs text-slate-300 mt-1">이미 모든 운동이 처방되어 있거나 운동 데이터가 부족합니다.</p>
                </div>
              )}

              {/* ② 상태 요약 숫자 카드 3개 */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`rounded-2xl border p-3 text-center ${completionBg}`}>
                  <p className="text-xs text-slate-400 mb-1">수행률</p>
                  <p className={`text-2xl font-black ${completionColor}`}>{stats.completionRate}<span className="text-sm font-semibold">%</span></p>
                </div>
                <div className={`rounded-2xl border p-3 text-center ${painBg}`}>
                  <p className="text-xs text-slate-400 mb-1">평균 통증</p>
                  <p className={`text-2xl font-black ${painColor2}`}>{stats.avgPainScore}<span className="text-sm font-semibold text-slate-400">/10</span></p>
                </div>
                <div className={`rounded-2xl border p-3 text-center ${riskBg}`}>
                  <p className="text-xs text-slate-400 mb-1">위험도</p>
                  <p className={`text-base font-black ${riskColor} leading-tight mt-1`}>{cfg.label}</p>
                </div>
              </div>

              {/* ③ 주의 신호 */}
              {recResult.risk_signals.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                  <p className="text-xs font-bold text-red-700 mb-2">? 주의 신호</p>
                  <ul className="space-y-1">
                    {recResult.risk_signals.slice(0, 3).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-red-600">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ④ 처방 방향 + 종합 의견 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                  <p className="text-xs font-bold text-blue-700 mb-1">처방 방향</p>
                  <p className="text-xs text-blue-600 leading-relaxed line-clamp-3">{recResult.prescription_direction}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                  <p className="text-xs font-bold text-emerald-700 mb-1">종합 의견</p>
                  <p className="text-xs text-emerald-700 leading-relaxed line-clamp-3">{recResult.overall_recommendation}</p>
                </div>
              </div>

              <p className="text-center text-xs text-slate-300">AI 분석 결과는 참고용이며, 최종 처방은 치료사의 임상적 판단을 따르세요.</p>
            </div>
          );
        })()}
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
