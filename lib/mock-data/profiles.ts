import { PatientProfile, TherapistComment } from '@/lib/types';

export const MOCK_PROFILES: PatientProfile[] = [
  {
    patientId: 'patient-1',
    diagnosis: '어깨 충돌 증후군 (Shoulder Impingement Syndrome)',
    injuryDate: '2026-02-15',
    status: 'subacute',
    statusLabel: '아급성기',
  },
  {
    patientId: 'patient-2',
    diagnosis: '우측 무릎 반월판 파열 — 관절경 수술 후',
    injuryDate: '2026-01-20',
    surgeryDate: '2026-02-05',
    status: 'subacute',
    statusLabel: '수술 후 재활',
  },
  {
    patientId: 'patient-3',
    diagnosis: '만성 요통 (Chronic Low Back Pain)',
    injuryDate: '2025-09-01',
    status: 'chronic',
    statusLabel: '만성기',
  },
  {
    patientId: 'patient-4',
    diagnosis: '좌측 외측 발목 인대 손상 (Grade II)',
    injuryDate: '2026-04-18',
    status: 'acute',
    statusLabel: '급성기',
  },
  {
    patientId: 'patient-5',
    diagnosis: '좌측 고관절 전치환술 (Total Hip Arthroplasty)',
    injuryDate: '2026-03-01',
    surgeryDate: '2026-03-15',
    status: 'acute',
    statusLabel: '수술 직후',
  },
];

export const MOCK_COMMENTS: TherapistComment[] = [
  {
    id: 'cmt-1',
    patientId: 'patient-1',
    therapistId: 'therapist-1',
    content: '어깨 가동범위 서서히 개선 중. 외회전 각도 10도 증가. 다음 주부터 저항 운동 강도 소폭 증가 예정.',
    createdAt: '2026-05-05T10:00:00Z',
  },
  {
    id: 'cmt-2',
    patientId: 'patient-2',
    therapistId: 'therapist-1',
    content: '통증 수준이 지속적으로 높아 처방 강도 조정 필요. 환자가 부종 호소. 냉찜질 권고.',
    createdAt: '2026-05-06T09:30:00Z',
  },
];
