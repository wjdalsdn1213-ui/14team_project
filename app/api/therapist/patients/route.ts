import { fail, ok } from "@/lib/api/response";
import { requireProfile } from "@/lib/auth/session";

export async function GET() {
  try {
    const { profile, supabase } = await requireProfile();

    if (profile.role !== "therapist") {
      return fail("Forbidden", 403);
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*, patient_profiles(*)")
      .eq("therapist_id", profile.id)
      .eq("role", "patient")
      .order("name");

    if (error) {
      return fail("Failed to load therapist patients", 500, error.message);
    }

    return ok({ patients: data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}
