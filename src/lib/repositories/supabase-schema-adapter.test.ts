import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseSchemaAdapter } from "./supabase-schema-adapter";

const organizationId = "11111111-1111-4111-8111-111111111111";

function metricRow(
  scope: string | null,
  valueType: "number" | "text" = "number",
) {
  return {
    id: scope
      ? "a2000000-0000-4000-8000-000000000001"
      : "a1000000-0000-4000-8000-000000000001",
    organization_id: scope,
    metric_code: "CUSTOM_METRIC",
    name: scope ? "テナント定義" : "グローバル定義",
    description: "テスト指標",
    category: "environment",
    value_type: valueType,
    canonical_unit: valueType === "number" ? "percent" : null,
    allowed_units: valueType === "number" ? ["percent"] : [],
    is_required: false,
    is_sensitive: false,
    terrast_field_key: null,
  };
}

describe("Supabase schema adapter query contracts", () => {
  it("hints ambiguous PostgREST relationships explicitly", async () => {
    const selects: string[] = [];
    const query = {
      select: vi.fn((columns: string) => {
        selects.push(columns);
        return query;
      }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
    };
    const adapter = new SupabaseSchemaAdapter({
      from: vi.fn(() => query),
    } as unknown as SupabaseClient);

    await adapter.listCompanies();
    await adapter.listMetricValues();

    expect(selects[0]).toContain(
      "company_sharing_consents:company_sharing_consents!company_sharing_consents_company_tenant_fkey",
    );
    expect(selects[1]).toContain(
      "reporting_periods:reporting_periods!metric_values_period_tenant_fkey",
    );
  });

  it("scopes the catalog and lets the selected tenant override a global code", async () => {
    const or = vi.fn(() => query);
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      neq: vi.fn(() => query),
      is: vi.fn(() => query),
      or,
      order: vi.fn().mockResolvedValue({
        data: [metricRow(null, "number"), metricRow(organizationId, "text")],
        error: null,
      }),
    };
    const adapter = new SupabaseSchemaAdapter({
      from: vi.fn(() => query),
    } as unknown as SupabaseClient);

    const catalog = await adapter.listMetrics(organizationId);

    expect(or).toHaveBeenCalledWith(
      `organization_id.is.null,organization_id.eq.${organizationId}`,
    );
    expect(catalog).toHaveLength(1);
    expect(catalog[0]).toMatchObject({
      id: "a2000000-0000-4000-8000-000000000001",
      code: "CUSTOM_METRIC",
      name: "テナント定義",
      valueType: "text",
    });
  });
});
