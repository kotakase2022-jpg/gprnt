import type {
  EmissionFactor,
  GhgScope,
  QuantifiedValue,
  Scope3Category,
  Scope2Basis,
} from "./types";
import { convertUnit } from "./units";

export interface GhgCalculationInput {
  activity: QuantifiedValue;
  emissionFactor: EmissionFactor;
  scope: GhgScope;
  scope2Basis?: Scope2Basis;
  scope3Category?: Scope3Category;
  isEstimated: boolean;
}

export interface GhgCalculationResult {
  scope: GhgScope;
  scope2Basis?: Scope2Basis;
  scope3Category?: Scope3Category;
  originalActivity: QuantifiedValue;
  normalizedActivity: QuantifiedValue;
  factor: Pick<
    EmissionFactor,
    | "id"
    | "name"
    | "factorValue"
    | "activityUnit"
    | "emissionUnit"
    | "factorYear"
    | "version"
    | "sourceLabel"
    | "isDemo"
  >;
  emissions: { value: number; unit: "tCO2e" };
  formula: string;
  methodologyLabel: string;
  isEstimated: boolean;
  warnings: string[];
}

export class GhgCalculationError extends Error {
  readonly code:
    "INVALID_ACTIVITY" | "INVALID_FACTOR" | "INVALID_SCOPE_CONFIGURATION";

  constructor(code: GhgCalculationError["code"], message: string) {
    super(message);
    this.name = "GhgCalculationError";
    this.code = code;
  }
}

export function calculateGhgEmissions(
  input: GhgCalculationInput,
): GhgCalculationResult {
  const { activity, emissionFactor, scope, scope2Basis, scope3Category } =
    input;

  if (!Number.isFinite(activity.value) || activity.value < 0) {
    throw new GhgCalculationError(
      "INVALID_ACTIVITY",
      "Activity must be a finite, non-negative number.",
    );
  }
  if (
    !Number.isFinite(emissionFactor.factorValue) ||
    emissionFactor.factorValue < 0
  ) {
    throw new GhgCalculationError(
      "INVALID_FACTOR",
      "Emission factor must be a finite, non-negative number.",
    );
  }
  if (scope === "scope_2" && !scope2Basis) {
    throw new GhgCalculationError(
      "INVALID_SCOPE_CONFIGURATION",
      "Scope 2 calculations require a location- or market-based basis.",
    );
  }
  if (scope !== "scope_2" && scope2Basis) {
    throw new GhgCalculationError(
      "INVALID_SCOPE_CONFIGURATION",
      "A Scope 2 basis can only be used for Scope 2 calculations.",
    );
  }
  if (
    scope === "scope_3" &&
    (!Number.isInteger(scope3Category) ||
      (scope3Category ?? 0) < 1 ||
      (scope3Category ?? 0) > 15)
  ) {
    throw new GhgCalculationError(
      "INVALID_SCOPE_CONFIGURATION",
      "Scope 3 calculations require a category from 1 through 15.",
    );
  }

  const normalizedActivityValue = convertUnit(
    activity.value,
    activity.unit,
    emissionFactor.activityUnit,
  );
  const rawEmissions = normalizedActivityValue * emissionFactor.factorValue;
  const emissionsTco2e = convertUnit(
    rawEmissions,
    emissionFactor.emissionUnit,
    "tCO2e",
  );
  const demoPrefix = emissionFactor.isDemo ? "DEMO DATA — " : "";

  return {
    scope,
    ...(scope2Basis ? { scope2Basis } : {}),
    ...(scope3Category ? { scope3Category } : {}),
    originalActivity: activity,
    normalizedActivity: {
      value: normalizedActivityValue,
      unit: emissionFactor.activityUnit,
    },
    factor: {
      id: emissionFactor.id,
      name: emissionFactor.name,
      factorValue: emissionFactor.factorValue,
      activityUnit: emissionFactor.activityUnit,
      emissionUnit: emissionFactor.emissionUnit,
      factorYear: emissionFactor.factorYear,
      version: emissionFactor.version,
      sourceLabel: emissionFactor.sourceLabel,
      isDemo: emissionFactor.isDemo,
    },
    emissions: { value: emissionsTco2e, unit: "tCO2e" },
    formula: `${normalizedActivityValue} ${emissionFactor.activityUnit} × ${emissionFactor.factorValue} ${emissionFactor.emissionUnit}/${emissionFactor.activityUnit} = ${emissionsTco2e} tCO2e`,
    methodologyLabel: `${demoPrefix}${emissionFactor.name} (${emissionFactor.factorYear}, ${emissionFactor.version})`,
    isEstimated: input.isEstimated,
    warnings: emissionFactor.isDemo
      ? [
          "This factor is synthetic DEMO DATA and must not be used for actual reporting.",
        ]
      : [],
  };
}

export interface GhgAggregate {
  scope1: number;
  scope2LocationBased: number;
  scope2MarketBased: number;
  scope3: number;
  totalLocationBased: number;
  totalMarketBased: number;
  unit: "tCO2e";
}

export function aggregateGhgEmissions(
  results: readonly GhgCalculationResult[],
): GhgAggregate {
  const sum = (items: GhgCalculationResult[]) =>
    items.reduce((total, item) => total + item.emissions.value, 0);
  const scope1 = sum(results.filter((item) => item.scope === "scope_1"));
  const scope2LocationBased = sum(
    results.filter(
      (item) =>
        item.scope === "scope_2" && item.scope2Basis === "location_based",
    ),
  );
  const scope2MarketBased = sum(
    results.filter(
      (item) => item.scope === "scope_2" && item.scope2Basis === "market_based",
    ),
  );
  const scope3 = sum(results.filter((item) => item.scope === "scope_3"));

  return {
    scope1,
    scope2LocationBased,
    scope2MarketBased,
    scope3,
    totalLocationBased: scope1 + scope2LocationBased + scope3,
    totalMarketBased: scope1 + scope2MarketBased + scope3,
    unit: "tCO2e",
  };
}

export function calculateEmissionsIntensity(
  emissionsTco2e: number,
  denominator: number,
): number {
  if (
    !Number.isFinite(emissionsTco2e) ||
    emissionsTco2e < 0 ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    throw new GhgCalculationError(
      "INVALID_ACTIVITY",
      "Emissions must be non-negative and the intensity denominator must be positive.",
    );
  }
  return emissionsTco2e / denominator;
}
