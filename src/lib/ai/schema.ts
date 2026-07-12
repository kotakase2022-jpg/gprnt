import { z } from "zod";

const evidenceDataIdSchema = z
  .string()
  .trim()
  .min(1, "Evidence data ID must not be empty.");

const groundedTextSchema = z
  .object({
    text: z.string().trim().min(1),
    evidenceDataIds: z.array(evidenceDataIdSchema),
  })
  .strict();

export const aiDisclosureOutputSchema = z
  .object({
    status: z.enum(["draft", "insufficient_evidence"]),
    label: z.literal("AI提案・要レビュー"),
    reviewRequired: z.literal(true),
    disclosureDraft: groundedTextSchema.nullable(),
    missingQuestions: z.array(
      z
        .object({
          question: z.string().trim().min(1),
          relatedRequirementId: z.string().trim().min(1),
          requiredEvidence: z.string().trim().min(1),
        })
        .strict(),
    ),
    inconsistencies: z.array(
      z
        .object({
          type: z.enum([
            "number",
            "unit",
            "reporting_period",
            "organizational_boundary",
          ]),
          message: z.string().trim().min(1),
          dataIds: z.array(evidenceDataIdSchema).min(1),
        })
        .strict(),
    ),
    climateCandidates: z.array(
      z
        .object({
          kind: z.enum(["physical_risk", "transition_risk", "opportunity"]),
          title: z.string().trim().min(1),
          rationale: z.string().trim().min(1),
          evidenceDataIds: z.array(evidenceDataIdSchema),
          confidence: z.enum(["low", "medium", "high"]),
        })
        .strict(),
    ),
    transitionPlanDraft: groundedTextSchema.nullable(),
    priorYearChanges: z.array(
      z
        .object({
          summary: z.string().trim().min(1),
          currentDataIds: z.array(evidenceDataIdSchema).min(1),
          priorDataIds: z.array(evidenceDataIdSchema).min(1),
        })
        .strict(),
    ),
    weakEvidenceWarnings: z.array(
      z
        .object({
          claim: z.string().trim().min(1),
          reason: z.string().trim().min(1),
          evidenceDataIds: z.array(evidenceDataIdSchema),
        })
        .strict(),
    ),
    claims: z.array(groundedTextSchema),
    insufficientEvidence: z
      .object({
        reason: z.string().trim().min(1),
        missingDataDescriptions: z.array(z.string().trim().min(1)).min(1),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((output, context) => {
    if (output.status === "draft" && output.disclosureDraft === null) {
      context.addIssue({
        code: "custom",
        path: ["disclosureDraft"],
        message: "A draft status requires disclosureDraft.",
      });
    }
    if (output.status === "draft" && output.insufficientEvidence !== null) {
      context.addIssue({
        code: "custom",
        path: ["insufficientEvidence"],
        message:
          "A validated draft cannot simultaneously declare insufficient evidence.",
      });
    }
    if (
      output.status === "insufficient_evidence" &&
      output.insufficientEvidence === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["insufficientEvidence"],
        message:
          "insufficient_evidence requires an explicit reason and missing data descriptions.",
      });
    }
    if (
      output.status === "insufficient_evidence" &&
      output.missingQuestions.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["missingQuestions"],
        message:
          "insufficient_evidence must provide at least one grounded follow-up question.",
      });
    }

    const groundedItems: Array<{
      path: (string | number)[];
      evidenceDataIds: string[];
    }> = [
      ...output.claims.map((claim, index) => ({
        path: ["claims", index, "evidenceDataIds"],
        evidenceDataIds: claim.evidenceDataIds,
      })),
      ...output.climateCandidates.map((candidate, index) => ({
        path: ["climateCandidates", index, "evidenceDataIds"],
        evidenceDataIds: candidate.evidenceDataIds,
      })),
      ...(output.disclosureDraft
        ? [
            {
              path: ["disclosureDraft", "evidenceDataIds"],
              evidenceDataIds: output.disclosureDraft.evidenceDataIds,
            },
          ]
        : []),
      ...(output.transitionPlanDraft
        ? [
            {
              path: ["transitionPlanDraft", "evidenceDataIds"],
              evidenceDataIds: output.transitionPlanDraft.evidenceDataIds,
            },
          ]
        : []),
    ];
    for (const grounded of groundedItems) {
      if (grounded.evidenceDataIds.length === 0) {
        context.addIssue({
          code: "custom",
          path: grounded.path,
          message:
            "Generated factual text must cite at least one input evidence data ID.",
        });
      }
    }

    const generatedTexts = [
      output.disclosureDraft?.text,
      output.transitionPlanDraft?.text,
      ...output.claims.map((claim) => claim.text),
      ...output.climateCandidates.flatMap((candidate) => [
        candidate.title,
        candidate.rationale,
      ]),
    ].filter((text): text is string => Boolean(text));
    const prohibitedConclusion =
      /(?:完全|法的).{0,8}(?:適合|準拠)|(?:適合|準拠).{0,8}(?:保証|確認済み|認定)|(?:保証します|保証済み|監査済み|fully compliant|compliance is guaranteed)|(?:(?:JPX|日本取引所|東京証券取引所).{0,12}(?:承認|公認|認定|提供|保証|提携)|(?:承認|公認|認定|提供|保証|提携).{0,12}(?:JPX|日本取引所|東京証券取引所))/i;
    for (const [index, text] of generatedTexts.entries()) {
      if (prohibitedConclusion.test(text)) {
        context.addIssue({
          code: "custom",
          path: ["generatedText", index],
          message: "AI output must not assert legal compliance or assurance.",
        });
      }
    }
  });

export type AiDisclosureOutput = z.infer<typeof aiDisclosureOutputSchema>;

export function parseAiDisclosureOutput(value: unknown): AiDisclosureOutput {
  return aiDisclosureOutputSchema.parse(value);
}

export function safeParseAiDisclosureOutput(value: unknown) {
  return aiDisclosureOutputSchema.safeParse(value);
}

export function createInsufficientEvidenceOutput(input: {
  requirementId: string;
  reason: string;
  missingDataDescriptions: string[];
}): AiDisclosureOutput {
  return aiDisclosureOutputSchema.parse({
    status: "insufficient_evidence",
    label: "AI提案・要レビュー",
    reviewRequired: true,
    disclosureDraft: null,
    missingQuestions: input.missingDataDescriptions.map((description) => ({
      question: `${description}を確認してください。`,
      relatedRequirementId: input.requirementId,
      requiredEvidence: description,
    })),
    inconsistencies: [],
    climateCandidates: [],
    transitionPlanDraft: null,
    priorYearChanges: [],
    weakEvidenceWarnings: [],
    claims: [],
    insufficientEvidence: {
      reason: input.reason,
      missingDataDescriptions: input.missingDataDescriptions,
    },
  });
}
