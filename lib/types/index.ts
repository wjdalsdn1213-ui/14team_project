export type UserRole = 'patient' | 'therapist';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type AttentionLevel = 'normal' | 'warning' | 'critical';
export type BodyPart = 'shoulder' | 'knee' | 'back' | 'hip' | 'ankle';
export type RehabStatus = 'acute' | 'subacute' | 'chronic' | 'maintenance';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  password: string;
  avatarInitials: string;
  therapistId?: string;
}

export interface PatientProfile {
  patientId: string;
  diagnosis: string;
  injuryDate: string;
  surgeryDate?: string;
  status: RehabStatus;
  statusLabel: string;
}

export interface TherapistComment {
  id: string;
  patientId: string;
  therapistId: string;
  content: string;
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  bodyPart: BodyPart;
  defaultReps: number;
  defaultSets: number;
}

export interface PrescribedExercise {
  exerciseId: string;
  targetReps: number;
  targetSets: number;
}

export interface Prescription {
  id: string;
  patientId: string;
  therapistId: string;
  exercises: PrescribedExercise[];
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface ExerciseLog {
  id: string;
  patientId: string;
  exerciseId: string;
  date: string;
  actualReps: number;
  actualSets: number;
  painScore: number;
  difficulty: Difficulty;
  memo?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface PatientStats {
  completionRate: number;
  avgPainScore: number;
  attentionLevel: AttentionLevel;
  streak: number;
}
