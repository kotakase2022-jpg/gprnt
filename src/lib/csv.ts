export type CsvCell = string | number | boolean | null | undefined;

/**
 * Prevent spreadsheet applications from interpreting exported user-controlled
 * cells as formulas. Quoting alone does not neutralize CSV formula injection.
 */
export function neutralizeSpreadsheetFormula(value: CsvCell): string {
  const text = value == null ? "" : String(value);
  return /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
}

export function encodeCsv(rows: CsvCell[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const safe = neutralizeSpreadsheetFormula(cell);
          return `"${safe.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\n");
}
