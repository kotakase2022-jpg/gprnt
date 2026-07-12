import { createTerrastMockRecords } from "@/data";
import type { TerrastMetricRecord } from "@/domain/types";
import {
  filterTerrastRecords,
  TerrastConnectorError,
  type TerrastConnector,
  type TerrastFetchResult,
  type TerrastQuery,
} from "./connector";

export interface MockTerrastConnectorOptions {
  records?: readonly TerrastMetricRecord[];
  fetchedAt?: string;
}

export class MockTerrastConnector implements TerrastConnector {
  readonly mode = "mock" as const;
  private readonly records: TerrastMetricRecord[];
  private readonly fetchedAt: string;

  constructor(options: MockTerrastConnectorOptions = {}) {
    this.records = [...(options.records ?? createTerrastMockRecords())];
    this.fetchedAt = options.fetchedAt ?? "2026-02-01T00:00:00.000Z";
  }

  async fetchCompanyData(
    query: TerrastQuery,
    signal?: AbortSignal,
  ): Promise<TerrastFetchResult> {
    if (signal?.aborted)
      throw new TerrastConnectorError(
        "REQUEST_ABORTED",
        "The mock TERRAST request was aborted.",
      );
    const records = filterTerrastRecords(this.records, query);
    if (records.length === 0) {
      throw new TerrastConnectorError(
        "COMPANY_NOT_FOUND",
        `No synthetic TERRAST records exist for ${query.companyCode}.`,
        {
          details: { companyCode: query.companyCode },
        },
      );
    }
    return {
      records: records.map((record) => ({ ...record })),
      fetchedAt: this.fetchedAt,
      connector: this.mode,
      sourceLabel: "TERRAST MOCK — SYNTHETIC DEMO DATA",
    };
  }
}
