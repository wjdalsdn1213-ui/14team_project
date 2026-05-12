import { Prescription } from '@/lib/types';

export const MOCK_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'presc-1',
    patientId: 'patient-1',
    therapistId: 'therapist-1',
    exercises: [
      { exerciseId: 'ex-1', targetReps: 15, targetSets: 3 },
      { exerciseId: 'ex-2', targetReps: 12, targetSets: 3 },
      { exerciseId: 'ex-5', targetReps: 10, targetSets: 2 },
    ],
    startDate: '2026-04-01',
    endDate: '2026-05-31',
    notes: '어깨 충돌 증후군 재활. 통증이 6점 이상 시 운동 중단.',
  },
  {
    id: 'presc-2',
    patientId: 'patient-2',
    therapistId: 'therapist-1',
    exercises: [
      { exerciseId: 'ex-3', targetReps: 20, targetSets: 3 },
      { exerciseId: 'ex-4', targetReps: 15, targetSets: 3 },
      { exerciseId: 'ex-7', targetReps: 15, targetSets: 3 },
    ],
    startDate: '2026-04-15',
    endDate: '2026-06-15',
    notes: '무릎 반월판 수술 후 재활 3개월 차. 미니 스쿼트 각도 주의.',
  },
  {
    id: 'presc-3',
    patientId: 'patient-3',
    therapistId: 'therapist-1',
    exercises: [
      { exerciseId: 'ex-5', targetReps: 10, targetSets: 3 },
      { exerciseId: 'ex-6', targetReps: 10, targetSets: 3 },
      { exerciseId: 'ex-8', targetReps: 15, targetSets: 3 },
    ],
    startDate: '2026-03-20',
    notes: '만성 요통. 코어 강화 위주 처방.',
  },
  {
    id: 'presc-4',
    patientId: 'patient-4',
    therapistId: 'therapist-1',
    exercises: [
      { exerciseId: 'ex-9', targetReps: 20, targetSets: 3 },
      { exerciseId: 'ex-10', targetReps: 10, targetSets: 2 },
      { exerciseId: 'ex-4', targetReps: 10, targetSets: 2 },
    ],
    startDate: '2026-04-20',
    notes: '발목 인대 손상 재활. 부종 상태 주기적 체크.',
  },
  {
    id: 'presc-5',
    patientId: 'patient-5',
    therapistId: 'therapist-1',
    exercises: [
      { exerciseId: 'ex-7', targetReps: 15, targetSets: 3 },
      { exerciseId: 'ex-8', targetReps: 15, targetSets: 3 },
      { exerciseId: 'ex-3', targetReps: 15, targetSets: 3 },
      { exerciseId: 'ex-1', targetReps: 12, targetSets: 3 },
    ],
    startDate: '2026-04-10',
    notes: '고관절 치환술 후 재활. 무릎 굽힘 90도 제한.',
  },
];
