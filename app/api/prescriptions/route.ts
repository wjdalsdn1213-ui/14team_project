import { fail, ok } from "@/lib/api/response";
import { requireProfile } from "@/lib/auth/session";
import { createPrescriptionSchema } from "@/lib/validations/prescriptions";

export async function POST(request: Request) {
  try {
    const { profile, supabase } = await requireProfile();

    if (profile.role !== "therapist") {
      return fail("Forbidden", 403);
    }

    const body = await request.json();
    const parsed = createPrescriptionSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Invalid request body", 400, parsed.error.flatten());
    }

    const { data: prescription, error: prescriptionError } = await supabase
      .from("prescriptions")
      .insert({
        patient_id: parsed.data.patientId,
        therapist_id: profile.id,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select("*")
      .single();

    if (prescriptionError || !prescription) {
      return fail("Failed to create prescription", 500, prescriptionError?.message);
    }

    const exerciseRows = parsed.data.exercises.map((exercise, index) => ({
      prescription_id: prescription.id,
      exercise_id: exercise.exerciseId,
      target_reps: exercise.targetReps,
      target_sets: exercise.targetSets,
      sort_order: index,
    }));

    const { data: exercises, error: exerciseError } = await supabase
      .from("prescription_exercises")
      .insert(exerciseRows)
      .select("*");

    if (exerciseError) {
      return fail("Prescription created but exercises failed", 500, exerciseError.message);
    }

    return ok({ prescription, exercises }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}
