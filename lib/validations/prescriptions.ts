import { z } from "zod";

export const prescriptionExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  targetReps: z.number().int().positive(),
  targetSets: z.number().int().positive(),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string().optional(),
  notes: z.string().trim().optional(),
  exercises: z.array(prescriptionExerciseSchema).min(1),
});

export const addPrescriptionExercisesSchema = z.object({
  exercises: z.array(prescriptionExerciseSchema).min(1),
});
