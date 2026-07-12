import { describe, expect, it } from "vitest";
import { METRIC_CATEGORIES } from "@/domain/types";
import {
  createDemoSeed,
  createTerrastMockRecords,
  DEMO_FISCAL_YEARS,
} from "./seed";

describe("synthetic demo seed", () => {
  it("contains exactly three fictional companies with three stable fiscal years each", () => {
    const seed = createDemoSeed();
    expect(seed.companies).toHaveLength(3);
    expect(
      seed.companies.every(
        (company) =>
          company.isSynthetic &&
          company.companyCode.startsWith("DEMO-") &&
          company.securityCode?.startsWith("DEMO-") === true,
      ),
    ).toBe(true);
    for (const company of seed.companies) {
      expect(
        seed.reportingPeriods
          .filter((period) => period.companyId === company.id)
          .map((period) => period.fiscalYear),
      ).toEqual(DEMO_FISCAL_YEARS);
      for (const year of DEMO_FISCAL_YEARS) {
        expect(
          seed.metricValues.some(
            (value) =>
              value.companyId === company.id &&
              value.reportingPeriod === `FY${year}`,
          ),
        ).toBe(true);
      }
    }
  });

  it("covers every required ESG metric category and marks factors/services as demo data", () => {
    const seed = createDemoSeed();
    const categories = new Set(seed.metrics.map((metric) => metric.category));
    expect(
      METRIC_CATEGORIES.every((category) => categories.has(category)),
    ).toBe(true);
    expect(
      seed.emissionFactors.every(
        (factor) => factor.isDemo && factor.sourceLabel.includes("DEMO DATA"),
      ),
    ).toBe(true);
    expect(
      seed.marketplaceOfferings.every(
        (offering) =>
          offering.isSynthetic && offering.termsDisclaimer.includes("架空"),
      ),
    ).toBe(true);
    expect(seed.datasetLabel).toBe("SYNTHETIC DEMO DATA");
  });

  it("keeps disclosure mappings and response provenance referentially complete", () => {
    const seed = createDemoSeed();
    const metricCodes = new Set(seed.metrics.map((metric) => metric.code));
    const requirementIds = new Set(
      seed.disclosureRequirements.map((requirement) => requirement.id),
    );
    const metricValueIds = new Set(seed.metricValues.map((value) => value.id));
    expect(
      seed.requirementMappings.every(
        (mapping) =>
          requirementIds.has(mapping.requirementId) &&
          mapping.metricCodes.every((code) => metricCodes.has(code)),
      ),
    ).toBe(true);
    expect(
      seed.disclosureResponses.every(
        (response) =>
          requirementIds.has(response.requirementId) &&
          response.sourceMetricValueIds.every((id) => metricValueIds.has(id)),
      ),
    ).toBe(true);
  });

  it("provides deterministic mock records for all four sync classifications", () => {
    const records = createTerrastMockRecords("DEMO-MFG-001");
    expect(records.map((record) => record.metricCode).sort()).toEqual([
      "energy_consumption",
      "scope_1_emissions",
      "scope_3_emissions",
      "supplier_primary_data_coverage",
    ]);
    expect(
      records.every(
        (record) =>
          record.isSynthetic && record.sourceSystem === "TERRAST_MOCK",
      ),
    ).toBe(true);
  });

  it("returns isolated copies", () => {
    const first = createDemoSeed();
    const second = createDemoSeed();
    first.companies[0]!.name = "mutated";
    expect(second.companies[0]!.name).toBe("日本未来製造株式会社");
  });
});
