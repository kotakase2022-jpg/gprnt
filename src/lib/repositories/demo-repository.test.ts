import { describe, expect, it } from "vitest";
import { createDemoSeed, createTerrastMockRecords } from "@/data";
import { applySyncPreview, buildSyncPreview } from "@/domain/sync";
import { DemoRepository, type StorageLike } from "./demo-repository";

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("DemoRepository", () => {
  it("works without window/localStorage and returns defensive copies", async () => {
    const repository = new DemoRepository({ storage: null });
    const snapshot = await repository.getSnapshot();
    snapshot.companies[0]!.name = "mutated";
    expect((await repository.getSnapshot()).companies[0]!.name).toBe(
      "日本未来製造株式会社",
    );
  });

  it("falls back to memory when browser storage is blocked", async () => {
    const blockedStorage: StorageLike = {
      getItem() {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem() {
        throw new DOMException("blocked", "SecurityError");
      },
      removeItem() {
        throw new DOMException("blocked", "SecurityError");
      },
    };
    const repository = new DemoRepository({ storage: blockedStorage });
    expect(repository.getStorageStatus()).toMatchObject({
      mode: "memory",
      error: { code: "READ_FAILED" },
    });
    const value = (await repository.listMetricValues())[0]!;
    await expect(
      repository.upsertMetricValue({
        ...value,
        changeReason: "memory fallback",
      }),
    ).resolves.toMatchObject({ changeReason: "memory fallback" });
  });

  it("persists updates through an injected browser-compatible storage", async () => {
    const storage = new MemoryStorage();
    const first = new DemoRepository({ storage });
    const value = (
      await first.listMetricValues({
        companyId: "company-mirai",
        metricCodes: ["scope_1_emissions"],
      })
    )[0]!;
    if (value.valueType !== "number")
      throw new Error("Fixture should be numeric");
    await first.upsertMetricValue({
      ...value,
      value: 999,
      normalizedValue: 999,
      lastUpdatedAt: "2026-02-01T00:00:00.000Z",
      version: value.version + 1,
    });
    const second = new DemoRepository({ storage });
    expect(
      (await second.listMetricValues()).find(
        (candidate) => candidate.id === value.id,
      )?.normalizedValue,
    ).toBe(999);
  });

  it("rolls back all in-memory and persisted changes when a transaction fails", async () => {
    const storage = new MemoryStorage();
    const repository = new DemoRepository({ storage, seed: createDemoSeed() });
    const before = await repository.getSnapshot();
    await expect(
      repository.transaction(async (transactionRepository) => {
        const value = (await transactionRepository.listMetricValues())[0]!;
        await transactionRepository.upsertMetricValue({
          ...value,
          changeReason: "temporary",
        });
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(await repository.getSnapshot()).toEqual(before);
    expect(await new DemoRepository({ storage }).getSnapshot()).toEqual(before);
  });

  it("commits metric values, sync history, and audit together", async () => {
    const repository = new DemoRepository({ storage: null });
    const snapshot = await repository.getSnapshot();
    const company = snapshot.companies.find(
      (candidate) => candidate.id === "company-mirai",
    )!;
    const preview = buildSyncPreview({
      company,
      reportingPeriods: snapshot.reportingPeriods,
      metrics: snapshot.metrics,
      localValues: snapshot.metricValues,
      incomingRecords: createTerrastMockRecords(company.companyCode),
    });
    const conflict = preview.diffs.find((diff) => diff.kind === "conflict")!;
    const execution = applySyncPreview({
      preview,
      metrics: snapshot.metrics,
      currentValues: snapshot.metricValues,
      completedIdempotencyKeys: snapshot.terrastSyncJobs
        .filter((job) => job.status === "completed")
        .map((job) => job.idempotencyKey),
      resolutions: [
        {
          diffId: conflict.id,
          strategy: "accept_terrast",
          resolvedBy: "user-preparer",
          reason: "Integration test",
          resolvedAt: "2026-02-02T00:00:00.000Z",
        },
      ],
      selectedDiffIds: preview.diffs
        .filter((diff) => diff.kind !== "unchanged")
        .map((diff) => diff.id),
      actorId: "user-preparer",
      actorOrganizationId: "org-mirai",
      actorRole: "preparer",
      executedAt: "2026-02-02T00:00:00.000Z",
    });
    await repository.saveSyncExecution(execution);
    expect(await repository.listSyncRecords(execution.job.id)).toHaveLength(4);
    expect(
      await repository.listAuditLogs({
        organizationId: "org-mirai",
        action: "sync",
      }),
    ).toContainEqual(expect.objectContaining({ syncJobId: execution.job.id }));
    expect(
      await repository.listMetricValues({
        companyId: company.id,
        metricCodes: ["supplier_primary_data_coverage"],
      }),
    ).toContainEqual(
      expect.objectContaining({
        reportingPeriod: "FY2025",
        normalizedValue: 42,
      }),
    );
  });
});
