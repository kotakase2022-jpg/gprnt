import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { MetricValue } from "@/domain/types";

const commandResponseSchema = z
  .object({
    data: z.unknown(),
    correlationId: z.string().min(1),
  })
  .strict();

export class SupabaseMetricCommandError extends Error {
  readonly code:
    | "MANUAL_VALUE_REQUIRED"
    | "AUTHENTICATION_REQUIRED"
    | "COMMAND_REJECTED"
    | "INVALID_COMMAND_RESPONSE";
  readonly status?: number;

  constructor(
    code: SupabaseMetricCommandError["code"],
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = "SupabaseMetricCommandError";
    this.code = code;
    this.status = status;
  }
}

export interface SupabaseMetricCommandTransport {
  saveManualMetricValue(value: MetricValue): Promise<unknown>;
}

export interface BrowserMetricCommandTransportOptions {
  fetch?: typeof globalThis.fetch;
  endpoint?: string;
}

export class BrowserMetricCommandTransport implements SupabaseMetricCommandTransport {
  private readonly client: SupabaseClient;
  private readonly fetch: typeof globalThis.fetch;
  private readonly endpoint: string;

  constructor(
    client: SupabaseClient,
    options: BrowserMetricCommandTransportOptions = {},
  ) {
    this.client = client;
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.endpoint = options.endpoint ?? "/api/workspace/metric-values";
  }

  async saveManualMetricValue(value: MetricValue): Promise<unknown> {
    if (
      value.sourceType !== "manual" ||
      value.value === null ||
      !value.changeReason?.trim()
    ) {
      throw new SupabaseMetricCommandError(
        "MANUAL_VALUE_REQUIRED",
        "Only a non-empty manual metric value can use this command.",
      );
    }

    const { data, error } = await this.client.auth.getSession();
    const accessToken = error ? null : data.session?.access_token;
    if (!accessToken) {
      throw new SupabaseMetricCommandError(
        "AUTHENTICATION_REQUIRED",
        "An authenticated Supabase session is required.",
      );
    }

    const response = await this.fetch(this.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        companyId: value.companyId,
        reportingPeriodId: value.reportingPeriodId,
        metricCode: value.metricCode,
        value: value.value,
        unit: value.unit,
        consolidationScope: value.consolidationScope,
        organizationalBoundary: value.organizationalBoundary,
        changeReason: value.changeReason,
        expectedVersion: value.version,
      }),
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new SupabaseMetricCommandError(
        "INVALID_COMMAND_RESPONSE",
        "The metric command returned an invalid response.",
        response.status,
      );
    }

    if (!response.ok) {
      throw new SupabaseMetricCommandError(
        "COMMAND_REJECTED",
        "The metric command was rejected.",
        response.status,
      );
    }

    const parsed = commandResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new SupabaseMetricCommandError(
        "INVALID_COMMAND_RESPONSE",
        "The metric command returned an invalid response.",
        response.status,
      );
    }
    return parsed.data.data;
  }
}
