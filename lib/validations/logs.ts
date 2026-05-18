import { z } from "zod";

export const createExerciseLogSchema = z.object({
  exerciseId: z.string().uuid(),
  prescriptionId: z.string().uuid().optional(),
  logDate: z.string(),
  actualReps: z.number().int().positive(),
  actualSets: z.number().int().positive(),
  painScore: z.number().int().min(0).max(10),
  difficulty: z.enum(["easy", "medium", "hard"]),
  memo: z.string().trim().max(2000).optional(),
});
