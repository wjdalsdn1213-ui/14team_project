import { z } from "zod";

export const sendMessageSchema = z.object({
  receiverId: z.string().uuid(),
  content: z.string().trim().min(1).max(5000),
});
