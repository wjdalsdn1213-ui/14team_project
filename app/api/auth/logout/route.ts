import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/api/response";

export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return fail("Logout failed", 500, error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Logout failed", 500);
  }
}
