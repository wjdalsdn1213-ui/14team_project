import { User } from '@/lib/types';

export const MOCK_USERS: User[] = [
  {
    id: 'therapist-1',
    name: '김민준',
    role: 'therapist',
    email: 'minjun@rehab.com',
    password: '1234',
    avatarInitials: '김민',
  },
  {
    id: 'patient-1',
    name: '이서연',
    role: 'patient',
    email: 'seoyeon@email.com',
    password: '1234',
    avatarInitials: '이서',
    therapistId: 'therapist-1',
  },
  {
    id: 'patient-2',
    name: '박지훈',
    role: 'patient',
    email: 'jihoon@email.com',
    password: '1234',
    avatarInitials: '박지',
    therapistId: 'therapist-1',
  },
  {
    id: 'patient-3',
    name: '최수아',
    role: 'patient',
    email: 'sua@email.com',
    password: '1234',
    avatarInitials: '최수',
    therapistId: 'therapist-1',
  },
  {
    id: 'patient-4',
    name: '정도현',
    role: 'patient',
    email: 'dohyun@email.com',
    password: '1234',
    avatarInitials: '정도',
    therapistId: 'therapist-1',
  },
  {
    id: 'patient-5',
    name: '강유나',
    role: 'patient',
    email: 'yuna@email.com',
    password: '1234',
    avatarInitials: '강유',
    therapistId: 'therapist-1',
  },
];

export const MOCK_ACCOUNTS = MOCK_USERS.map(u => ({
  email: u.email,
  password: u.password,
  userId: u.id,
}));
