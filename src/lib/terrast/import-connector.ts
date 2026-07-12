import { CONFIDENCE_LEVELS, isConfidenceLevel, isUnit } from "./validation";
import type {
  ConfidenceLevel,
  MetricScalar,
  TerrastMetricRecord,
  Unit,
} from "@/domain/types";
import {
  filterTerrastRecords,
  TerrastConnectorError,
  type TerrastConnector,
  type TerrastFetchResult,
  type TerrastQuery,
} from "./connector";

type ImportFormat = "csv" | "json";

export const TERRAST_IMPORT_LIMITS = {
  maxBytes: 5_000_000,
  maxRecords: 10_000,
  maxFieldCharacters: 20_000,
} as const;

function assertImportSize(content: string, format: ImportFormat): void {
  if (
    content.length > TERRAST_IMPORT_LIMITS.maxBytes ||
    new TextEncoder().encode(content).byteLength >
      TERRAST_IMPORT_LIMITS.maxBytes
  ) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      `${format.toUpperCase()} import exceeds the configured size limit.`,
    );
  }
}

export interface CsvJsonImportConnectorOptions {
  format: ImportFormat;
  content: string;
  importedAt?: string;
  isSynthetic?: boolean;
}

const REQUIRED_FIELDS = [
  "externalRecordId",
  "companyCode",
  "metricCode",
  "reportingPeriod",
  "value",
  "unit",
  "consolidationScope",
  "organizationalBoundary",
  "observedAt",
  "updatedAt",
  "confidenceLevel",
] as const;

const CSV_HEADER_ALIASES: Record<
  string,
  (typeof REQUIRED_FIELDS)[number] | "valueType" | "sourceDocument"
> = {
  external_record_id: "externalRecordId",
  externalRecordId: "externalRecordId",
  company_code: "companyCode",
  companyCode: "companyCode",
  metric_code: "metricCode",
  metricCode: "metricCode",
  reporting_period: "reportingPeriod",
  reportingPeriod: "reportingPeriod",
  value: "value",
  value_type: "valueType",
  valueType: "valueType",
  unit: "unit",
  consolidation_scope: "consolidationScope",
  consolidationScope: "consolidationScope",
  organizational_boundary: "organizationalBoundary",
  organizationalBoundary: "organizationalBoundary",
  source_document: "sourceDocument",
  sourceDocument: "sourceDocument",
  observed_at: "observedAt",
  observedAt: "observedAt",
  updated_at: "updatedAt",
  updatedAt: "updatedAt",
  confidence_level: "confidenceLevel",
  confidenceLevel: "confidenceLevel",
};

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]!;
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      if (rows.length > TERRAST_IMPORT_LIMITS.maxRecords + 1) {
        throw new TerrastConnectorError(
          "IMPORT_VALIDATION_FAILED",
          `CSV exceeds the ${TERRAST_IMPORT_LIMITS.maxRecords} record limit.`,
        );
      }
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted)
    throw new TerrastConnectorError(
      "IMPORT_PARSE_FAILED",
      "CSV contains an unterminated quoted field.",
    );
  row.push(field.replace(/\r$/, ""));
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  if (rows.length > TERRAST_IMPORT_LIMITS.maxRecords + 1) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      `CSV exceeds the ${TERRAST_IMPORT_LIMITS.maxRecords} record limit.`,
    );
  }
  return rows;
}

function parseScalar(value: unknown, valueType?: unknown): MetricScalar {
  if (value === null) return null;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value !== "string") {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      "Imported value must be a string, number, boolean, or null.",
    );
  }
  if (value.length > TERRAST_IMPORT_LIMITS.maxFieldCharacters) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      "An imported value exceeds the field size limit.",
    );
  }
  const normalizedType =
    typeof valueType === "string" ? valueType.toLowerCase() : undefined;
  if (
    normalizedType &&
    normalizedType !== "number" &&
    normalizedType !== "text" &&
    normalizedType !== "boolean"
  ) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      `Unsupported valueType ${normalizedType}.`,
    );
  }
  if (normalizedType === "text") return value;
  if (
    normalizedType === "boolean" ||
    (!normalizedType && /^(true|false)$/i.test(value))
  ) {
    if (!/^(true|false)$/i.test(value))
      throw new TerrastConnectorError(
        "IMPORT_VALIDATION_FAILED",
        `Invalid boolean value ${value}.`,
      );
    return value.toLowerCase() === "true";
  }
  if (
    normalizedType === "number" ||
    (!normalizedType && value.trim() !== "" && Number.isFinite(Number(value)))
  ) {
    const number = Number(value);
    if (!Number.isFinite(number))
      throw new TerrastConnectorError(
        "IMPORT_VALIDATION_FAILED",
        `Invalid numeric value ${value}.`,
      );
    return number;
  }
  if (value === "" && normalizedType !== "text") return null;
  return value;
}

function requiredString(
  record: Record<string, unknown>,
  field: (typeof REQUIRED_FIELDS)[number],
  rowNumber: number,
): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      `Row ${rowNumber}: ${field} is required.`,
      {
        details: { row: rowNumber, field },
      },
    );
  }
  if (value.length > TERRAST_IMPORT_LIMITS.maxFieldCharacters) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      `Row ${rowNumber}: ${field} exceeds the field size limit.`,
    );
  }
  return value.trim();
}

function validIsoDateTime(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function mapImportRecord(
  raw: unknown,
  rowNumber: number,
  format: ImportFormat,
  isSynthetic: boolean,
): TerrastMetricRecord {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      `Row ${rowNumber} must be an object.`,
    );
  }
  const rawRecord = raw as Record<string, unknown>;
  const record = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of Object.entries(rawRecord)) {
    const normalizedKey = CSV_HEADER_ALIASES[key] ?? key;
    if (normalizedKey in record) {
      throw new TerrastConnectorError(
        "IMPORT_VALIDATION_FAILED",
        `Row ${rowNumber}: duplicate field ${normalizedKey}.`,
      );
    }
    record[normalizedKey] = value;
  }
  const externalRecordId = requiredString(
    record,
    "externalRecordId",
    rowNumber,
  );
  const companyCode = requiredString(record, "companyCode", rowNumber);
  const metricCode = requiredString(record, "metricCode", rowNumber);
  const reportingPeriod = requiredString(record, "reportingPeriod", rowNumber);
  const unitText = requiredString(record, "unit", rowNumber);
  if (!isUnit(unitText)) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      `Row ${rowNumber}: unsupported unit ${unitText}.`,
    );
  }
  const consolidationScope = requiredString(
    record,
    "consolidationScope",
    rowNumber,
  );
  const organizationalBoundary = requiredString(
    record,
    "organizationalBoundary",
    rowNumber,
  );
  const observedAt = requiredString(record, "observedAt", rowNumber);
  const updatedAt = requiredString(record, "updatedAt", rowNumber);
  if (!validIsoDateTime(observedAt) || !validIsoDateTime(updatedAt)) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      `Row ${rowNumber}: timestamps must be ISO 8601 UTC.`,
    );
  }
  if (updatedAt < observedAt) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      `Row ${rowNumber}: updatedAt cannot precede observedAt.`,
    );
  }
  const confidenceText = requiredString(record, "confidenceLevel", rowNumber);
  if (!isConfidenceLevel(confidenceText)) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      `Row ${rowNumber}: confidenceLevel must be one of ${CONFIDENCE_LEVELS.join(", ")}.`,
    );
  }

  return {
    externalRecordId,
    companyCode,
    metricCode,
    reportingPeriod,
    value: parseScalar(record.value, record.valueType),
    unit: unitText as Unit,
    consolidationScope,
    organizationalBoundary,
    ...(typeof record.sourceDocument === "string" &&
    record.sourceDocument.trim()
      ? { sourceDocument: record.sourceDocument.trim() }
      : {}),
    observedAt,
    updatedAt,
    confidenceLevel: confidenceText as ConfidenceLevel,
    sourceSystem: format === "csv" ? "CSV_IMPORT" : "JSON_IMPORT",
    isSynthetic,
  };
}

export function parseTerrastCsv(
  content: string,
  isSynthetic = false,
): TerrastMetricRecord[] {
  assertImportSize(content, "csv");
  const rows = parseCsvRows(content.replace(/^\uFEFF/, ""));
  if (rows.length < 2)
    throw new TerrastConnectorError(
      "IMPORT_PARSE_FAILED",
      "CSV must contain a header and at least one data row.",
    );
  const rawHeaders = rows[0]!;
  const headers = rawHeaders.map(
    (header) => CSV_HEADER_ALIASES[header.trim()] ?? header.trim(),
  );
  if (new Set(headers).size !== headers.length) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      "CSV contains duplicate columns after header normalization.",
    );
  }
  const missing = REQUIRED_FIELDS.filter(
    (required) => !headers.includes(required),
  );
  if (missing.length > 0) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      `CSV is missing required columns: ${missing.join(", ")}.`,
    );
  }

  return rows.slice(1).map((row, index) => {
    if (row.length !== headers.length) {
      throw new TerrastConnectorError(
        "IMPORT_PARSE_FAILED",
        `CSV row ${index + 2} has ${row.length} columns; expected ${headers.length}.`,
      );
    }
    const record = Object.create(null) as Record<string, unknown>;
    headers.forEach((header, columnIndex) => {
      record[header] = row[columnIndex];
    });
    return mapImportRecord(record, index + 2, "csv", isSynthetic);
  });
}

export function parseTerrastJson(
  content: string,
  isSynthetic = false,
): TerrastMetricRecord[] {
  assertImportSize(content, "json");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new TerrastConnectorError(
      "IMPORT_PARSE_FAILED",
      "JSON could not be parsed.",
      { cause: error },
    );
  }
  const values = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" &&
        parsed !== null &&
        "records" in parsed &&
        Array.isArray((parsed as { records?: unknown }).records)
      ? (parsed as { records: unknown[] }).records
      : undefined;
  if (!values)
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      "JSON must be an array or an object with a records array.",
    );
  if (values.length > TERRAST_IMPORT_LIMITS.maxRecords) {
    throw new TerrastConnectorError(
      "IMPORT_VALIDATION_FAILED",
      `JSON exceeds the ${TERRAST_IMPORT_LIMITS.maxRecords} record limit.`,
    );
  }
  return values.map((record, index) =>
    mapImportRecord(record, index + 1, "json", isSynthetic),
  );
}

export class CsvJsonImportConnector implements TerrastConnector {
  readonly mode: "csv_import" | "json_import";
  private readonly records: TerrastMetricRecord[];
  private readonly importedAt: string;

  constructor(options: CsvJsonImportConnectorOptions) {
    this.mode = options.format === "csv" ? "csv_import" : "json_import";
    this.records =
      options.format === "csv"
        ? parseTerrastCsv(options.content, options.isSynthetic ?? false)
        : parseTerrastJson(options.content, options.isSynthetic ?? false);
    this.importedAt = options.importedAt ?? new Date().toISOString();
  }

  async fetchCompanyData(
    query: TerrastQuery,
    signal?: AbortSignal,
  ): Promise<TerrastFetchResult> {
    if (signal?.aborted)
      throw new TerrastConnectorError(
        "REQUEST_ABORTED",
        "The import request was aborted.",
      );
    const records = filterTerrastRecords(this.records, query);
    if (records.length === 0) {
      throw new TerrastConnectorError(
        "COMPANY_NOT_FOUND",
        `The import contains no records for ${query.companyCode}.`,
      );
    }
    return {
      records: records.map((record) => ({ ...record })),
      fetchedAt: this.importedAt,
      connector: this.mode,
      sourceLabel: `${this.mode === "csv_import" ? "CSV" : "JSON"} import${records.every((record) => record.isSynthetic) ? " — SYNTHETIC DEMO DATA" : ""}`,
    };
  }
}
