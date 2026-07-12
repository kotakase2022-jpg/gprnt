import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { createMetricValuePostHandler } from "./route";

const ids = {
  user: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  organization: "11111111-1111-4111-8111-111111111111",
  company: "c1111111-1111-4111-8111-111111111111",
  period: "11000000-0000-4000-8000-000000002025",
  metric: "a1000000-0000-4000-8000-000000000001",
  value: "d1000000-0000-4000-8000-000000000001",
};

type QueryResult = { data: unknown; error: null | { code: string } };

class FakeQuery {
  constructor(private readonly result: QueryResult) {}
  select() {
    return this;
  }
  eq() {
    return this;
  }
  is() {
    return this;
  }
  limit() {
    return Promise.resolve(this.result);
  }
  maybeSingle() {
    return Promise.resolve(this.result);
  }
}

function userClient(
  options: { membership?: boolean; valueType?: string } = {},
) {
  const membership = options.membership ?? true;
  const valueType = options.valueType ?? "number";
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: ids.user,
            app_metadata: { role: "preparer" },
          },
        },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      const result: QueryResult =
        table === "companies"
          ? {
              data: { id: ids.company, organization_id: ids.organization },
              error: null,
            }
          : table === "organization_members"
            ? { data: membership ? [{ id: "membership" }] : [], error: null }
            : table === "reporting_periods"
              ? { data: { id: ids.period }, error: null }
              : table === "metrics"
                ? {
                    data: {
                      id: ids.metric,
                      organization_id: ids.organization,
                      value_type: valueType,
                      canonical_unit: "tCO2e",
                      allowed_units: ["tCO2e"],
                    },
                    error: null,
                  }
                : table === "metric_values"
                  ? { data: { id: ids.value }, error: null }
                  : { data: null, error: { code: "unexpected_table" } };
      return new FakeQuery(result);
    }),
  } as unknown as SupabaseClient;
}

function request(overrides: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/workspace/metric-values", {
    method: "POST",
    headers: {
      authorization: "Bearer user-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      companyId: ids.company,
      reportingPeriodId: ids.period,
      metricCode: "GHG_SCOPE_1",
      value: 123,
      unit: "tCO2e",
      consolidationScope: "連結",
      organizationalBoundary: "国内外連結子会社",
      changeReason: "月次確定値への手動補正",
      expectedVersion: 0,
      ...overrides,
    }),
  });
}

function savedMetricRow() {
  return {
    id: ids.value,
    company_id: ids.company,
    metric_id: ids.metric,
    reporting_period_id: ids.period,
    value_json: 123,
    original_value: "123",
    normalized_value: 123,
    unit: "tCO2e",
    original_unit: "tCO2e",
    consolidation_scope: "連結",
    organizational_boundary: "国内外連結子会社",
    source_type: "manual",
    source_system: "manual_entry",
    source_record_id: `manual:${ids.metric}`,
    source_document: null,
    imported_at: "2026-07-12T00:00:00.000Z",
    last_updated_at: "2026-07-12T00:00:00.000Z",
    confidence_level: "medium",
    verification_status: "unverified",
    owner_user_id: ids.user,
    reviewer_user_id: null,
    change_reason: "月次確定値への手動補正",
    created_at: "2026-07-12T00:00:00.000Z",
    manual_override: true,
    version: 1,
    metrics: {
      id: ids.metric,
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
  };
}

describe("manual metric server command", () => {
  it("persists only after current membership and resource checks", async () => {
    const events: string[] = [];
    const client = userClient();
    const rpc = vi.fn().mockImplementation(async () => {
      events.push("rpc");
      return { data: savedMetricRow(), error: null };
    });
    const createServiceClient = vi.fn(() => {
      events.push("service");
      return { rpc } as unknown as SupabaseClient;
    });
    const handler = createMetricValuePostHandler({
      createUserClient: () => {
        events.push("user");
        return client;
      },
      createServiceClient,
      createRequestId: () => "request-id",
    });

    const response = await handler(request());
    expect(response.status).toBe(200);
    expect(events).toEqual(["user", "service", "rpc"]);
    expect(rpc).toHaveBeenCalledWith(
      "save_manual_metric_value_with_audit",
      expect.objectContaining({
        p_organization_id: ids.organization,
        p_actor_user_id: ids.user,
        p_actor_role: "preparer",
        p_expected_version: 0,
        p_consolidation_scope: "連結",
        p_organizational_boundary: "国内外連結子会社",
      }),
    );
  });

  it("does not create a service client for a missing membership", async () => {
    const createServiceClient = vi.fn();
    const handler = createMetricValuePostHandler({
      createUserClient: () => userClient({ membership: false }),
      createServiceClient,
      createRequestId: () => "request-id",
    });
    const response = await handler(request());
    expect(response.status).toBe(403);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it("rejects a client value whose type differs from the catalog", async () => {
    const createServiceClient = vi.fn();
    const handler = createMetricValuePostHandler({
      createUserClient: () => userClient({ valueType: "boolean" }),
      createServiceClient,
      createRequestId: () => "request-id",
    });
    const response = await handler(request());
    expect(response.status).toBe(403);
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it("maps optimistic concurrency failures to a stable conflict response", async () => {
    const handler = createMetricValuePostHandler({
      createUserClient: () => userClient(),
      createServiceClient: () =>
        ({
          rpc: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "40001" },
          }),
        }) as unknown as SupabaseClient,
      createRequestId: () => "request-id",
    });
    const response = await handler(request({ expectedVersion: 1 }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "version_conflict",
      correlationId: "request-id",
    });
  });

  it("maps the shared database rate limit to a stable 429 response", async () => {
    const handler = createMetricValuePostHandler({
      createUserClient: () => userClient(),
      createServiceClient: () =>
        ({
          rpc: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "P4290" },
          }),
        }) as unknown as SupabaseClient,
      createRequestId: () => "request-id",
    });
    const response = await handler(request());
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "rate_limit_exceeded",
      correlationId: "request-id",
    });
  });

  it("rejects malformed input before initializing any Supabase client", async () => {
    const createUserClient = vi.fn();
    const createServiceClient = vi.fn();
    const handler = createMetricValuePostHandler({
      createUserClient,
      createServiceClient,
      createRequestId: () => "request-id",
    });
    const response = await handler(request({ companyId: "not-a-uuid" }));
    expect(response.status).toBe(400);
    expect(createUserClient).not.toHaveBeenCalled();
    expect(createServiceClient).not.toHaveBeenCalled();
  });
});
