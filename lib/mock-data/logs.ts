import { ExerciseLog, Difficulty } from '@/lib/types';

function makeDate(daysAgo: number): string {
  const d = new Date('2026-05-07');
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function log(
  id: string,
  patientId: string,
  exerciseId: string,
  daysAgo: number,
  reps: number,
  sets: number,
  painScore: number,
  difficulty: Difficulty,
  memo?: string
): ExerciseLog {
  return { id, patientId, exerciseId, date: makeDate(daysAgo), actualReps: reps, actualSets: sets, painScore, difficulty, memo };
}

export const MOCK_LOGS: ExerciseLog[] = [
  // patient-1 (이서연) - 어깨 재활, 최근 30일
  log('log-1-1', 'patient-1', 'ex-1', 0, 15, 3, 3, 'easy'),
  log('log-1-2', 'patient-1', 'ex-2', 0, 12, 3, 4, 'medium'),
  log('log-1-3', 'patient-1', 'ex-5', 0, 10, 2, 2, 'easy'),
  log('log-1-4', 'patient-1', 'ex-1', 2, 15, 3, 4, 'medium'),
  log('log-1-5', 'patient-1', 'ex-2', 2, 10, 2, 5, 'medium', '오늘 약간 무거웠음'),
  log('log-1-6', 'patient-1', 'ex-1', 4, 15, 3, 2, 'easy'),
  log('log-1-7', 'patient-1', 'ex-2', 4, 12, 3, 3, 'easy'),
  log('log-1-8', 'patient-1', 'ex-5', 4, 10, 2, 2, 'easy'),
  log('log-1-9', 'patient-1', 'ex-1', 6, 15, 3, 5, 'hard', '왼쪽 어깨 당김'),
  log('log-1-10', 'patient-1', 'ex-2', 8, 12, 3, 3, 'medium'),
  log('log-1-11', 'patient-1', 'ex-1', 10, 15, 3, 2, 'easy'),
  log('log-1-12', 'patient-1', 'ex-5', 10, 10, 2, 1, 'easy'),
  log('log-1-13', 'patient-1', 'ex-1', 12, 15, 3, 4, 'medium'),
  log('log-1-14', 'patient-1', 'ex-2', 14, 12, 3, 3, 'easy'),
  log('log-1-15', 'patient-1', 'ex-1', 16, 15, 3, 2, 'easy'),
  log('log-1-16', 'patient-1', 'ex-1', 18, 15, 2, 6, 'hard', '많이 아팠음'),
  log('log-1-17', 'patient-1', 'ex-2', 20, 12, 3, 4, 'medium'),
  log('log-1-18', 'patient-1', 'ex-5', 22, 10, 2, 2, 'easy'),
  log('log-1-19', 'patient-1', 'ex-1', 24, 15, 3, 3, 'medium'),
  log('log-1-20', 'patient-1', 'ex-2', 26, 12, 3, 2, 'easy'),
  log('log-1-21', 'patient-1', 'ex-1', 28, 15, 3, 4, 'medium'),

  // patient-2 (박지훈) - 무릎 재활, 수행률 낮음, 통증 높음
  log('log-2-1', 'patient-2', 'ex-3', 0, 20, 3, 7, 'hard', '무릎이 많이 부었음'),
  log('log-2-2', 'patient-2', 'ex-4', 3, 10, 2, 8, 'hard', '통증 심해 중단'),
  log('log-2-3', 'patient-2', 'ex-3', 7, 15, 2, 6, 'hard'),
  log('log-2-4', 'patient-2', 'ex-7', 10, 15, 3, 5, 'medium'),
  log('log-2-5', 'patient-2', 'ex-3', 14, 20, 3, 7, 'hard'),
  log('log-2-6', 'patient-2', 'ex-4', 18, 10, 1, 9, 'hard', '오늘 너무 힘들었음'),
  log('log-2-7', 'patient-2', 'ex-3', 21, 15, 2, 6, 'hard'),

  // patient-3 (최수아) - 허리 재활, 꾸준함
  log('log-3-1', 'patient-3', 'ex-5', 0, 10, 3, 2, 'easy'),
  log('log-3-2', 'patient-3', 'ex-6', 0, 10, 3, 3, 'easy'),
  log('log-3-3', 'patient-3', 'ex-8', 0, 15, 3, 2, 'easy'),
  log('log-3-4', 'patient-3', 'ex-5', 2, 10, 3, 3, 'medium'),
  log('log-3-5', 'patient-3', 'ex-6', 2, 10, 3, 2, 'easy'),
  log('log-3-6', 'patient-3', 'ex-5', 4, 10, 3, 1, 'easy'),
  log('log-3-7', 'patient-3', 'ex-8', 4, 15, 3, 2, 'easy'),
  log('log-3-8', 'patient-3', 'ex-6', 6, 10, 3, 3, 'medium'),
  log('log-3-9', 'patient-3', 'ex-5', 8, 10, 3, 2, 'easy'),
  log('log-3-10', 'patient-3', 'ex-8', 10, 15, 3, 1, 'easy'),
  log('log-3-11', 'patient-3', 'ex-5', 12, 10, 3, 2, 'easy'),
  log('log-3-12', 'patient-3', 'ex-6', 14, 10, 3, 3, 'medium'),
  log('log-3-13', 'patient-3', 'ex-8', 16, 15, 3, 2, 'easy'),
  log('log-3-14', 'patient-3', 'ex-5', 18, 10, 3, 2, 'easy'),
  log('log-3-15', 'patient-3', 'ex-6', 20, 10, 3, 3, 'easy'),

  // patient-4 (정도현) - 발목 재활, 보통
  log('log-4-1', 'patient-4', 'ex-9', 1, 20, 3, 4, 'medium'),
  log('log-4-2', 'patient-4', 'ex-10', 1, 10, 2, 3, 'easy'),
  log('log-4-3', 'patient-4', 'ex-9', 3, 20, 3, 5, 'medium'),
  log('log-4-4', 'patient-4', 'ex-4', 5, 10, 2, 4, 'medium'),
  log('log-4-5', 'patient-4', 'ex-9', 7, 20, 3, 3, 'easy'),
  log('log-4-6', 'patient-4', 'ex-10', 9, 10, 2, 4, 'medium'),
  log('log-4-7', 'patient-4', 'ex-9', 11, 20, 3, 5, 'medium'),
  log('log-4-8', 'patient-4', 'ex-4', 13, 10, 2, 4, 'medium'),
  log('log-4-9', 'patient-4', 'ex-9', 15, 18, 3, 3, 'easy'),
  log('log-4-10', 'patient-4', 'ex-10', 17, 10, 2, 4, 'medium'),

  // patient-5 (강유나) - 고관절 재활, 위험 수준 통증
  log('log-5-1', 'patient-5', 'ex-7', 0, 15, 3, 8, 'hard', '수술 부위 통증'),
  log('log-5-2', 'patient-5', 'ex-8', 0, 10, 2, 7, 'hard'),
  log('log-5-3', 'patient-5', 'ex-3', 2, 10, 2, 6, 'hard'),
  log('log-5-4', 'patient-5', 'ex-7', 4, 15, 3, 8, 'hard', '오늘도 심함'),
  log('log-5-5', 'patient-5', 'ex-1', 6, 10, 2, 5, 'medium'),
  log('log-5-6', 'patient-5', 'ex-7', 8, 12, 2, 7, 'hard'),
  log('log-5-7', 'patient-5', 'ex-8', 10, 10, 2, 6, 'hard'),
];
