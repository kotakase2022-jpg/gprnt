import { describe, expect, it } from "vitest";
import {
  mapSupabaseCompany,
  mapSupabaseMetricDefinition,
  mapSupabaseMetricValue,
  mapSupabaseReportingPeriod,
  SupabaseSchemaMappingError,
} from "./supabase-mappers";

const metricRelation = {
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
};

const metricValueRow = {
  id: "d1000000-0000-4000-8000-000000000001",
  company_id: "c1111111-1111-4111-8111-111111111111",
  metric_id: "a1000000-0000-4000-8000-000000000001",
  reporting_period_id: "11000000-0000-4000-8000-000000002025",
  value_json: { value: 123.5 },
  original_value: "123.5",
  normalized_value: "123.5",
  unit: "t-CO₂e",
  original_unit: "t-CO2e",
  consolidation_scope: "連結",
  organizational_boundary: "国内外連結子会社",
  source_type: "terrast_mock",
  source_system: "MockTerrastConnector",
  source_record_id: "source-1",
  source_document: null,
  imported_at: "2026-07-12T00:00:00+00:00",
  last_updated_at: "2026-07-12T01:00:00+00:00",
  confidence_level: "high",
  verification_status: "unverified",
  owner_user_id: null,
  reviewer_user_id: null,
  change_reason: null,
  created_at: "2026-07-12T00:00:00+00:00",
  manual_override: false,
  version: 1,
  metrics: metricRelation,
  reporting_periods: { label: "FY2025" },
};

describe("Supabase schema mappers", () => {
  it("maps nullable company fields without inventing production metadata", () => {
    expect(
      mapSupabaseCompany({
        id: "c1111111-1111-4111-8111-111111111111",
        organization_id: "11111111-1111-4111-8111-111111111111",
        company_code: "C-001",
        legal_name: "テスト株式会社",
        name_en: null,
        securities_code: null,
        industry_category: "manufacturing",
        market_segment: null,
        size_category: null,
        fiscal_year_end_month: 3,
        terrast_external_id: null,
        is_demo: false,
        company_sharing_consents: [],
      }),
    ).toMatchObject({
      nameEn: null,
      securityCode: null,
      marketSegment: null,
      size: null,
      terrastExternalId: null,
      isSynthetic: false,
      sharingConsent: "none",
    });
  });

  it("derives the fiscal year from a labeled non-archived period", () => {
    expect(
      mapSupabaseReportingPeriod({
        id: "11000000-0000-4000-8000-000000002025",
        company_id: "c1111111-1111-4111-8111-111111111111",
        label: "FY2025",
        start_date: "2025-04-01",
        end_date: "2026-03-31",
        status: "open",
      }).fiscalYear,
    ).toBe(2025);
  });

  it("normalizes reviewed category, unit, source and numeric aliases", () => {
    const definitionRow = Object.fromEntries(
      Object.entries(metricRelation).filter(([key]) => key !== "id"),
    );
    expect(mapSupabaseMetricDefinition(definitionRow)).toMatchObject({
      code: "GHG_SCOPE_1",
      category: "ghg_emissions",
      canonicalUnit: "tCO2e",
      allowedUnits: ["tCO2e"],
    });
    expect(
      mapSupabaseMetricValue(metricValueRow, ["evidence-1"]),
    ).toMatchObject({
      valueType: "number",
      metricId: metricRelation.id,
      metricName: metricRelation.name,
      metricCategory: "ghg_emissions",
      value: 123.5,
      originalValue: 123.5,
      normalizedValue: 123.5,
      unit: "tCO2e",
      originalUnit: "tCO2e",
      sourceType: "terrast",
      evidenceIds: ["evidence-1"],
    });
  });

  it.each([
    ["text", "登録済み", "登録済み"],
    ["boolean", true, true],
  ] as const)(
    "maps %s metric scalars without numeric coercion",
    (type, raw, expected) => {
      const row = {
        ...metricValueRow,
        value_json: raw,
        original_value: String(raw),
        normalized_value: null,
        unit: "unitless",
        original_unit: "unitless",
        metrics: {
          ...metricRelation,
          value_type: type,
          canonical_unit: null,
          allowed_units: [],
        },
      };
      expect(mapSupabaseMetricValue(row)).toMatchObject({
        valueType: type,
        value: expected,
        normalizedValue: null,
        unit: "unitless",
      });
    },
  );

  it("fails closed for an unreviewed unit vocabulary", () => {
    expect(() =>
      mapSupabaseMetricValue({ ...metricValueRow, unit: "mystery-unit" }),
    ).toThrow(SupabaseSchemaMappingError);
  });

  it.each([true, "", " ", "0x10", "123"])(
    "does not coerce an invalid numeric value_json scalar: %j",
    (valueJson) => {
      expect(() =>
        mapSupabaseMetricValue({
          ...metricValueRow,
          value_json: valueJson,
        }),
      ).toThrow(SupabaseSchemaMappingError);
    },
  );

  it("does not coerce a JSON string into a boolean value", () => {
    expect(() =>
      mapSupabaseMetricValue({
        ...metricValueRow,
        value_json: "true",
        original_value: "true",
        normalized_value: null,
        unit: "unitless",
        original_unit: "unitless",
        metrics: {
          ...metricRelation,
          value_type: "boolean",
          canonical_unit: null,
          allowed_units: [],
        },
      }),
    ).toThrow(SupabaseSchemaMappingError);
  });

  it.each([
    ["source_record_id", null],
    ["imported_at", null],
    ["consolidation_scope", null],
    ["organizational_boundary", null],
    ["original_value", null],
    ["unit", null],
    ["original_unit", null],
  ])(
    "fails closed instead of inventing missing provenance at %s",
    (field, value) => {
      expect(() =>
        mapSupabaseMetricValue({ ...metricValueRow, [field]: value }),
      ).toThrow();
    },
  );
});
