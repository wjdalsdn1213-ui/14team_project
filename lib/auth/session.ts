import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireSession() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("requireSession failed", {
      error: error?.message ?? null,
      hasUser: Boolean(user),
    });
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}

export async function requireProfile() {
  const { supabase, user } = await requireSession();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    console.error("requireProfile failed", {
      userId: user.id,
      userEmail: user.email,
      error: error?.message ?? null,
      code: error?.code ?? null,
      details: error?.details ?? null,
      hint: error?.hint ?? null,
      profile,
    });
    throw new Error("Profile not found");
  }

  return { supabase, user, profile };
}
