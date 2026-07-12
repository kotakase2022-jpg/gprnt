import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MetricValue } from "@/domain/types";
import {
  BrowserMetricCommandTransport,
  SupabaseMetricCommandError,
} from "./supabase-metric-command";

const value: MetricValue = {
  id: "d1000000-0000-4000-8000-000000000001",
  companyId: "c1111111-1111-4111-8111-111111111111",
  metricCode: "GHG_SCOPE_1",
  reportingPeriodId: "11000000-0000-4000-8000-000000002025",
  reportingPeriod: "FY2025",
  valueType: "number",
  value: 123,
  originalValue: 123,
  normalizedValue: 123,
  unit: "tCO2e",
  originalUnit: "tCO2e",
  consolidationScope: "連結",
  organizationalBoundary: "国内外連結子会社",
  sourceType: "manual",
  sourceSystem: "manual_entry",
  sourceRecordId: "manual:GHG_SCOPE_1",
  sourceDocument: null,
  importedAt: "2026-07-12T00:00:00.000Z",
  lastUpdatedAt: "2026-07-12T00:00:00.000Z",
  confidenceLevel: "medium",
  verificationStatus: "unverified",
  ownerId: null,
  reviewerId: null,
  evidenceIds: [],
  changeReason: "画面からの手動入力・更新",
  manualOverride: true,
  version: 0,
};

function client(accessToken: string | null = "access-token") {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: accessToken ? { access_token: accessToken } : null },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
}

describe("BrowserMetricCommandTransport", () => {
  it("sends the user token and optimistic version to the server command", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { id: value.id },
          correlationId: "request-id",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const transport = new BrowserMetricCommandTransport(client(), { fetch });
    await expect(transport.saveManualMetricValue(value)).resolves.toEqual({
      id: value.id,
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/workspace/metric-values",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer access-token",
        }),
        body: expect.stringContaining('"expectedVersion":0'),
      }),
    );
  });

  it("fails before fetch when no authenticated session exists", async () => {
    const fetch = vi.fn();
    const transport = new BrowserMetricCommandTransport(client(null), {
      fetch,
    });
    await expect(transport.saveManualMetricValue(value)).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not expose a server error body to callers", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "private-database-detail" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      }),
    );
    const transport = new BrowserMetricCommandTransport(client(), { fetch });
    const error = await transport
      .saveManualMetricValue(value)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(SupabaseMetricCommandError);
    expect(error).toMatchObject({ code: "COMMAND_REJECTED", status: 409 });
    expect((error as Error).message).not.toContain("private-database-detail");
  });
});
