import { describe, expect, it } from "vitest";
import { UnitConversionError, canConvertUnit, convertUnit } from "./units";

describe("unit conversion", () => {
  it("converts emissions, energy, ratios, and currency through explicit dimensions", () => {
    expect(convertUnit(1, "tCO2e", "kgCO2e")).toBe(1_000);
    expect(convertUnit(3.6, "GJ", "kWh")).toBeCloseTo(1_000, 10);
    expect(convertUnit(25, "percent", "ratio")).toBe(0.25);
    expect(convertUnit(2, "million_JPY", "JPY")).toBe(2_000_000);
    expect(canConvertUnit("MWh", "GJ")).toBe(true);
  });

  it("rejects cross-dimension and non-finite conversions", () => {
    expect(() => convertUnit(1, "tCO2e", "kg")).toThrowError(
      UnitConversionError,
    );
    expect(() => convertUnit(Number.NaN, "kg", "t")).toThrowError(/finite/);
  });
});
