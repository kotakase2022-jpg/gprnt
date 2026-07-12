import { describe, expect, it } from "vitest";
import {
  detectSourceInconsistencies,
  summarizePriorYearChanges,
  unpermittedEvidenceIds,
  type AiSourceDatum,
} from "./grounding";
import { aiDisclosureOutputSchema } from "./schema";

const datum = (patch: Partial<AiSourceDatum> = {}): AiSourceDatum => ({
  id: "metric-current",
  label: "Scope 1 排出量",
  value: 100,
  unit: "t-CO2e",
  period: "FY2025",
  confidence: 90,
  organizationalBoundary: "連結",
  ...patch,
});

describe("AI grounding helpers", () => {
  it("detects unit, period, boundary, and same-condition number conflicts", () => {
    const issues = detectSourceInconsistencies([
      datum(),
      datum({ id: "unit", unit: "kg-CO2e" }),
      datum({ id: "period", period: "FY2024" }),
      datum({ id: "boundary", organizationalBoundary: "単体" }),
      datum({ id: "number", value: 120 }),
      datum({ id: "energy-a", label: "電力", value: 10, unit: "MWh" }),
      datum({ id: "energy-b", label: "電力", value: 11, unit: "MWh" }),
    ]);
    expect(new Set(issues.map((issue) => issue.type))).toEqual(
      new Set([
        "unit",
        "reporting_period",
        "organizational_boundary",
        "number",
      ]),
    );
  });

  it("summarizes only changes backed by current and prior IDs", () => {
    expect(
      summarizePriorYearChanges(
        [datum()],
        [datum({ id: "metric-prior", value: 120, period: "FY2024" })],
      ),
    ).toEqual([
      expect.objectContaining({
        currentDataIds: ["metric-current"],
        priorDataIds: ["metric-prior"],
      }),
    ]);
  });

  it("rejects model references outside the permitted source set", () => {
    const output = aiDisclosureOutputSchema.parse({
      status: "draft",
      label: "AI提案・要レビュー",
      reviewRequired: true,
      disclosureDraft: {
        text: "入力値に基づく案です。",
        evidenceDataIds: ["allowed"],
      },
      missingQuestions: [],
      inconsistencies: [],
      climateCandidates: [],
      transitionPlanDraft: null,
      priorYearChanges: [],
      weakEvidenceWarnings: [
        { claim: "要確認", reason: "根拠が弱い", evidenceDataIds: ["forged"] },
      ],
      claims: [],
      insufficientEvidence: null,
    });
    expect(unpermittedEvidenceIds(output, ["allowed"])).toEqual(["forged"]);
  });
});
