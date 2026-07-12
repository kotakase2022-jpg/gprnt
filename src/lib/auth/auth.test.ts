import { describe, expect, it } from "vitest";
import { buildAuthenticatedJsonHeaders } from "./request-headers";
import { readTrustedAppRole } from "./roles";
import { appHomeForRole, canAccessAppPath } from "./route-access";
import { resolvePublicRuntimeMode } from "./runtime";

describe("public auth runtime", () => {
  it("keeps the default and explicit demo configurations in Demo Mode", () => {
    expect(resolvePublicRuntimeMode({})).toBe("demo");
    expect(resolvePublicRuntimeMode({ demoMode: "true" })).toBe("demo");
  });

  it("enables Supabase only with an explicit flag and complete public config", () => {
    expect(
      resolvePublicRuntimeMode({
        demoMode: "false",
        supabaseUrl: "https://project.supabase.co",
        supabasePublishableKey: "sb_publishable_example",
      }),
    ).toBe("supabase");
    expect(
      resolvePublicRuntimeMode({
        demoMode: "false",
        supabaseUrl: "https://project.supabase.co",
      }),
    ).toBe("misconfigured");
  });
});

describe("trusted Supabase role", () => {
  it("accepts only known roles from app_metadata", () => {
    expect(readTrustedAppRole({ role: "reviewer_approver" })).toBe(
      "reviewer_approver",
    );
    expect(readTrustedAppRole({ role: "owner" })).toBeNull();
    expect(readTrustedAppRole(null)).toBeNull();
  });

  it("does not treat user_metadata as an authorization source", () => {
    expect(
      readTrustedAppRole({ user_metadata: { role: "system_admin" } }),
    ).toBeNull();
  });
});

describe("authenticated request headers", () => {
  it("uses only the demo role header in Demo Mode", () => {
    expect(
      buildAuthenticatedJsonHeaders({
        mode: "demo",
        role: "company_admin",
        accessToken: null,
      }),
    ).toEqual({
      "content-type": "application/json",
      "x-demo-role": "company_admin",
    });
  });

  it("uses only a Bearer session token in Supabase mode", () => {
    expect(
      buildAuthenticatedJsonHeaders({
        mode: "supabase",
        role: "company_admin",
        accessToken: "session-token",
      }),
    ).toEqual({
      authorization: "Bearer session-token",
      "content-type": "application/json",
    });
    expect(() =>
      buildAuthenticatedJsonHeaders({
        mode: "supabase",
        role: "company_admin",
        accessToken: null,
      }),
    ).toThrow(/再ログイン/);
  });
});

describe("route-level role access", () => {
  it("keeps privileged routes limited to their domain roles", () => {
    expect(
      canAccessAppPath("platform_operator_demo_admin", "/app/operator"),
    ).toBe(true);
    expect(canAccessAppPath("company_admin", "/app/operator")).toBe(false);
    expect(canAccessAppPath("preparer", "/app/assistant")).toBe(true);
    expect(canAccessAppPath("reviewer_approver", "/app/assistant")).toBe(false);
    expect(canAccessAppPath("reviewer_approver", "/app/review/queue")).toBe(
      true,
    );
    expect(canAccessAppPath("preparer", "/app/review")).toBe(false);
  });

  it("restricts supplier users to the supplier surface", () => {
    expect(canAccessAppPath("supplier_user", "/app/suppliers")).toBe(true);
    expect(canAccessAppPath("supplier_user", "/app/dashboard")).toBe(false);
    expect(appHomeForRole("supplier_user")).toBe("/app/suppliers");
  });
});
