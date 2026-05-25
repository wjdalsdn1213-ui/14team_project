import { fail, ok } from "@/lib/api/response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });

    if (error) {
      return fail(error.message, 400);
    }

    if (!data.user) {
      return fail("Failed to create auth user", 500);
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      role,
      name,
      email,
      avatar_initials: getInitials(name),
      therapist_id: null,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return fail(profileError.message, 400);
    }

    if (role === "patient") {
      const today = new Date().toISOString().slice(0, 10);
      const { error: patientProfileError } = await admin.from("patient_profiles").insert({
        patient_id: data.user.id,
        diagnosis: "등록 대기",
        injury_date: today,
        surgery_date: null,
        rehab_status: "maintenance",
        status_label: "신규 등록",
      });

      if (patientProfileError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return fail(patientProfileError.message, 400);
      }
    }

    return ok({
      success: true,
      user: {
        id: data.user.id,
        email,
        name,
        role,
      },
    }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Signup failed", 500);
  }
}
