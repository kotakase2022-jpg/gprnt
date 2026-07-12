import { describe, expect, it } from "vitest";
import { createDemoSeed, createTerrastMockRecords } from "@/data";
import {
  applySyncPreview,
  buildSyncPreview,
  canRetrySyncJob,
  createSyncRetryJob,
  dryRunSync,
  resolveSyncConflict,
} from "./sync";

const syncFixture = () => {
  const seed = createDemoSeed();
  const company = seed.companies.find(
    (candidate) => candidate.id === "company-mirai",
  )!;
  const incomingRecords = createTerrastMockRecords(company.companyCode);
  return { seed, company, incomingRecords };
};

describe("TERRAST diff and synchronization", () => {
  it("classifies added, updated, manual conflict, and unchanged records", () => {
    const { seed, company, incomingRecords } = syncFixture();
    const preview = buildSyncPreview({
      company,
      reportingPeriods: seed.reportingPeriods,
      metrics: seed.metrics,
      localValues: seed.metricValues,
      incomingRecords,
    });
    expect(preview.counts).toEqual({
      added: 1,
      updated: 1,
      conflict: 1,
      unchanged: 1,
    });
    expect(
      preview.diffs.find((diff) => diff.kind === "conflict")?.metricCode,
    ).toBe("scope_3_emissions");
  });

  it("dry-run does not mutate local values", () => {
    const { seed, company, incomingRecords } = syncFixture();
    const before = JSON.stringify(seed.metricValues);
    dryRunSync({
      company,
      reportingPeriods: seed.reportingPeriods,
      metrics: seed.metrics,
      localValues: seed.metricValues,
      incomingRecords,
    });
    expect(JSON.stringify(seed.metricValues)).toBe(before);
  });

  it("applies selected changes once and treats a repeated idempotency key as a no-op", () => {
    const { seed, company, incomingRecords } = syncFixture();
    const preview = buildSyncPreview({
      company,
      reportingPeriods: seed.reportingPeriods,
      metrics: seed.metrics,
      localValues: seed.metricValues,
      incomingRecords,
    });
    const conflict = preview.diffs.find((diff) => diff.kind === "conflict")!;
    const resolution = {
      diffId: conflict.id,
      strategy: "accept_terrast" as const,
      resolvedBy: "user-preparer",
      reason: "同期元の更新内容を確認済み（テスト）",
      resolvedAt: "2026-02-02T00:00:00.000Z",
    };
    const first = applySyncPreview({
      preview,
      metrics: seed.metrics,
      currentValues: seed.metricValues,
      completedIdempotencyKeys: [],
      resolutions: [resolution],
      selectedDiffIds: preview.diffs
        .filter((diff) => diff.kind !== "unchanged")
        .map((diff) => diff.id),
      actorId: "user-preparer",
      actorOrganizationId: "org-mirai",
      actorRole: "preparer",
      executedAt: resolution.resolvedAt,
    });
    expect(first.alreadyApplied).toBe(false);
    expect(
      first.records.filter((record) => record.action !== "skipped"),
    ).toHaveLength(3);
    expect(
      first.metricValues.filter(
        (value) =>
          value.companyId === "company-mirai" &&
          value.metricCode === "supplier_primary_data_coverage" &&
          value.reportingPeriod === "FY2025",
      ),
    ).toHaveLength(1);

    const second = applySyncPreview({
      preview,
      metrics: seed.metrics,
      currentValues: first.metricValues,
      completedIdempotencyKeys: first.completedIdempotencyKeys,
      resolutions: [resolution],
      actorId: "user-preparer",
      actorOrganizationId: "org-mirai",
      actorRole: "preparer",
      executedAt: "2026-02-03T00:00:00.000Z",
    });
    expect(second.alreadyApplied).toBe(true);
    expect(second.records).toEqual([]);
    expect(second.metricValues).toEqual(first.metricValues);
  });

  it("requires a reason and supports retaining an explicit manual value", () => {
    const { seed, company, incomingRecords } = syncFixture();
    const preview = buildSyncPreview({
      company,
      reportingPeriods: seed.reportingPeriods,
      metrics: seed.metrics,
      localValues: seed.metricValues,
      incomingRecords,
    });
    const conflict = preview.diffs.find((diff) => diff.kind === "conflict")!;
    const metric = seed.metrics.find(
      (candidate) => candidate.code === conflict.metricCode,
    )!;
    expect(() =>
      resolveSyncConflict(
        conflict,
        {
          diffId: conflict.id,
          strategy: "keep_manual",
          resolvedBy: "user-preparer",
          reason: "",
          resolvedAt: "2026-02-02T00:00:00.000Z",
        },
        metric,
      ),
    ).toThrowError(/reason/);
    const resolved = resolveSyncConflict(
      conflict,
      {
        diffId: conflict.id,
        strategy: "keep_manual",
        resolvedBy: "user-preparer",
        reason: "部門確認が完了するまで手動値を維持",
        resolvedAt: "2026-02-02T00:00:00.000Z",
      },
      metric,
    );
    expect(resolved.sourceType).toBe("manual");
    expect(resolved.normalizedValue).toBe(conflict.local?.normalizedValue);
  });

  it("rejects duplicate incoming natural keys and only retries failed jobs", () => {
    const { seed, company, incomingRecords } = syncFixture();
    expect(() =>
      buildSyncPreview({
        company,
        reportingPeriods: seed.reportingPeriods,
        metrics: seed.metrics,
        localValues: seed.metricValues,
        incomingRecords: [incomingRecords[0]!, incomingRecords[0]!],
      }),
    ).toThrowError(/more than one record/);
    const failed = { ...seed.terrastSyncJobs[0]!, status: "failed" as const };
    expect(canRetrySyncJob(failed)).toBe(true);
    expect(
      createSyncRetryJob({
        failedJob: failed,
        newJobId: "retry-1",
        idempotencyKey: "retry-key",
        requestedBy: "user-preparer",
        startedAt: "2026-02-02T00:00:00.000Z",
      }),
    ).toMatchObject({ retryOfJobId: failed.id, status: "pending" });
    expect(() =>
      createSyncRetryJob({
        failedJob: seed.terrastSyncJobs[0]!,
        newJobId: "retry-2",
        idempotencyKey: "retry-key-2",
        requestedBy: "user-preparer",
        startedAt: "2026-02-02T00:00:00.000Z",
      }),
    ).toThrowError(/failed/);
  });
});
