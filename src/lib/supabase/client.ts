import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export class SupabaseConfigurationError extends Error {
  readonly code: "MISSING_PUBLIC_CONFIG" | "SECRET_KEY_EXPOSED" | "INVALID_URL";

  constructor(code: SupabaseConfigurationError["code"], message: string) {
    super(message);
    this.name = "SupabaseConfigurationError";
    this.code = code;
  }
}

let browserClient: SupabaseClient | undefined;
let browserClientFingerprint: string | undefined;

function decodeJwtRole(key: string): string | undefined {
  const segments = key.split(".");
  if (segments.length !== 3 || !segments[1]) return undefined;
  try {
    if (typeof globalThis.atob !== "function") return undefined;
    const base64 = segments[1].replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payloadText = globalThis.atob(padded);
    const payload: unknown = JSON.parse(payloadText);
    if (typeof payload === "object" && payload !== null && "role" in payload) {
      const role = (payload as { role?: unknown }).role;
      return typeof role === "string" ? role : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function validatePublicConfig(config: SupabasePublicConfig): void {
  let parsed: URL;
  try {
    parsed = new URL(config.url);
  } catch {
    throw new SupabaseConfigurationError(
      "INVALID_URL",
      "NEXT_PUBLIC_SUPABASE_URL must be a valid URL.",
    );
  }
  if (
    parsed.protocol !== "https:" &&
    parsed.hostname !== "localhost" &&
    parsed.hostname !== "127.0.0.1"
  ) {
    throw new SupabaseConfigurationError(
      "INVALID_URL",
      "Supabase must use HTTPS except for a local development host.",
    );
  }
  if (
    config.publishableKey.startsWith("sb_secret_") ||
    decodeJwtRole(config.publishableKey) === "service_role"
  ) {
    throw new SupabaseConfigurationError(
      "SECRET_KEY_EXPOSED",
      "A secret/service-role key must never be used by the public Supabase client.",
    );
  }
}

export function readSupabasePublicConfig(): SupabasePublicConfig | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !publishableKey) return undefined;
  return { url, publishableKey };
}

export function isSupabasePublicConfigAvailable(): boolean {
  return Boolean(readSupabasePublicConfig());
}

/** The SDK is instantiated only when a repository operation explicitly asks for it. */
export function getLazySupabaseClient(
  config = readSupabasePublicConfig(),
): SupabaseClient {
  if (!config) {
    throw new SupabaseConfigurationError(
      "MISSING_PUBLIC_CONFIG",
      "Supabase public configuration is absent. Use DemoRepository or provide public URL and publishable key.",
    );
  }
  validatePublicConfig(config);
  const fingerprint = `${config.url}\u0000${config.publishableKey}`;
  if (!browserClient || browserClientFingerprint !== fingerprint) {
    browserClient = createClient(config.url, config.publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: typeof window !== "undefined",
        detectSessionInUrl: typeof window !== "undefined",
      },
    });
    browserClientFingerprint = fingerprint;
  }
  return browserClient;
}

export function resetLazySupabaseClientForTests(): void {
  browserClient = undefined;
  browserClientFingerprint = undefined;
}
