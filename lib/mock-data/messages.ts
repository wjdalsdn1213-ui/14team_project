import { Message } from '@/lib/types';

function ts(daysAgo: number, hour: number, min: number): string {
  const d = new Date('2026-05-07');
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

export const MOCK_MESSAGES: Message[] = [
  // patient-1 ↔ therapist-1
  { id: 'msg-1-1', senderId: 'therapist-1', receiverId: 'patient-1', content: '이서연 환자분, 오늘 운동 잘 하셨나요? 어깨 통증은 어떠세요?', timestamp: ts(2, 10, 0), read: true },
  { id: 'msg-1-2', senderId: 'patient-1', receiverId: 'therapist-1', content: '네, 오늘은 조금 나아졌어요. 4점 정도인 것 같아요.', timestamp: ts(2, 10, 15), read: true },
  { id: 'msg-1-3', senderId: 'therapist-1', receiverId: 'patient-1', content: '좋아요! 계속 그렇게 유지하시면 곧 나아질 거예요. 무리하지 마세요 :)', timestamp: ts(2, 10, 30), read: true },
  { id: 'msg-1-4', senderId: 'patient-1', receiverId: 'therapist-1', content: '감사합니다! 다음 주에 뵙겠습니다.', timestamp: ts(1, 14, 0), read: true },
  { id: 'msg-1-5', senderId: 'therapist-1', receiverId: 'patient-1', content: '네, 다음 주에 봬요. 운동 기록 꼭 입력해주세요!', timestamp: ts(1, 14, 10), read: false },

  // patient-2 ↔ therapist-1
  { id: 'msg-2-1', senderId: 'therapist-1', receiverId: 'patient-2', content: '박지훈 환자분, 최근 기록을 보니 통증이 많이 높네요. 괜찮으세요?', timestamp: ts(1, 9, 0), read: true },
  { id: 'msg-2-2', senderId: 'patient-2', receiverId: 'therapist-1', content: '무릎이 많이 부어서 운동하기 힘들어요. 쉬어야 할까요?', timestamp: ts(1, 9, 20), read: true },
  { id: 'msg-2-3', senderId: 'therapist-1', receiverId: 'patient-2', content: '네, 통증이 7점 이상이면 오늘은 쉬시고, 냉찜질 해주세요. 내일 상태 알려주시면 처방 조정하겠습니다.', timestamp: ts(1, 9, 35), read: true },
  { id: 'msg-2-4', senderId: 'patient-2', receiverId: 'therapist-1', content: '알겠습니다. 감사합니다.', timestamp: ts(1, 9, 45), read: false },

  // patient-3 ↔ therapist-1
  { id: 'msg-3-1', senderId: 'patient-3', receiverId: 'therapist-1', content: '선생님, 고양이-낙타 스트레칭 할 때 자세가 맞는지 모르겠어요.', timestamp: ts(3, 11, 0), read: true },
  { id: 'msg-3-2', senderId: 'therapist-1', receiverId: 'patient-3', content: '등을 위로 올릴 때 배꼽을 등 쪽으로 당기는 느낌으로 해보세요. 다음 방문 때 같이 확인해봐요!', timestamp: ts(3, 11, 30), read: true },
  { id: 'msg-3-3', senderId: 'patient-3', receiverId: 'therapist-1', content: '해봤는데 훨씬 좋은 것 같아요. 감사합니다!', timestamp: ts(3, 13, 0), read: true },

  // patient-4 ↔ therapist-1
  { id: 'msg-4-1', senderId: 'therapist-1', receiverId: 'patient-4', content: '정도현 환자분, 발목 부종은 좀 가라앉았나요?', timestamp: ts(2, 15, 0), read: true },
  { id: 'msg-4-2', senderId: 'patient-4', receiverId: 'therapist-1', content: '많이 좋아졌어요. 어제보다 훨씬 수월하게 운동했습니다.', timestamp: ts(2, 15, 30), read: true },
  { id: 'msg-4-3', senderId: 'therapist-1', receiverId: 'patient-4', content: '잘 됐네요! 이번 주 수행률도 좋던데, 계속 파이팅!', timestamp: ts(2, 15, 45), read: true },

  // patient-5 ↔ therapist-1
  { id: 'msg-5-1', senderId: 'therapist-1', receiverId: 'patient-5', content: '강유나 환자분, 오늘 통증 점수가 8점이네요. 수술 부위에 특별한 이상은 없으신가요?', timestamp: ts(0, 8, 0), read: false },
  { id: 'msg-5-2', senderId: 'patient-5', receiverId: 'therapist-1', content: '수술 자리가 당기는 느낌이 있어요. 열감도 조금 있는 것 같고요.', timestamp: ts(0, 8, 30), read: false },
  { id: 'msg-5-3', senderId: 'therapist-1', receiverId: 'patient-5', content: '오늘 운동은 잠시 중단하시고, 가능하면 오늘 병원에 연락해서 확인해보시기 바랍니다. 이상 있으면 즉시 연락 주세요.', timestamp: ts(0, 8, 45), read: false },
];
