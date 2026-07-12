import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { UNITS, type UserRole } from "@/domain/types";
import { readTrustedAppRole } from "@/lib/auth/roles";
import {
  mapSupabaseMetricValue,
  mapSupabaseUnit,
} from "@/lib/repositories/supabase-mappers";
import {
  createServiceSupabaseClient,
  createUserScopedSupabaseClient,
  extractBearerToken,
} from "@/lib/supabase/server";

const inputSchema = z
  .object({
    companyId: z.string().uuid(),
    reportingPeriodId: z.string().uuid(),
    metricCode: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
    value: z.union([
      z.number().finite(),
      z.string().trim().min(1).max(10_000),
      z.boolean(),
    ]),
    unit: z.enum(UNITS),
    consolidationScope: z.string().trim().min(1).max(200),
    organizationalBoundary: z.string().trim().min(1).max(200),
    changeReason: z.string().trim().min(3).max(500),
    expectedVersion: z.number().int().min(0),
  })
  .strict();

type Input = z.infer<typeof inputSchema>;

type AuthorizedContext = {
  actorId: string;
  actorRole: UserRole;
  organizationId: string;
  metricId: string;
  databaseUnit: string;
};

const allowedRoles = new Set<UserRole>([
  "system_admin",
  "company_admin",
  "preparer",
]);

export interface MetricValueRouteDependencies {
  createUserClient: (token: string) => SupabaseClient;
  createServiceClient: () => SupabaseClient;
  createRequestId: () => string;
}

const defaultDependencies: MetricValueRouteDependencies = {
  createUserClient: createUserScopedSupabaseClient,
  createServiceClient: createServiceSupabaseClient,
  createRequestId: randomUUID,
};

function valueMatchesType(value: Input["value"], valueType: string): boolean {
  return (
    (valueType === "number" && typeof value === "number") ||
    (valueType === "text" && typeof value === "string") ||
    (valueType === "boolean" && typeof value === "boolean")
  );
}

async function authorize(
  client: SupabaseClient,
  token: string,
  input: Input,
): Promise<AuthorizedContext | null> {
  const { data: userResult, error: userError } =
    await client.auth.getUser(token);
  const user = userResult.user;
  const role = userError ? null : readTrustedAppRole(user?.app_metadata);
  if (!user || !role || !allowedRoles.has(role)) return null;

  const { data: company, error: companyError } = await client
    .from("companies")
    .select("id, organization_id")
    .eq("id", input.companyId)
    .maybeSingle();
  if (companyError) throw new Error("company_query_failed");
  if (!company) return null;
  const organizationId = company.organization_id as string;

  let membershipQuery = client
    .from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", role)
    .eq("is_active", true);
  if (role !== "system_admin")
    membershipQuery = membershipQuery.eq("organization_id", organizationId);
  const { data: memberships, error: membershipError } =
    await membershipQuery.limit(1);
  if (membershipError) throw new Error("membership_query_failed");
  if (!memberships?.length) return null;

  const { data: period, error: periodError } = await client
    .from("reporting_periods")
    .select("id")
    .eq("id", input.reportingPeriodId)
    .eq("organization_id", organizationId)
    .eq("company_id", input.companyId)
    .eq("status", "open")
    .maybeSingle();
  if (periodError) throw new Error("period_query_failed");
  if (!period) return null;

  const metricColumns =
    "id, organization_id, value_type, canonical_unit, allowed_units";
  const tenantMetric = await client
    .from("metrics")
    .select(metricColumns)
    .eq("metric_code", input.metricCode)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();
  if (tenantMetric.error) throw new Error("metric_query_failed");
  const globalMetric = tenantMetric.data
    ? { data: null, error: null }
    : await client
        .from("metrics")
        .select(metricColumns)
        .eq("metric_code", input.metricCode)
        .is("organization_id", null)
        .eq("status", "active")
        .maybeSingle();
  if (globalMetric.error) throw new Error("metric_query_failed");
  const metric = tenantMetric.data ?? globalMetric.data;
  if (!metric || !valueMatchesType(input.value, metric.value_type as string))
    return null;

  const databaseUnit =
    typeof metric.canonical_unit === "string"
      ? metric.canonical_unit
      : "unitless";
  if (mapSupabaseUnit(databaseUnit) !== input.unit) return null;
  const allowedUnits = Array.isArray(metric.allowed_units)
    ? (metric.allowed_units as unknown[])
    : [];
  if (
    allowedUnits.length &&
    !allowedUnits.some(
      (unit) =>
        typeof unit === "string" && mapSupabaseUnit(unit) === input.unit,
    )
  )
    return null;

  return {
    actorId: user.id,
    actorRole: role,
    organizationId,
    metricId: metric.id as string,
    databaseUnit,
  };
}

export function createMetricValuePostHandler(
  dependencies: MetricValueRouteDependencies = defaultDependencies,
) {
  return async function POST(request: NextRequest) {
    const suppliedRequestId = request.headers.get("x-request-id")?.trim();
    const correlationId =
      suppliedRequestId && /^[A-Za-z0-9._:-]{1,100}$/.test(suppliedRequestId)
        ? suppliedRequestId
        : dependencies.createRequestId();
    const failure = (error: string, status: number) =>
      NextResponse.json({ error, correlationId }, { status });

    let input: Input;
    try {
      input = inputSchema.parse(await request.json());
    } catch {
      return failure("invalid_request", 400);
    }

    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) return failure("unauthorized", 401);

    let context: AuthorizedContext | null;
    try {
      context = await authorize(
        dependencies.createUserClient(token),
        token,
        input,
      );
    } catch {
      return failure("authorization_failed", 503);
    }
    if (!context) return failure("forbidden", 403);

    let service: SupabaseClient;
    try {
      // Service access is delayed until user identity, current membership and
      // every resource relationship have been checked through the RLS client.
      service = dependencies.createServiceClient();
    } catch {
      return failure("server_not_configured", 503);
    }

    const command = await (async () => {
      try {
        return await service.rpc("save_manual_metric_value_with_audit", {
          p_organization_id: context.organizationId,
          p_company_id: input.companyId,
          p_reporting_period_id: input.reportingPeriodId,
          p_metric_id: context.metricId,
          p_value_json: input.value,
          p_unit: context.databaseUnit,
          p_consolidation_scope: input.consolidationScope,
          p_organizational_boundary: input.organizationalBoundary,
          p_change_reason: input.changeReason,
          p_expected_version: input.expectedVersion,
          p_actor_user_id: context.actorId,
          p_actor_role: context.actorRole,
          p_request_id: correlationId,
        });
      } catch {
        return null;
      }
    })();
    if (!command) return failure("command_failed", 503);
    if (command.error) {
      const status =
        command.error.code === "40001"
          ? 409
          : command.error.code === "P4290"
            ? 429
            : command.error.code === "42501"
              ? 403
              : command.error.code === "22023"
                ? 400
                : 503;
      return failure(
        status === 409
          ? "version_conflict"
          : status === 429
            ? "rate_limit_exceeded"
            : "command_failed",
        status,
      );
    }
    try {
      mapSupabaseMetricValue(command.data);
    } catch {
      return failure("command_failed", 503);
    }
    return NextResponse.json({ data: command.data, correlationId });
  };
}

export const POST = createMetricValuePostHandler();
