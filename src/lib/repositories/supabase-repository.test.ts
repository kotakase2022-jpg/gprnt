import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DemoRepository } from "./demo-repository";
import { SupabaseRepository } from "./supabase-repository";

describe("SupabaseRepository skeleton", () => {
  it("does not create a client until the first operation and then reuses its delegate", async () => {
    const getClient = vi.fn(() => ({}) as SupabaseClient);
    const delegateFactory = vi.fn(() => new DemoRepository({ storage: null }));
    const repository = new SupabaseRepository({ getClient, delegateFactory });
    expect(getClient).not.toHaveBeenCalled();
    await repository.listCompanies();
    await repository.listMetrics();
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(delegateFactory).toHaveBeenCalledTimes(1);
  });

  it("reports the unconfirmed schema boundary instead of guessing table mappings", async () => {
    const repository = new SupabaseRepository({
      getClient: () => ({}) as SupabaseClient,
    });
    await expect(repository.listCompanies()).rejects.toMatchObject({
      code: "SCHEMA_ADAPTER_REQUIRED",
    });
  });
});
