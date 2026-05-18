import { fail, ok } from "@/lib/api/response";
import { requireProfile } from "@/lib/auth/session";
import { createTherapistCommentSchema } from "@/lib/validations/comments";

interface Context {
  params: {
    patientId: string;
  };
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { profile, supabase } = await requireProfile();

    if (profile.role !== "therapist") {
      return fail("Forbidden", 403);
    }

    const { data, error } = await supabase
      .from("therapist_comments")
      .select("*")
      .eq("patient_id", params.patientId)
      .eq("therapist_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      return fail("Failed to load comments", 500, error.message);
    }

    return ok({ comments: data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { profile, supabase } = await requireProfile();

    if (profile.role !== "therapist") {
      return fail("Forbidden", 403);
    }

    const body = await request.json();
    const parsed = createTherapistCommentSchema.safeParse({
      ...body,
      patientId: params.patientId,
    });

    if (!parsed.success) {
      return fail("Invalid request body", 400, parsed.error.flatten());
    }

    const { data, error } = await supabase
      .from("therapist_comments")
      .insert({
        patient_id: parsed.data.patientId,
        therapist_id: profile.id,
        content: parsed.data.content,
      })
      .select("*")
      .single();

    if (error) {
      return fail("Failed to create comment", 500, error.message);
    }

    return ok({ comment: data }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}
