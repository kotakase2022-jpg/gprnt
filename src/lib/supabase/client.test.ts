import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLazySupabaseClient,
  readSupabasePublicConfig,
  resetLazySupabaseClientForTests,
  SupabaseConfigurationError,
} from "./client";

const base64Url = (value: string): string =>
  btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

describe("lazy Supabase public client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetLazySupabaseClientForTests();
  });

  it("prefers the current publishable key and supports the legacy anon fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_publishable_current",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "legacy-anon");
    expect(readSupabasePublicConfig()).toEqual({
      url: "https://demo.supabase.co",
      publishableKey: "sb_publishable_current",
    });

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(readSupabasePublicConfig()?.publishableKey).toBe("legacy-anon");
  });

  it("rejects secret and service-role keys before client creation", () => {
    expect(() =>
      getLazySupabaseClient({
        url: "https://demo.supabase.co",
        publishableKey: "sb_secret_example",
      }),
    ).toThrowError(SupabaseConfigurationError);
    const serviceRoleJwt = `${base64Url('{"alg":"none"}')}.${base64Url('{"role":"service_role"}')}.signature`;
    expect(() =>
      getLazySupabaseClient({
        url: "https://demo.supabase.co",
        publishableKey: serviceRoleJwt,
      }),
    ).toThrowError(/service-role/);
  });

  it("requires HTTPS outside local development", () => {
    expect(() =>
      getLazySupabaseClient({
        url: "http://example.com",
        publishableKey: "sb_publishable_demo",
      }),
    ).toThrowError(/HTTPS/);
  });
});
