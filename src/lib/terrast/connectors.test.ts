import { describe, expect, it, vi } from "vitest";
import { ApiTerrastConnector } from "./api-connector";
import { TerrastConnectorError } from "./connector";
import {
  CsvJsonImportConnector,
  parseTerrastCsv,
  parseTerrastJson,
} from "./import-connector";
import { MockTerrastConnector } from "./mock-connector";

describe("TERRAST connectors", () => {
  it("filters deterministic synthetic records in the mock connector", async () => {
    const connector = new MockTerrastConnector();
    const result = await connector.fetchCompanyData({
      companyCode: "DEMO-MFG-001",
      metricCodes: ["scope_1_emissions"],
    });
    expect(result.connector).toBe("mock");
    expect(result.sourceLabel).toContain("SYNTHETIC DEMO DATA");
    expect(result.records).toHaveLength(1);
  });

  it("blocks server API secrets in the browser before any endpoint can be used", async () => {
    const connector = new ApiTerrastConnector({
      baseUrl: "https://example.invalid",
      apiKey: "test-only",
    });
    await expect(
      connector.fetchCompanyData({ companyCode: "DEMO-MFG-001" }),
    ).rejects.toMatchObject({
      code: "SECRET_IN_BROWSER",
    });
  });

  it("reports the unconfirmed API contract on the server without making a request", async () => {
    vi.stubGlobal("window", undefined);
    try {
      const connector = new ApiTerrastConnector({
        baseUrl: "https://example.invalid",
        apiKey: "test-only",
      });
      await expect(
        connector.fetchCompanyData({ companyCode: "DEMO-MFG-001" }),
      ).rejects.toMatchObject({ code: "API_CONTRACT_UNAVAILABLE" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("parses quoted CSV fields, typed values, and units", async () => {
    const csv = [
      "external_record_id,company_code,metric_code,reporting_period,value,value_type,unit,consolidation_scope,organizational_boundary,source_document,observed_at,updated_at,confidence_level",
      'record-1,DEMO-MFG-001,scope_1_emissions,FY2025,1200,number,tCO2e,consolidated,operational_control,"report, demo.pdf",2026-01-01T00:00:00.000Z,2026-01-02T00:00:00.000Z,high',
    ].join("\n");
    const parsed = parseTerrastCsv(csv);
    expect(parsed[0]).toMatchObject({
      value: 1_200,
      unit: "tCO2e",
      sourceDocument: "report, demo.pdf",
      sourceSystem: "CSV_IMPORT",
    });
    const connector = new CsvJsonImportConnector({
      format: "csv",
      content: csv,
      importedAt: "2026-01-03T00:00:00.000Z",
    });
    expect(
      (await connector.fetchCompanyData({ companyCode: "DEMO-MFG-001" }))
        .records,
    ).toHaveLength(1);
  });

  it("parses JSON records and rejects unsupported units", () => {
    const valid = JSON.stringify([
      {
        externalRecordId: "record-2",
        companyCode: "DEMO-ITS-003",
        metricCode: "board_climate_oversight",
        reportingPeriod: "FY2025",
        value: true,
        unit: "unitless",
        consolidationScope: "consolidated",
        organizationalBoundary: "operational_control",
        observedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        confidenceLevel: "medium",
      },
    ]);
    expect(parseTerrastJson(valid)[0]).toMatchObject({
      value: true,
      sourceSystem: "JSON_IMPORT",
    });
    const snakeCase = valid
      .replaceAll("externalRecordId", "external_record_id")
      .replaceAll("companyCode", "company_code")
      .replaceAll("metricCode", "metric_code")
      .replaceAll("reportingPeriod", "reporting_period")
      .replaceAll("consolidationScope", "consolidation_scope")
      .replaceAll("organizationalBoundary", "organizational_boundary")
      .replaceAll("observedAt", "observed_at")
      .replaceAll("updatedAt", "updated_at")
      .replaceAll("confidenceLevel", "confidence_level");
    expect(parseTerrastJson(snakeCase)[0]?.companyCode).toBe("DEMO-ITS-003");
    const invalid = valid.replace("unitless", "made_up_unit");
    expect(() => parseTerrastJson(invalid)).toThrowError(TerrastConnectorError);
  });
});
