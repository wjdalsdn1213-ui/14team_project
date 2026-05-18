import { fail, ok } from "@/lib/api/response";
import { requireProfile } from "@/lib/auth/session";
import { sendMessageSchema } from "@/lib/validations/messages";

interface Context {
  params: {
    otherUserId: string;
  };
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { profile, supabase } = await requireProfile();

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${profile.id},receiver_id.eq.${params.otherUserId}),and(sender_id.eq.${params.otherUserId},receiver_id.eq.${profile.id})`,
      )
      .order("sent_at", { ascending: true });

    if (error) {
      return fail("Failed to load messages", 500, error.message);
    }

    return ok({ messages: data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { profile, supabase } = await requireProfile();
    const body = await request.json();
    const parsed = sendMessageSchema.safeParse({
      ...body,
      receiverId: params.otherUserId,
    });

    if (!parsed.success) {
      return fail("Invalid request body", 400, parsed.error.flatten());
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: profile.id,
        receiver_id: parsed.data.receiverId,
        content: parsed.data.content,
      })
      .select("*")
      .single();

    if (error) {
      return fail("Failed to send message", 500, error.message);
    }

    return ok({ message: data }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unauthorized", 401);
  }
}
