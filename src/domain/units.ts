import type { Unit } from "./types";

export type UnitDimension =
  | "emissions"
  | "energy"
  | "volume"
  | "ratio"
  | "count"
  | "time"
  | "currency"
  | "mass"
  | "unitless";

export class UnitConversionError extends Error {
  readonly code: "INVALID_VALUE" | "INCOMPATIBLE_UNITS";

  constructor(code: UnitConversionError["code"], message: string) {
    super(message);
    this.name = "UnitConversionError";
    this.code = code;
  }
}

interface UnitDefinition {
  dimension: UnitDimension;
  /** Multiplier from this unit to the dimension's canonical base unit. */
  toBase: number;
}

const UNIT_DEFINITIONS: Readonly<Record<Unit, UnitDefinition>> = {
  tCO2e: { dimension: "emissions", toBase: 1_000 },
  kgCO2e: { dimension: "emissions", toBase: 1 },
  gCO2e: { dimension: "emissions", toBase: 0.001 },
  MWh: { dimension: "energy", toBase: 1_000 },
  kWh: { dimension: "energy", toBase: 1 },
  GJ: { dimension: "energy", toBase: 1_000 / 3.6 },
  TJ: { dimension: "energy", toBase: 1_000_000 / 3.6 },
  m3: { dimension: "volume", toBase: 1_000 },
  L: { dimension: "volume", toBase: 1 },
  percent: { dimension: "ratio", toBase: 0.01 },
  ratio: { dimension: "ratio", toBase: 1 },
  people: { dimension: "count", toBase: 1 },
  hours: { dimension: "time", toBase: 1 },
  JPY: { dimension: "currency", toBase: 1 },
  million_JPY: { dimension: "currency", toBase: 1_000_000 },
  t: { dimension: "mass", toBase: 1_000 },
  kg: { dimension: "mass", toBase: 1 },
  unitless: { dimension: "unitless", toBase: 1 },
};

export function getUnitDimension(unit: Unit): UnitDimension {
  return UNIT_DEFINITIONS[unit].dimension;
}

export function canConvertUnit(from: Unit, to: Unit): boolean {
  return getUnitDimension(from) === getUnitDimension(to);
}

export function convertUnit(value: number, from: Unit, to: Unit): number {
  if (!Number.isFinite(value)) {
    throw new UnitConversionError(
      "INVALID_VALUE",
      "The value to convert must be a finite number.",
    );
  }

  const source = UNIT_DEFINITIONS[from];
  const target = UNIT_DEFINITIONS[to];

  if (source.dimension !== target.dimension) {
    throw new UnitConversionError(
      "INCOMPATIBLE_UNITS",
      `Cannot convert ${from} (${source.dimension}) to ${to} (${target.dimension}).`,
    );
  }

  return (value * source.toBase) / target.toBase;
}
