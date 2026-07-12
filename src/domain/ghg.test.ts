import { describe, expect, it } from "vitest";
import type { EmissionFactor } from "./types";
import {
  aggregateGhgEmissions,
  calculateEmissionsIntensity,
  calculateGhgEmissions,
  GhgCalculationError,
} from "./ghg";

const demoFactor: EmissionFactor = {
  id: "factor-demo",
  name: "Synthetic electricity factor",
  factorValue: 0.0005,
  activityUnit: "kWh",
  emissionUnit: "tCO2e",
  geography: "DEMO",
  factorYear: 2025,
  version: "demo-v1",
  sourceLabel: "DEMO DATA",
  isDemo: true,
};

describe("GHG calculations", () => {
  it("normalizes activity, multiplies the factor, and exposes the formula and demo warning", () => {
    const result = calculateGhgEmissions({
      activity: { value: 2, unit: "MWh" },
      emissionFactor: demoFactor,
      scope: "scope_2",
      scope2Basis: "location_based",
      isEstimated: false,
    });
    expect(result.normalizedActivity).toEqual({ value: 2_000, unit: "kWh" });
    expect(result.emissions).toEqual({ value: 1, unit: "tCO2e" });
    expect(result.formula).toContain("2000 kWh × 0.0005");
    expect(result.methodologyLabel).toContain("DEMO DATA");
    expect(result.warnings).toHaveLength(1);
  });

  it("requires Scope 2 basis and Scope 3 category", () => {
    expect(() =>
      calculateGhgEmissions({
        activity: { value: 1, unit: "kWh" },
        emissionFactor: demoFactor,
        scope: "scope_2",
        isEstimated: false,
      }),
    ).toThrowError(GhgCalculationError);
    expect(() =>
      calculateGhgEmissions({
        activity: { value: 1, unit: "kWh" },
        emissionFactor: demoFactor,
        scope: "scope_3",
        isEstimated: true,
      }),
    ).toThrowError(/category/);
  });

  it("aggregates both Scope 2 bases without double-counting either total", () => {
    const create = (
      scope: "scope_1" | "scope_2" | "scope_3",
      value: number,
      basis?: "location_based" | "market_based",
    ) =>
      calculateGhgEmissions({
        activity: { value, unit: "kWh" },
        emissionFactor: {
          ...demoFactor,
          factorValue: 1,
          emissionUnit: "tCO2e",
        },
        scope,
        ...(basis ? { scope2Basis: basis } : {}),
        ...(scope === "scope_3" ? { scope3Category: 1 } : {}),
        isEstimated: false,
      });
    const aggregate = aggregateGhgEmissions([
      create("scope_1", 1),
      create("scope_2", 2, "location_based"),
      create("scope_2", 3, "market_based"),
      create("scope_3", 4),
    ]);
    expect(aggregate.totalLocationBased).toBe(7);
    expect(aggregate.totalMarketBased).toBe(8);
    expect(calculateEmissionsIntensity(80, 20)).toBe(4);
  });
});
