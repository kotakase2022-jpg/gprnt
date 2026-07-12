import { describe, expect, it } from "vitest";
import { parseMetricInputValue } from "./metric-input";

describe("manual metric input parsing", () => {
  it.each(["", "   ", ",", ",,,", " , , "])(
    "rejects an empty-looking numeric value: %j",
    (input) => {
      expect(() => parseMetricInputValue("number", input)).toThrow(
        "invalid_metric_value",
      );
    },
  );

  it("keeps a deliberate numeric zero valid", () => {
    expect(parseMetricInputValue("number", "0")).toBe(0);
  });

  it("normalizes a finite grouped number", () => {
    expect(parseMetricInputValue("number", " 1,234.5 ")).toBe(1234.5);
  });

  it.each(["1,23", "1,,2", "12,34,567", "1,000."])(
    "rejects malformed digit grouping: %s",
    (input) => {
      expect(() => parseMetricInputValue("number", input)).toThrow(
        "invalid_metric_value",
      );
    },
  );
});
