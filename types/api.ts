import type {
  Exercise,
  PatientProfile,
  Profile,
  SendMessageInput,
  TherapistCommentInput,
} from "./domain";

export interface ApiErrorShape {
  error: string;
  details?: unknown;
}

export interface SessionUserResponse {
  profile: Profile;
  patientProfile?: PatientProfile;
}

export interface PatientListItem {
  profile: Profile;
  patientProfile?: PatientProfile;
  completionRate: number;
  avgPainScore: number;
  streak: number;
  unreadCount?: number;
}

export interface CreatePrescriptionRequest {
  patientId: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  exercises: Array<{
    exerciseId: string;
    targetReps: number;
    targetSets: number;
  }>;
}

export interface AddPrescriptionExercisesRequest {
  exercises: CreatePrescriptionRequest["exercises"];
}

export interface CreateExerciseLogRequest {
  exerciseId: string;
  prescriptionId?: string;
  logDate: string;
  actualReps: number;
  actualSets: number;
  painScore: number;
  difficulty: "easy" | "medium" | "hard";
  memo?: string;
}

export interface CreateTherapistCommentRequest extends TherapistCommentInput {}

export interface SendMessageRequest extends SendMessageInput {}

export interface ExerciseListResponse {
  exercises: Exercise[];
}
