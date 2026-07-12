import { USER_ROLES, type UserRole } from "@/domain";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Only Supabase-controlled app_metadata is accepted as an authenticated role. */
export function readTrustedAppRole(appMetadata: unknown): UserRole | null {
  if (!isRecord(appMetadata) || typeof appMetadata.role !== "string") {
    return null;
  }

  return USER_ROLES.includes(appMetadata.role as UserRole)
    ? (appMetadata.role as UserRole)
    : null;
}
