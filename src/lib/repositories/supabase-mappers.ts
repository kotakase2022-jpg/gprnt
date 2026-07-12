import { z } from "zod";
import {
  INDUSTRIES,
  METRIC_CATEGORIES,
  UNITS,
  type Company,
  type ConfidenceLevel,
  type MetricCategory,
  type MetricDefinition,
  type MetricScalar,
  type MetricValue,
  type ReportingPeriod,
  type SourceType,
  type Unit,
} from "@/domain/types";

export class SupabaseSchemaMappingError extends Error {
  readonly code = "SCHEMA_MAPPING_FAILED" as const;
  readonly field: string;

  constructor(field: string) {
    super(`Supabase row cannot be mapped safely at ${field}.`);
    this.name = "SupabaseSchemaMappingError";
    this.field = field;
  }
}

const companyRowSchema = z
  .object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    company_code: z.string().min(1),
    legal_name: z.string().min(1),
    name_en: z.string().nullable(),
    securities_code: z.string().nullable(),
    industry_category: z.enum(INDUSTRIES),
    market_segment: z
      .enum(["demo_prime", "demo_standard", "demo_growth"])
      .nullable(),
    size_category: z.enum(["large", "medium", "small"]).nullable(),
    fiscal_year_end_month: z.number().int().min(1).max(12),
    terrast_external_id: z.string().nullable(),
    is_demo: z.boolean(),
    company_sharing_consents: z
      .array(
        z
          .object({
            status: z.enum(["draft", "active", "revoked", "expired"]),
            data_categories: z.array(z.string()),
            valid_from: z.iso.date().nullable(),
            valid_until: z.iso.date().nullable(),
            revoked_at: z.iso.datetime({ offset: true }).nullable(),
          })
          .strict(),
      )
      .optional()
      .default([]),
  })
  .strict();

const reportingPeriodRowSchema = z
  .object({
    id: z.string().uuid(),
    company_id: z.string().uuid(),
    label: z.string().min(1),
    start_date: z.iso.date(),
    end_date: z.iso.date(),
    status: z.enum(["open", "closed", "archived"]),
  })
  .strict();

const metricDefinitionRowSchema = z
  .object({
    id: z.string().uuid().optional(),
    organization_id: z.string().uuid().nullable().optional(),
    metric_code: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
    name: z.string().min(1),
    description: z.string(),
    category: z.string().min(1),
    value_type: z.enum(["number", "text", "boolean", "json"]),
    canonical_unit: z.string().nullable(),
    allowed_units: z.array(z.string()),
    is_required: z.boolean(),
    is_sensitive: z.boolean(),
    terrast_field_key: z.string().nullable(),
  })
  .strict();

const metricRelationSchema = metricDefinitionRowSchema.extend({
  id: z.string().uuid(),
});

const periodRelationSchema = z
  .object({
    label: z.string().min(1),
  })
  .strict();

const metricValueRowSchema = z
  .object({
    id: z.string().uuid(),
    company_id: z.string().uuid(),
    metric_id: z.string().uuid(),
    reporting_period_id: z.string().uuid(),
    value_json: z.unknown(),
    original_value: z.string(),
    normalized_value: z.union([z.number(), z.string()]).nullable(),
    unit: z.string().min(1),
    original_unit: z.string().min(1),
    consolidation_scope: z.string().min(1),
    organizational_boundary: z.string().min(1),
    source_type: z.string().min(1),
    source_system: z.string().min(1),
    source_record_id: z.string().min(1),
    source_document: z.string().nullable(),
    imported_at: z.iso.datetime({ offset: true }),
    last_updated_at: z.iso.datetime({ offset: true }),
    confidence_level: z.enum(["unknown", "low", "medium", "high"]),
    verification_status: z.enum([
      "unverified",
      "internally_reviewed",
      "externally_assured",
    ]),
    owner_user_id: z.string().uuid().nullable(),
    reviewer_user_id: z.string().uuid().nullable(),
    change_reason: z.string().nullable(),
    created_at: z.iso.datetime({ offset: true }),
    manual_override: z.boolean(),
    version: z.number().int().positive(),
    metrics: z.union([metricRelationSchema, z.array(metricRelationSchema)]),
    reporting_periods: z.union([
      periodRelationSchema,
      z.array(periodRelationSchema),
    ]),
  })
  .strict();

const UNIT_ALIASES: Readonly<Record<string, Unit>> = {
  "t-CO2e": "tCO2e",
  "t-CO₂e": "tCO2e",
  "%": "percent",
  人: "people",
  "m³": "m3",
};

const CATEGORY_ALIASES: Readonly<Record<string, MetricCategory>> = {
  ghg: "ghg_emissions",
};

const SOURCE_ALIASES: Readonly<Record<string, SourceType>> = {
  terrast_mock: "terrast",
  csv: "csv_import",
  json: "json_import",
};

function singleRelation<T>(relation: T | T[], field: string): T {
  if (Array.isArray(relation)) {
    if (relation.length !== 1 || relation[0] === undefined)
      throw new SupabaseSchemaMappingError(field);
    return relation[0];
  }
  return relation;
}

export function mapSupabaseUnit(value: string | null): Unit {
  if (value === null || value === "") return "unitless";
  if (UNITS.includes(value as Unit)) return value as Unit;
  const alias = UNIT_ALIASES[value];
  if (alias) return alias;
  throw new SupabaseSchemaMappingError("unit");
}

export function mapSupabaseCategory(value: string): MetricCategory {
  if (METRIC_CATEGORIES.includes(value as MetricCategory))
    return value as MetricCategory;
  const alias = CATEGORY_ALIASES[value];
  if (alias) return alias;
  throw new SupabaseSchemaMappingError("metric.category");
}

function mapSourceType(value: string): SourceType {
  const mapped = SOURCE_ALIASES[value] ?? value;
  if (
    [
      "terrast",
      "manual",
      "csv_import",
      "json_import",
      "calculation",
      "supplier",
    ].includes(mapped)
  )
    return mapped as SourceType;
  throw new SupabaseSchemaMappingError("metric_value.source_type");
}

export function mapSupabaseCompany(
  input: unknown,
  now: Date = new Date(),
): Company {
  const row = companyRowSchema.parse(input);
  const currentDate = now.toISOString().slice(0, 10);
  const activeConsents = row.company_sharing_consents.filter(
    (consent) =>
      consent.status === "active" &&
      !consent.revoked_at &&
      (!consent.valid_from || consent.valid_from <= currentDate) &&
      (!consent.valid_until || consent.valid_until >= currentDate),
  );
  const sharingConsent = activeConsents.some((consent) =>
    consent.data_categories.includes("individual_detail"),
  )
    ? "individual_consented"
    : activeConsents.length
      ? "aggregated_only"
      : "none";
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyCode: row.company_code,
    securityCode: row.securities_code,
    name: row.legal_name,
    nameEn: row.name_en,
    industry: row.industry_category,
    marketSegment: row.market_segment,
    size: row.size_category,
    fiscalYearEndMonth: row.fiscal_year_end_month,
    terrastExternalId: row.terrast_external_id,
    sharingConsent,
    isSynthetic: row.is_demo,
  };
}

export function mapSupabaseReportingPeriod(input: unknown): ReportingPeriod {
  const row = reportingPeriodRowSchema.parse(input);
  if (row.status === "archived")
    throw new SupabaseSchemaMappingError("reporting_period.status");
  const labelYear = row.label.match(/(?:FY)?(\d{4})/i)?.[1];
  const fiscalYear = Number.parseInt(labelYear ?? row.end_date.slice(0, 4), 10);
  if (!Number.isInteger(fiscalYear))
    throw new SupabaseSchemaMappingError("reporting_period.fiscal_year");
  return {
    id: row.id,
    companyId: row.company_id,
    fiscalYear,
    startDate: row.start_date,
    endDate: row.end_date,
    label: row.label,
    status: row.status,
  };
}

export function mapSupabaseMetricDefinition(input: unknown): MetricDefinition {
  const row = metricDefinitionRowSchema.parse(input);
  if (row.value_type === "json")
    throw new SupabaseSchemaMappingError("metric.value_type");
  const canonicalUnit = mapSupabaseUnit(row.canonical_unit);
  const allowedUnits = row.allowed_units.length
    ? row.allowed_units.map(mapSupabaseUnit)
    : [canonicalUnit];
  return {
    ...(row.id ? { id: row.id } : {}),
    code: row.metric_code,
    name: row.name,
    description: row.description,
    category: mapSupabaseCategory(row.category),
    valueType: row.value_type,
    canonicalUnit,
    allowedUnits: [...new Set(allowedUnits)],
    isRequired: row.is_required,
    isSensitive: row.is_sensitive,
    ...(row.terrast_field_key
      ? { terrastFieldKey: row.terrast_field_key }
      : {}),
  };
}

function unwrapValueJson(value: unknown): unknown {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    "value" in value
  )
    return (value as { value: unknown }).value;
  return value;
}

function typedScalar(
  valueType: "number" | "text" | "boolean",
  value: unknown,
  field: string,
  allowEncodedScalar = false,
): MetricScalar {
  if (value === null) return null;
  if (valueType === "number") {
    const numericString =
      allowEncodedScalar &&
      typeof value === "string" &&
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)
        ? value
        : null;
    if (typeof value !== "number" && numericString === null)
      throw new SupabaseSchemaMappingError(field);
    const numeric =
      typeof value === "number" ? value : Number(numericString as string);
    if (!Number.isFinite(numeric)) throw new SupabaseSchemaMappingError(field);
    return numeric;
  }
  if (valueType === "text") {
    if (typeof value !== "string") throw new SupabaseSchemaMappingError(field);
    return value;
  }
  if (typeof value === "boolean") return value;
  if (allowEncodedScalar && value === "true") return true;
  if (allowEncodedScalar && value === "false") return false;
  throw new SupabaseSchemaMappingError(field);
}

export function mapSupabaseMetricValue(
  input: unknown,
  evidenceIds: readonly string[] = [],
): MetricValue {
  const row = metricValueRowSchema.parse(input);
  const metric = singleRelation(row.metrics, "metric_value.metrics");
  const period = singleRelation(
    row.reporting_periods,
    "metric_value.reporting_periods",
  );
  if (metric.value_type === "json")
    throw new SupabaseSchemaMappingError("metric_value.value_type");
  const valueType = metric.value_type;
  const value = typedScalar(
    valueType,
    unwrapValueJson(row.value_json),
    "metric_value.value_json",
  );
  const originalValue = typedScalar(
    valueType,
    row.original_value,
    "metric_value.original_value",
    true,
  );
  const normalizedValue =
    valueType === "number" && row.normalized_value !== null
      ? typedScalar(
          "number",
          row.normalized_value,
          "metric_value.normalized_value",
          true,
        )
      : null;
  const unit = mapSupabaseUnit(row.unit);
  const originalUnit = mapSupabaseUnit(row.original_unit);
  const common = {
    id: row.id,
    companyId: row.company_id,
    metricId: row.metric_id,
    metricCode: metric.metric_code,
    metricName: metric.name,
    metricCategory: mapSupabaseCategory(metric.category),
    reportingPeriodId: row.reporting_period_id,
    reportingPeriod: period.label,
    unit,
    originalUnit,
    consolidationScope: row.consolidation_scope,
    organizationalBoundary: row.organizational_boundary,
    sourceType: mapSourceType(row.source_type),
    sourceSystem: row.source_system,
    sourceRecordId: row.source_record_id,
    sourceDocument: row.source_document,
    importedAt: row.imported_at,
    lastUpdatedAt: row.last_updated_at,
    confidenceLevel: row.confidence_level as ConfidenceLevel,
    verificationStatus: row.verification_status,
    ownerId: row.owner_user_id,
    reviewerId: row.reviewer_user_id,
    evidenceIds: [...evidenceIds],
    changeReason: row.change_reason,
    manualOverride: row.manual_override,
    version: row.version,
  };
  if (valueType === "number")
    return {
      ...common,
      valueType,
      value: value as number | null,
      originalValue: originalValue as number | null,
      normalizedValue: normalizedValue as number | null,
    };
  if (valueType === "text")
    return {
      ...common,
      valueType,
      value: value as string | null,
      originalValue: originalValue as string | null,
      normalizedValue: normalizedValue as string | null,
    };
  return {
    ...common,
    valueType,
    value: value as boolean | null,
    originalValue: originalValue as boolean | null,
    normalizedValue: normalizedValue as boolean | null,
  };
}
