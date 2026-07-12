import { describe, expect, it } from "vitest";
import { encodeCsv, neutralizeSpreadsheetFormula } from "./csv";

describe("CSV export safety", () => {
  it.each(["=1+1", "+SUM(A1:A2)", "-2+3", "@cmd", "  =HYPERLINK(x)"])(
    "neutralizes spreadsheet formula input %s",
    (value) => {
      expect(neutralizeSpreadsheetFormula(value)).toBe(`'${value}`);
    },
  );

  it("escapes quotes and preserves ordinary values", () => {
    expect(
      encodeCsv([
        ["通常", 'a"b', 42],
        ["=cmd", null, true],
      ]),
    ).toBe('"通常","a""b","42"\n"\'=cmd","","true"');
  });
});
