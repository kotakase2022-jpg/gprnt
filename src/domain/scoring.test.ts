import { describe, expect, it } from "vitest";
import {
  calculateDataQualityScore,
  calculateDisclosureReadiness,
} from "./scoring";

describe("transparent scoring", () => {
  it("excludes not-applicable disclosure items and returns auditable components", () => {
    const score = calculateDisclosureReadiness([
      {
        id: "approved",
        label: "Approved",
        status: "approved",
        weight: 2,
        hasRequiredData: true,
        hasRequiredEvidence: true,
      },
      {
        id: "draft",
        label: "Draft",
        status: "drafted",
        weight: 1,
        hasRequiredData: true,
        hasRequiredEvidence: false,
      },
      {
        id: "na",
        label: "N/A",
        status: "not_applicable",
        weight: 100,
        hasRequiredData: false,
        hasRequiredEvidence: false,
      },
    ]);
    expect(score.possibleWeight).toBe(3);
    expect(score.excludedItemIds).toEqual(["na"]);
    expect(score.score).toBeCloseTo(((2 + 0.61) / 3) * 100, 10);
    expect(score.formula).toContain("status×60%");
  });

  it("calculates weighted quality dimensions and clamps percentages", () => {
    const result = calculateDataQualityScore({
      completenessPercent: 110,
      sourceTraceabilityPercent: 80,
      ageDays: 15,
      expectedFreshnessDays: 30,
      confidenceLevel: "medium",
      verificationStatus: "internally_reviewed",
      consistencyPercent: 90,
    });
    expect(result.dimensions).toHaveLength(6);
    expect(
      result.dimensions.find((item) => item.key === "completeness")?.score,
    ).toBe(100);
    expect(
      result.dimensions.find((item) => item.key === "freshness")?.score,
    ).toBe(50);
    expect(result.score).toBeCloseTo(77.75, 5);
  });
});
