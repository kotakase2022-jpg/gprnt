import type { UserRole } from "@/domain";
import type { PublicRuntimeMode } from "./runtime";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("認証セッションを確認できません。再ログインしてください。");
    this.name = "AuthenticationRequiredError";
  }
}

export function buildAuthenticatedJsonHeaders({
  mode,
  role,
  accessToken,
}: {
  mode: PublicRuntimeMode;
  role: UserRole;
  accessToken: string | null;
}): Record<string, string> {
  if (mode === "demo") {
    return {
      "content-type": "application/json",
      "x-demo-role": role,
    };
  }

  if (
    mode !== "supabase" ||
    !accessToken?.trim() ||
    /[\r\n]/.test(accessToken)
  ) {
    throw new AuthenticationRequiredError();
  }

  return {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
  };
}
