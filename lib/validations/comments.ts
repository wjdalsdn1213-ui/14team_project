import { z } from "zod";

export const createTherapistCommentSchema = z.object({
  patientId: z.string().uuid(),
  content: z.string().trim().min(1).max(5000),
});
