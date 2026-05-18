import { fail, ok } from "@/lib/api/response";
import { requireProfile } from "@/lib/auth/session";
import { addPrescriptionExercisesSchema } from "@/lib/validations/prescriptions";

interface Context {
  params: {
    prescriptionId: string;
  };
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { profile, supabase } = await requireProfile();

    if (profile.role !== "therapist") {
      return fail("Forbidden", 403);
    }

    const body = await request.json();
    const parsed = addPrescriptionExercisesSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Invalid request body", 400, parsed.error.flatten());
    }

    const rows = parsed.data.exercises.map((exercise, index) => ({
      prescription_id: params.prescriptionId,
      exercise_id: exercise.exerciseId,
      target_reps: exercise.targetReps,
      target_sets: exercise.targetSets,
      sort_order: index,
    }));

    const { data, error } = await supabase
      .from("prescription_exercises")
      .insert(rows)
      .select("*");

    if (error) {
      return fail("Failed to add prescription exercises", 500, error.message);
    }

    return ok({ exercises: data }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}
