import type { TerrastMetricRecord } from "@/domain/types";
import {
  filterTerrastRecords,
  TerrastConnectorError,
  type TerrastConnector,
  type TerrastFetchResult,
  type TerrastQuery,
} from "./connector";

export interface TerrastApiTransportInput {
  baseUrl: string;
  apiKey: string;
  query: TerrastQuery;
  signal?: AbortSignal;
}

/**
 * The confirmed API contract should provide this adapter. It is intentionally
 * responsible for the endpoint path, auth headers, payload, pagination, and
 * runtime validation because those TERRAST details were not supplied.
 */
export type TerrastApiTransport = (input: TerrastApiTransportInput) => Promise<{
  records: TerrastMetricRecord[];
  fetchedAt: string;
}>;

export interface ApiTerrastConnectorOptions {
  baseUrl?: string;
  apiKey?: string;
  transport?: TerrastApiTransport;
}

export class ApiTerrastConnector implements TerrastConnector {
  readonly mode = "api" as const;
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly transport?: TerrastApiTransport;

  constructor(options: ApiTerrastConnectorOptions = {}) {
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.transport = options.transport;
  }

  async fetchCompanyData(
    query: TerrastQuery,
    signal?: AbortSignal,
  ): Promise<TerrastFetchResult> {
    if (typeof window !== "undefined") {
      throw new TerrastConnectorError(
        "SECRET_IN_BROWSER",
        "ApiTerrastConnector must run on the server; TERRAST_API_KEY is secret.",
      );
    }
    if (!this.baseUrl || !this.apiKey) {
      throw new TerrastConnectorError(
        "CONFIGURATION_MISSING",
        "TERRAST_API_BASE_URL and TERRAST_API_KEY must be supplied by the server environment.",
      );
    }
    if (!this.transport) {
      throw new TerrastConnectorError(
        "API_CONTRACT_UNAVAILABLE",
        "The real TERRAST endpoint, authentication contract, and response mapping are unconfirmed. Inject a verified transport adapter.",
      );
    }
    if (signal?.aborted)
      throw new TerrastConnectorError(
        "REQUEST_ABORTED",
        "The TERRAST API request was aborted.",
      );

    try {
      const result = await this.transport({
        baseUrl: this.baseUrl,
        apiKey: this.apiKey,
        query,
        ...(signal ? { signal } : {}),
      });
      return {
        records: filterTerrastRecords(result.records, query),
        fetchedAt: result.fetchedAt,
        connector: this.mode,
        sourceLabel: "TERRAST API — contract supplied by verified adapter",
      };
    } catch (error) {
      if (error instanceof TerrastConnectorError) throw error;
      throw new TerrastConnectorError(
        "TRANSPORT_FAILED",
        "The TERRAST transport failed without exposing internal details.",
        { cause: error },
      );
    }
  }
}
