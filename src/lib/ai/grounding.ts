import type { AiDisclosureOutput } from "./schema";

export type AiSourceDatum = {
  id: string;
  label: string;
  value: string | number | boolean;
  unit: string;
  period: string;
  confidence: number;
  organizationalBoundary?: string;
};

function distinct(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function detectSourceInconsistencies(
  sourceData: AiSourceDatum[],
): AiDisclosureOutput["inconsistencies"] {
  const groups = new Map<string, AiSourceDatum[]>();
  for (const item of sourceData) {
    const key = item.label.trim().toLocaleLowerCase("ja-JP");
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const issues: AiDisclosureOutput["inconsistencies"] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const dataIds = group.map((item) => item.id);
    const units = distinct(group.map((item) => item.unit));
    const periods = distinct(group.map((item) => item.period));
    const boundaries = distinct(
      group.map((item) => item.organizationalBoundary ?? ""),
    );
    const values = distinct(group.map((item) => String(item.value)));

    if (units.length > 1)
      issues.push({
        type: "unit",
        message: `${group[0].label}に複数の単位（${units.join(" / ")}）があります。`,
        dataIds,
      });
    if (periods.length > 1)
      issues.push({
        type: "reporting_period",
        message: `${group[0].label}に複数の対象期間（${periods.join(" / ")}）があります。`,
        dataIds,
      });
    if (boundaries.length > 1)
      issues.push({
        type: "organizational_boundary",
        message: `${group[0].label}の組織範囲が一致していません。`,
        dataIds,
      });
    if (
      values.length > 1 &&
      units.length <= 1 &&
      periods.length <= 1 &&
      boundaries.length <= 1
    )
      issues.push({
        type: "number",
        message: `${group[0].label}の同一条件に複数の数値があります。`,
        dataIds,
      });
  }
  return issues;
}

export function summarizePriorYearChanges(
  currentData: AiSourceDatum[],
  priorData: AiSourceDatum[],
): AiDisclosureOutput["priorYearChanges"] {
  const priorByLabel = new Map(
    priorData.map((item) => [
      item.label.trim().toLocaleLowerCase("ja-JP"),
      item,
    ]),
  );
  return currentData.flatMap((current) => {
    const prior = priorByLabel.get(
      current.label.trim().toLocaleLowerCase("ja-JP"),
    );
    if (!prior || String(prior.value) === String(current.value)) return [];
    return [
      {
        summary: `${current.label}は${prior.period}の${prior.value}${prior.unit ? ` ${prior.unit}` : ""}から${current.period}の${current.value}${current.unit ? ` ${current.unit}` : ""}へ変化しました。`,
        currentDataIds: [current.id],
        priorDataIds: [prior.id],
      },
    ];
  });
}

export function unpermittedEvidenceIds(
  output: AiDisclosureOutput,
  permittedIds: Iterable<string>,
): string[] {
  const permitted = new Set(permittedIds);
  const referenced = [
    ...(output.disclosureDraft?.evidenceDataIds ?? []),
    ...(output.transitionPlanDraft?.evidenceDataIds ?? []),
    ...output.claims.flatMap((item) => item.evidenceDataIds),
    ...output.climateCandidates.flatMap((item) => item.evidenceDataIds),
    ...output.weakEvidenceWarnings.flatMap((item) => item.evidenceDataIds),
    ...output.inconsistencies.flatMap((item) => item.dataIds),
    ...output.priorYearChanges.flatMap((item) => [
      ...item.currentDataIds,
      ...item.priorDataIds,
    ]),
  ];
  return [...new Set(referenced.filter((id) => !permitted.has(id)))];
}
