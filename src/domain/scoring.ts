import type {
  ConfidenceLevel,
  DisclosureStatus,
  VerificationStatus,
} from "./types";

export interface ReadinessItem {
  id: string;
  label: string;
  status: DisclosureStatus;
  weight: number;
  hasRequiredData: boolean;
  hasRequiredEvidence: boolean;
}

export interface ReadinessItemScore extends ReadinessItem {
  statusCompletion: number;
  dataCompletion: number;
  evidenceCompletion: number;
  earnedWeight: number;
}

export interface ReadinessScore {
  score: number;
  earnedWeight: number;
  possibleWeight: number;
  excludedItemIds: string[];
  items: ReadinessItemScore[];
  formula: string;
}

const STATUS_COMPLETION: Readonly<Record<DisclosureStatus, number>> = {
  not_started: 0,
  data_available: 0.35,
  drafted: 0.6,
  in_review: 0.8,
  revision_requested: 0.65,
  approved: 1,
  not_applicable: 0,
};

export function calculateDisclosureReadiness(
  items: readonly ReadinessItem[],
): ReadinessScore {
  const applicable = items.filter((item) => item.status !== "not_applicable");
  for (const item of items) {
    if (!Number.isFinite(item.weight) || item.weight < 0) {
      throw new RangeError(`Readiness item ${item.id} has an invalid weight.`);
    }
  }

  const scoredItems = applicable.map<ReadinessItemScore>((item) => {
    const statusCompletion = STATUS_COMPLETION[item.status];
    const dataCompletion = item.hasRequiredData ? 1 : 0;
    const evidenceCompletion = item.hasRequiredEvidence ? 1 : 0;
    // Workflow maturity is primary; data and evidence make the rationale visible.
    const completion =
      statusCompletion * 0.6 +
      dataCompletion * 0.25 +
      evidenceCompletion * 0.15;
    return {
      ...item,
      statusCompletion,
      dataCompletion,
      evidenceCompletion,
      earnedWeight: item.weight * completion,
    };
  });

  const possibleWeight = scoredItems.reduce(
    (total, item) => total + item.weight,
    0,
  );
  const earnedWeight = scoredItems.reduce(
    (total, item) => total + item.earnedWeight,
    0,
  );
  const score =
    possibleWeight === 0 ? 0 : (earnedWeight / possibleWeight) * 100;

  return {
    score,
    earnedWeight,
    possibleWeight,
    excludedItemIds: items
      .filter((item) => item.status === "not_applicable")
      .map((item) => item.id),
    items: scoredItems,
    formula:
      "Σ(weight × (status×60% + data×25% + evidence×15%)) ÷ Σ(applicable weight) × 100",
  };
}

export interface DataQualityInput {
  completenessPercent: number;
  sourceTraceabilityPercent: number;
  ageDays: number;
  expectedFreshnessDays: number;
  confidenceLevel: ConfidenceLevel;
  verificationStatus: VerificationStatus;
  consistencyPercent: number;
}

export interface DataQualityDimension {
  key:
    | "completeness"
    | "traceability"
    | "freshness"
    | "confidence"
    | "verification"
    | "consistency";
  score: number;
  weight: number;
  weightedScore: number;
}

export interface DataQualityScore {
  score: number;
  dimensions: DataQualityDimension[];
  formula: string;
}

const clampPercent = (value: number, field: string): number => {
  if (!Number.isFinite(value)) throw new RangeError(`${field} must be finite.`);
  return Math.min(100, Math.max(0, value));
};

const CONFIDENCE_LEVEL_SCORES: Readonly<Record<ConfidenceLevel, number>> = {
  unknown: 0,
  low: 25,
  medium: 65,
  high: 100,
};

export function confidenceLevelScore(level: ConfidenceLevel): number {
  return CONFIDENCE_LEVEL_SCORES[level];
}

export function calculateDataQualityScore(
  input: DataQualityInput,
): DataQualityScore {
  if (
    !Number.isFinite(input.ageDays) ||
    input.ageDays < 0 ||
    !Number.isFinite(input.expectedFreshnessDays) ||
    input.expectedFreshnessDays <= 0
  ) {
    throw new RangeError(
      "ageDays must be non-negative and expectedFreshnessDays must be positive.",
    );
  }

  const verificationScores: Record<VerificationStatus, number> = {
    unverified: 25,
    internally_reviewed: 70,
    externally_assured: 100,
  };
  const freshness = clampPercent(
    100 * (1 - input.ageDays / input.expectedFreshnessDays),
    "freshness",
  );
  const rawDimensions: Array<Omit<DataQualityDimension, "weightedScore">> = [
    {
      key: "completeness",
      score: clampPercent(input.completenessPercent, "completenessPercent"),
      weight: 0.25,
    },
    {
      key: "traceability",
      score: clampPercent(
        input.sourceTraceabilityPercent,
        "sourceTraceabilityPercent",
      ),
      weight: 0.2,
    },
    { key: "freshness", score: freshness, weight: 0.15 },
    {
      key: "confidence",
      score: confidenceLevelScore(input.confidenceLevel),
      weight: 0.15,
    },
    {
      key: "verification",
      score: verificationScores[input.verificationStatus],
      weight: 0.15,
    },
    {
      key: "consistency",
      score: clampPercent(input.consistencyPercent, "consistencyPercent"),
      weight: 0.1,
    },
  ];
  const dimensions = rawDimensions.map<DataQualityDimension>((dimension) => ({
    ...dimension,
    weightedScore: dimension.score * dimension.weight,
  }));

  return {
    score: dimensions.reduce(
      (total, dimension) => total + dimension.weightedScore,
      0,
    ),
    dimensions,
    formula:
      "completeness×25% + traceability×20% + freshness×15% + confidence×15% + verification×15% + consistency×10%",
  };
}
