import { fail, ok } from "@/lib/api/response";
import { requireProfile } from "@/lib/auth/session";
import { createExerciseLogSchema } from "@/lib/validations/logs";

export async function GET() {
  try {
    const { profile, supabase } = await requireProfile();

    if (profile.role !== "patient") {
      return fail("Forbidden", 403);
    }

    const { data, error } = await supabase
      .from("exercise_logs")
      .select("*")
      .eq("patient_id", profile.id)
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return fail("Failed to load exercise logs", 500, error.message);
    }

    return ok({ logs: data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}

export async function POST(request: Request) {
  try {
    const { profile, supabase } = await requireProfile();

    if (profile.role !== "patient") {
      return fail("Forbidden", 403);
    }

    const body = await request.json();
    const parsed = createExerciseLogSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Invalid request body", 400, parsed.error.flatten());
    }

    const payload = {
      patient_id: profile.id,
      exercise_id: parsed.data.exerciseId,
      prescription_id: parsed.data.prescriptionId ?? null,
      log_date: parsed.data.logDate,
      actual_reps: parsed.data.actualReps,
      actual_sets: parsed.data.actualSets,
      pain_score: parsed.data.painScore,
      difficulty: parsed.data.difficulty,
      memo: parsed.data.memo ?? null,
    };

    const { data, error } = await supabase
      .from("exercise_logs")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return fail("Failed to create exercise log", 500, error.message);
    }

    return ok({ log: data }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}
