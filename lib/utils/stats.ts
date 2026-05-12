import { ExerciseLog, Prescription, PatientStats, AttentionLevel } from '@/lib/types';

export function calcCompletionRate(logs: ExerciseLog[], prescription: Prescription | undefined, daysBack = 7): number {
  if (!prescription) return 0;
  const cutoff = new Date('2026-05-07');
  cutoff.setDate(cutoff.getDate() - daysBack);
  const recent = logs.filter(l => new Date(l.date) >= cutoff);
  const expected = prescription.exercises.length * daysBack;
  if (expected === 0) return 0;
  return Math.min(100, Math.round((recent.length / expected) * 100));
}

export function calcAvgPainScore(logs: ExerciseLog[], daysBack = 7): number {
  const cutoff = new Date('2026-05-07');
  cutoff.setDate(cutoff.getDate() - daysBack);
  const recent = logs.filter(l => new Date(l.date) >= cutoff);
  if (recent.length === 0) return 0;
  const sum = recent.reduce((acc, l) => acc + l.painScore, 0);
  return Math.round((sum / recent.length) * 10) / 10;
}

export function calcAttentionLevel(avgPain: number, completionRate: number): AttentionLevel {
  if (avgPain >= 7 || completionRate < 30) return 'critical';
  if (avgPain >= 5 || completionRate < 60) return 'warning';
  return 'normal';
}

export function calcStreak(logs: ExerciseLog[]): number {
  const today = new Date('2026-05-07');
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (logs.some(l => l.date === dateStr)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getPatientStats(logs: ExerciseLog[], prescription: Prescription | undefined): PatientStats {
  const completionRate = calcCompletionRate(logs, prescription);
  const avgPainScore = calcAvgPainScore(logs);
  const attentionLevel = calcAttentionLevel(avgPainScore, completionRate);
  const streak = calcStreak(logs);
  return { completionRate, avgPainScore, attentionLevel, streak };
}

export function getPainColor(score: number): string {
  if (score <= 3) return 'text-green-600';
  if (score <= 6) return 'text-amber-500';
  return 'text-red-600';
}

export function getPainBgColor(score: number): string {
  if (score <= 3) return 'bg-green-100 text-green-700';
  if (score <= 6) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

export function getDifficultyLabel(d: string): string {
  const map: Record<string, string> = { easy: '쉬움', medium: '보통', hard: '어려움' };
  return map[d] ?? d;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function generateAISummary(patientName: string, stats: PatientStats, recentLogs: ExerciseLog[]): string {
  const { avgPainScore, completionRate, attentionLevel } = stats;
  const memos = recentLogs.filter(l => l.memo).map(l => l.memo).slice(0, 2);

  let summary = `${patientName} 환자의 최근 7일 재활 현황을 분석했습니다.\n\n`;
  summary += `📊 수행률 ${completionRate}%, 평균 통증 ${avgPainScore}점(10점 만점)입니다.\n\n`;

  if (attentionLevel === 'critical') {
    summary += `⚠️ 주의 필요: 통증 수준이 높거나 운동 수행률이 매우 낮습니다. 즉각적인 치료사 개입을 권장합니다. `;
    summary += `통증 원인을 파악하고 처방 강도를 낮추거나 휴식을 권고하는 것이 좋겠습니다.\n\n`;
  } else if (attentionLevel === 'warning') {
    summary += `🔶 관심 필요: 통증이 다소 높거나 수행률이 낮습니다. `;
    summary += `운동 동기 부여 및 통증 관리 전략 재검토가 필요합니다.\n\n`;
  } else {
    summary += `✅ 양호: 환자가 꾸준히 운동하고 있으며 통증도 잘 관리되고 있습니다. `;
    summary += `현재 처방을 유지하면서 점진적 강도 증가를 고려해볼 수 있습니다.\n\n`;
  }

  if (memos.length > 0) {
    summary += `💬 최근 환자 메모: "${memos.join('", "')}"`;
  }

  return summary;
}
