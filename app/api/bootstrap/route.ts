/* eslint-disable @typescript-eslint/no-explicit-any */
// ... 기존 코드 시작 (import 등)

import { fail, ok } from "@/lib/api/response";
import { requireProfile } from "@/lib/auth/session";

function toUser(profile: any) {
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    email: profile.email,
    password: "",
    avatarInitials: profile.avatar_initials ?? "",
    therapistId: profile.therapist_id ?? undefined,
  };
}

function toPatientProfile(profile: any) {
  return {
    patientId: profile.patient_id,
    diagnosis: profile.diagnosis,
    injuryDate: profile.injury_date,
    surgeryDate: profile.surgery_date ?? undefined,
    status: profile.rehab_status,
    statusLabel: profile.status_label ?? "",
  };
}

function toLog(log: any) {
  return {
    id: log.id,
    patientId: log.patient_id,
    exerciseId: log.exercise_id,
    date: log.log_date,
    actualReps: log.actual_reps,
    actualSets: log.actual_sets,
    painScore: log.pain_score,
    difficulty: log.difficulty,
    memo: log.memo ?? undefined,
  };
}

function toPrescription(prescription: any) {
  return {
    id: prescription.id,
    patientId: prescription.patient_id,
    therapistId: prescription.therapist_id,
    startDate: prescription.start_date,
    endDate: prescription.end_date ?? undefined,
    notes: prescription.notes ?? undefined,
    exercises: (prescription.prescription_exercises ?? []).map((exercise: any) => ({
      exerciseId: exercise.exercise_id,
      targetReps: exercise.target_reps,
      targetSets: exercise.target_sets,
    })),
  };
}

function toMessage(message: any) {
  return {
    id: message.id,
    senderId: message.sender_id,
    receiverId: message.receiver_id,
    content: message.content,
    timestamp: message.sent_at,
    read: Boolean(message.read_at),
  };
}

function toComment(comment: any) {
  return {
    id: comment.id,
    patientId: comment.patient_id,
    therapistId: comment.therapist_id,
    content: comment.content,
    createdAt: comment.created_at,
  };
}

export async function GET() {
  try {
    const { profile, supabase } = await requireProfile();

    const [
      profilesResult,
      patientProfilesResult,
      prescriptionsResult,
      logsResult,
      messagesResult,
      commentsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("name"),
      supabase.from("patient_profiles").select("*"),
      supabase
        .from("prescriptions")
        .select("*, prescription_exercises(*)")
        .order("start_date", { ascending: false }),
      supabase
        .from("exercise_logs")
        .select("*")
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("messages")
        .select("*")
        .order("sent_at", { ascending: true }),
      supabase
        .from("therapist_comments")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const errors = [
      profilesResult.error,
      patientProfilesResult.error,
      prescriptionsResult.error,
      logsResult.error,
      messagesResult.error,
      commentsResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      return fail(
        "Failed to load bootstrap data",
        500,
        errors.map((error) => error?.message),
      );
    }

    return ok({
      currentUser: toUser(profile),
      users: (profilesResult.data ?? []).map(toUser),
      profiles: (patientProfilesResult.data ?? []).map(toPatientProfile),
      prescriptions: (prescriptionsResult.data ?? []).map(toPrescription),
      logs: (logsResult.data ?? []).map(toLog),
      messages: (messagesResult.data ?? []).map(toMessage),
      comments: (commentsResult.data ?? []).map(toComment),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}
