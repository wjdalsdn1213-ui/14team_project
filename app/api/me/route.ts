import { ok, fail } from "@/lib/api/response";
import { requireProfile } from "@/lib/auth/session";

export async function GET() {
  try {
    const { profile, supabase } = await requireProfile();

    if (profile.role !== "patient") {
      return ok({ profile });
    }

    const { data: patientProfile, error } = await supabase
      .from("patient_profiles")
      .select("*")
      .eq("patient_id", profile.id)
      .maybeSingle();

    if (error) {
      return fail("Failed to load patient profile", 500, error.message);
    }

    return ok({ profile, patientProfile });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}
