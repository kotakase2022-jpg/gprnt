import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MetricValue } from "@/domain/types";
import { DemoRepository } from "./demo-repository";
import { SupabaseRepository } from "./supabase-repository";
import { SupabaseSchemaAdapter } from "./supabase-schema-adapter";

describe("SupabaseRepository", () => {
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

  it("keeps operations outside the reviewed metric slice fail-closed", async () => {
    const repository = new SupabaseRepository({
      getClient: () => ({}) as SupabaseClient,
    });
    await expect(repository.listDisclosureResponses()).rejects.toMatchObject({
      code: "UNSUPPORTED_OPERATION",
      operation: "listDisclosureResponses",
    });
  });

  it("returns the atomic command result without a post-commit reread", async () => {
    const from = vi.fn(() => {
      throw new Error("post-commit query must not run");
    });
    const metricCommandTransport = {
      saveManualMetricValue: vi.fn().mockResolvedValue({
        id: "d1000000-0000-4000-8000-000000000001",
        company_id: "c1111111-1111-4111-8111-111111111111",
        metric_id: "a1000000-0000-4000-8000-000000000001",
        reporting_period_id: "11000000-0000-4000-8000-000000002025",
        value_json: 123,
        original_value: "123",
        normalized_value: 123,
        unit: "tCO2e",
        original_unit: "tCO2e",
        consolidation_scope: "連結",
        organizational_boundary: "国内外連結子会社",
        source_type: "manual",
        source_system: "manual_entry",
        source_record_id: "manual:a1000000-0000-4000-8000-000000000001",
        source_document: null,
        imported_at: "2026-07-12T00:00:00.000Z",
        last_updated_at: "2026-07-12T00:00:00.000Z",
        confidence_level: "medium",
        verification_status: "unverified",
        owner_user_id: null,
        reviewer_user_id: null,
        change_reason: "月次確定値への手動補正",
        created_at: "2026-07-12T00:00:00.000Z",
        manual_override: true,
        version: 1,
        metrics: {
          id: "a1000000-0000-4000-8000-000000000001",
          metric_code: "GHG_SCOPE_1",
          name: "Scope 1排出量",
          description: "直接排出",
          category: "ghg",
          value_type: "number",
          canonical_unit: "tCO2e",
          allowed_units: ["tCO2e"],
          is_required: true,
          is_sensitive: false,
          terrast_field_key: null,
        },
        reporting_periods: { label: "FY2025" },
      }),
    };
    const adapter = new SupabaseSchemaAdapter(
      { from } as unknown as SupabaseClient,
      { metricCommandTransport },
    );

    const saved = await adapter.upsertMetricValue({
      evidenceIds: ["evidence-1"],
    } as MetricValue);

    expect(saved.evidenceIds).toEqual(["evidence-1"]);
    expect(from).not.toHaveBeenCalled();
  });
});
