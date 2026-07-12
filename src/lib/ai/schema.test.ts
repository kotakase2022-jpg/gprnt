import { describe, expect, it } from "vitest";
import {
  aiDisclosureOutputSchema,
  createInsufficientEvidenceOutput,
} from "./schema";

const validDraft = {
  status: "draft",
  label: "AI提案・要レビュー",
  reviewRequired: true,
  disclosureDraft: {
    text: "Scope 1排出量は入力データに基づき記載しています。",
    evidenceDataIds: ["metric-value-1"],
  },
  missingQuestions: [],
  inconsistencies: [],
  climateCandidates: [
    {
      kind: "physical_risk",
      title: "高温リスク候補",
      rationale: "入力されたリスク記録に基づく候補。",
      evidenceDataIds: ["risk-1"],
      confidence: "medium",
    },
  ],
  transitionPlanDraft: {
    text: "登録済み施策の進捗を説明します。",
    evidenceDataIds: ["action-1"],
  },
  priorYearChanges: [
    {
      summary: "排出量が変化しました。",
      currentDataIds: ["metric-current"],
      priorDataIds: ["metric-prior"],
    },
  ],
  weakEvidenceWarnings: [],
  claims: [{ text: "登録値は100です。", evidenceDataIds: ["metric-value-1"] }],
  insufficientEvidence: null,
} as const;

describe("AI structured output validation", () => {
  it("accepts a review-labelled, evidence-grounded draft", () => {
    expect(aiDisclosureOutputSchema.parse(validDraft)).toMatchObject({
      status: "draft",
      reviewRequired: true,
    });
  });

  it("rejects generated factual text without evidence IDs", () => {
    const result = aiDisclosureOutputSchema.safeParse({
      ...validDraft,
      disclosureDraft: { ...validDraft.disclosureDraft, evidenceDataIds: [] },
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes("evidence data ID"),
        ),
      ).toBe(true);
  });

  it("requires an explicit insufficient_evidence result and follow-up questions", () => {
    const output = createInsufficientEvidenceOutput({
      requirementId: "requirement-1",
      reason: "組織範囲が未登録です。",
      missingDataDescriptions: ["組織範囲と対象期間"],
    });
    expect(output.status).toBe("insufficient_evidence");
    expect(output.missingQuestions).toHaveLength(1);
    expect(
      aiDisclosureOutputSchema.safeParse({
        ...output,
        insufficientEvidence: null,
        missingQuestions: [],
      }).success,
    ).toBe(false);
  });

  it("rejects unknown fields so prompts cannot silently change the contract", () => {
    expect(
      aiDisclosureOutputSchema.safeParse({
        ...validDraft,
        complianceGuaranteed: true,
      }).success,
    ).toBe(false);
  });

  it("rejects AI assertions of legal compliance or assurance", () => {
    expect(
      aiDisclosureOutputSchema.safeParse({
        ...validDraft,
        disclosureDraft: {
          ...validDraft.disclosureDraft,
          text: "法的に適合しています。",
        },
      }).success,
    ).toBe(false);
    expect(
      aiDisclosureOutputSchema.safeParse({
        ...validDraft,
        disclosureDraft: {
          ...validDraft.disclosureDraft,
          text: "JPX公認の開示です。",
        },
      }).success,
    ).toBe(false);
  });
});
