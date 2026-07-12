import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  readSupabasePublicConfig,
  validateSupabasePublicConfig,
} from "./client";

export class SupabaseServerConfigurationError extends Error {
  readonly code: "PUBLIC_CONFIG_MISSING" | "SERVER_SECRET_MISSING";

  constructor(code: SupabaseServerConfigurationError["code"], message: string) {
    super(message);
    this.name = "SupabaseServerConfigurationError";
    this.code = code;
  }
}

export function extractBearerToken(value: string | null): string | null {
  if (!value?.startsWith("Bearer ")) return null;
  const token = value.slice(7).trim();
  return token && !/\s/.test(token) ? token : null;
}

function publicConfig() {
  const config = readSupabasePublicConfig();
  if (!config)
    throw new SupabaseServerConfigurationError(
      "PUBLIC_CONFIG_MISSING",
      "Supabase public server configuration is absent.",
    );
  validateSupabasePublicConfig(config);
  return config;
}

export function createUserScopedSupabaseClient(token: string): SupabaseClient {
  const config = publicConfig();
  return createClient(config.url, config.publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function readSupabaseServerSecret(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    undefined
  );
}

export function createServiceSupabaseClient(): SupabaseClient {
  const config = publicConfig();
  const secret = readSupabaseServerSecret();
  if (!secret)
    throw new SupabaseServerConfigurationError(
      "SERVER_SECRET_MISSING",
      "Supabase server secret is absent.",
    );
  return createClient(config.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
