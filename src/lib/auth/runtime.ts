export type PublicRuntimeMode = "demo" | "supabase" | "misconfigured";

export interface PublicRuntimeConfig {
  demoMode?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  supabaseAnonKey?: string;
}

/**
 * Demo access is intentionally controlled by the explicit public mode flag.
 * If Demo Mode is disabled, missing Supabase configuration must fail closed.
 */
export function resolvePublicRuntimeMode(
  config: PublicRuntimeConfig,
): PublicRuntimeMode {
  if (config.demoMode !== "false") return "demo";

  const publicKey =
    config.supabasePublishableKey?.trim() || config.supabaseAnonKey?.trim();
  return config.supabaseUrl?.trim() && publicKey ? "supabase" : "misconfigured";
}

export function getPublicRuntimeMode(): PublicRuntimeMode {
  // NEXT_PUBLIC values must remain direct property references so Next.js can
  // inline them into browser bundles at build time.
  return resolvePublicRuntimeMode({
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
