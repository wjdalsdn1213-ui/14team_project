import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/api/response";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return fail("Invalid request body", 400, parsed.error.flatten());
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return fail("Invalid email or password", 401, error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Login failed", 500);
  }
}
