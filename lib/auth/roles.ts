import type { UserRole } from "@/types/domain";

export function isPatient(role: UserRole) {
  return role === "patient";
}

export function isTherapist(role: UserRole) {
  return role === "therapist";
}
