import { DemoRepository, type DemoRepositoryOptions } from "./demo-repository";
import {
  SupabaseRepository,
  type SupabaseRepositoryOptions,
} from "./supabase-repository";
import type { SustainabilityRepository } from "./repository";

export * from "./repository";
export * from "./demo-repository";
export * from "./supabase-repository";

export interface CreateRepositoryOptions {
  mode?: "demo" | "supabase";
  demo?: DemoRepositoryOptions;
  supabase?: SupabaseRepositoryOptions;
}

export function createRepository(
  options: CreateRepositoryOptions = {},
): SustainabilityRepository {
  const configuredMode =
    options.mode ??
    (process.env.NEXT_PUBLIC_DEMO_MODE === "false" &&
    options.supabase?.delegateFactory
      ? "supabase"
      : "demo");
  if (configuredMode === "supabase")
    return new SupabaseRepository(options.supabase);
  return new DemoRepository(options.demo);
}
