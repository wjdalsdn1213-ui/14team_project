import { fail, ok } from "@/lib/api/response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validations/auth";

function getInitials(name: string) {
  const trimmed = name.trim();
  return Array.from(trimmed).slice(0, 2).join("").toUpperCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Invalid request body", 400, parsed.error.flatten());
    }

    const { name, email, password, role } = parsed.data;

    if (role !== "patient") {
      return fail("Therapist signup is not available on the public endpoint", 403);
    }

    const supabase = createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });

    if (error) {
      return fail(error.message, 400);
    }

    if (!data.user) {
      return fail("Failed to create auth user", 500);
    }

    const { error: profileError } = await adminSupabase.from("profiles").insert({
      id: data.user.id,
      role,
      name,
      email,
      avatar_initials: getInitials(name),
      therapist_id: null,
    });

    if (profileError) {
      return fail(profileError.message, 400);
    }

    const today = new Date().toISOString().slice(0, 10);
    const { error: patientProfileError } = await adminSupabase.from("patient_profiles").insert({
      patient_id: data.user.id,
      diagnosis: "Pending intake",
      injury_date: today,
      surgery_date: null,
      rehab_status: "maintenance",
      status_label: "New signup",
    });

    if (patientProfileError) {
      return fail(patientProfileError.message, 400);
    }

    return ok(
      {
        success: true,
        user: {
          id: data.user.id,
          email,
          name,
          role,
        },
      },
      201,
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Signup failed", 500);
  }
}
