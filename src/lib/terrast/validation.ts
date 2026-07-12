import { UNITS, type ConfidenceLevel, type Unit } from "@/domain/types";

export const CONFIDENCE_LEVELS = [
  "low",
  "medium",
  "high",
] as const satisfies readonly ConfidenceLevel[];

export function isUnit(value: string): value is Unit {
  return (UNITS as readonly string[]).includes(value);
}

export function isConfidenceLevel(value: string): value is ConfidenceLevel {
  return (CONFIDENCE_LEVELS as readonly string[]).includes(value);
}
