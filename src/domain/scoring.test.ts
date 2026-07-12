import { describe, expect, it } from "vitest";
import {
  calculateDataQualityScore,
  calculateDisclosureReadiness,
  confidenceLevelScore,
} from "./scoring";

describe("transparent scoring", () => {
  it("uses one confidence scale across scoring and production consumers", () => {
    expect(
      ["unknown", "low", "medium", "high"].map((level) =>
        confidenceLevelScore(level as "unknown" | "low" | "medium" | "high"),
      ),
    ).toEqual([0, 25, 65, 100]);
  });

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

  it("awards no confidence points when source confidence is unknown", () => {
    const result = calculateDataQualityScore({
      completenessPercent: 100,
      sourceTraceabilityPercent: 100,
      ageDays: 0,
      expectedFreshnessDays: 30,
      confidenceLevel: "unknown",
      verificationStatus: "externally_assured",
      consistencyPercent: 100,
    });
    expect(
      result.dimensions.find((item) => item.key === "confidence")?.score,
    ).toBe(0);
  });
});
