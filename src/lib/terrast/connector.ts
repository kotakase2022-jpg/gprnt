import type { TerrastMetricRecord } from "@/domain/types";

export interface TerrastQuery {
  companyCode: string;
  reportingPeriods?: readonly string[];
  metricCodes?: readonly string[];
}

export interface TerrastFetchResult {
  records: TerrastMetricRecord[];
  fetchedAt: string;
  connector: "mock" | "api" | "csv_import" | "json_import";
  sourceLabel: string;
}

export interface TerrastConnector {
  readonly mode: TerrastFetchResult["connector"];
  fetchCompanyData(
    query: TerrastQuery,
    signal?: AbortSignal,
  ): Promise<TerrastFetchResult>;
}

export type TerrastConnectorErrorCode =
  | "CONFIGURATION_MISSING"
  | "API_CONTRACT_UNAVAILABLE"
  | "SECRET_IN_BROWSER"
  | "COMPANY_NOT_FOUND"
  | "IMPORT_PARSE_FAILED"
  | "IMPORT_VALIDATION_FAILED"
  | "REQUEST_ABORTED"
  | "TRANSPORT_FAILED";

export class TerrastConnectorError extends Error {
  readonly code: TerrastConnectorErrorCode;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
  readonly cause?: unknown;

  constructor(
    code: TerrastConnectorErrorCode,
    message: string,
    options: {
      details?: Readonly<Record<string, string | number | boolean>>;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "TerrastConnectorError";
    this.code = code;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export function filterTerrastRecords(
  records: readonly TerrastMetricRecord[],
  query: TerrastQuery,
): TerrastMetricRecord[] {
  const periods = query.reportingPeriods
    ? new Set(query.reportingPeriods)
    : undefined;
  const metrics = query.metricCodes ? new Set(query.metricCodes) : undefined;
  return records.filter(
    (record) =>
      record.companyCode === query.companyCode &&
      (!periods || periods.has(record.reportingPeriod)) &&
      (!metrics || metrics.has(record.metricCode)),
  );
}
