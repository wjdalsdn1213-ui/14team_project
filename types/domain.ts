export type UserRole = "patient" | "therapist";
export type Difficulty = "easy" | "medium" | "hard";
export type BodyPart = "shoulder" | "knee" | "back" | "hip" | "ankle";
export type RehabStatus = "acute" | "subacute" | "chronic" | "maintenance";

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  avatarInitials: string | null;
  therapistId: string | null;
}

export interface PatientProfile {
  patientId: string;
  diagnosis: string;
  injuryDate: string;
  surgeryDate: string | null;
  rehabStatus: RehabStatus;
  statusLabel: string | null;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  bodyPart: BodyPart;
  defaultReps: number;
  defaultSets: number;
}

export interface PrescriptionExerciseInput {
  exerciseId: string;
  targetReps: number;
  targetSets: number;
}

export interface ExerciseLogInput {
  exerciseId: string;
  prescriptionId?: string;
  logDate: string;
  actualReps: number;
  actualSets: number;
  painScore: number;
  difficulty: Difficulty;
  memo?: string;
}

export interface TherapistCommentInput {
  patientId: string;
  content: string;
}

export interface SendMessageInput {
  receiverId: string;
  content: string;
}
