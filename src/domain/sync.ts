import type {
  AuditLog,
  Company,
  MetricDefinition,
  MetricScalar,
  MetricValue,
  ReportingPeriod,
  SyncConflictResolution,
  SyncDiffKind,
  TerrastMetricRecord,
  TerrastSyncDiff,
  TerrastSyncJob,
  TerrastSyncRecord,
} from "./types";
import { convertUnit } from "./units";

export class TerrastSyncError extends Error {
  readonly code:
    | "COMPANY_MISMATCH"
    | "UNKNOWN_PERIOD"
    | "UNKNOWN_METRIC"
    | "INVALID_VALUE_TYPE"
    | "DUPLICATE_INCOMING_RECORD"
    | "INVALID_RETRY"
    | "MISSING_CONFLICT_RESOLUTION"
    | "INVALID_CONFLICT_RESOLUTION";

  constructor(code: TerrastSyncError["code"], message: string) {
    super(message);
    this.name = "TerrastSyncError";
    this.code = code;
  }
}

export interface SyncPreview {
  companyId: string;
  diffs: TerrastSyncDiff[];
  counts: Record<SyncDiffKind, number>;
  idempotencyKey: string;
}

export interface BuildSyncPreviewInput {
  company: Company;
  reportingPeriods: readonly ReportingPeriod[];
  metrics: readonly MetricDefinition[];
  localValues: readonly MetricValue[];
  incomingRecords: readonly TerrastMetricRecord[];
}

const stableHash = (input: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const canonicalScalar = (
  record: TerrastMetricRecord,
  metric: MetricDefinition,
): MetricScalar => {
  if (record.value === null) return null;
  if (metric.valueType === "number") {
    if (typeof record.value !== "number" || !Number.isFinite(record.value)) {
      throw new TerrastSyncError(
        "INVALID_VALUE_TYPE",
        `${record.metricCode} requires a finite numeric value.`,
      );
    }
    return convertUnit(record.value, record.unit, metric.canonicalUnit);
  }
  if (metric.valueType === "text") {
    if (typeof record.value !== "string") {
      throw new TerrastSyncError(
        "INVALID_VALUE_TYPE",
        `${record.metricCode} requires a text value.`,
      );
    }
    return record.value.trim();
  }
  if (typeof record.value !== "boolean") {
    throw new TerrastSyncError(
      "INVALID_VALUE_TYPE",
      `${record.metricCode} requires a boolean value.`,
    );
  }
  return record.value;
};

const scalarsEqual = (left: MetricScalar, right: MetricScalar): boolean => {
  if (typeof left === "number" && typeof right === "number") {
    const scale = Math.max(1, Math.abs(left), Math.abs(right));
    return Math.abs(left - right) <= Number.EPSILON * scale * 8;
  }
  return Object.is(left, right);
};

export function createMetricIdentityKey(
  companyId: string,
  metricCode: string,
  reportingPeriodId: string,
  consolidationScope: string,
  organizationalBoundary: string,
): string {
  return [
    companyId,
    metricCode,
    reportingPeriodId,
    consolidationScope.trim(),
    organizationalBoundary.trim(),
  ]
    .map((part) => encodeURIComponent(part))
    .join("|");
}

const localIdentityKey = (value: MetricValue): string =>
  createMetricIdentityKey(
    value.companyId,
    value.metricCode,
    value.reportingPeriodId,
    value.consolidationScope,
    value.organizationalBoundary,
  );

const incomingFingerprint = (records: readonly TerrastMetricRecord[]): string =>
  records
    .map((record) =>
      [
        record.externalRecordId,
        record.companyCode,
        record.metricCode,
        record.reportingPeriod,
        JSON.stringify(record.value),
        record.unit,
        record.consolidationScope,
        record.organizationalBoundary,
        record.updatedAt,
      ].join("\u001f"),
    )
    .sort()
    .join("\u001e");

export function createSyncIdempotencyKey(
  companyId: string,
  records: readonly TerrastMetricRecord[],
): string {
  return `terrast-sync:${companyId}:${stableHash(incomingFingerprint(records))}`;
}

export function buildSyncPreview(input: BuildSyncPreviewInput): SyncPreview {
  const periodsByLabel = new Map(
    input.reportingPeriods
      .filter((period) => period.companyId === input.company.id)
      .map((period) => [period.label, period]),
  );
  const metricsByCode = new Map(
    input.metrics.map((metric) => [metric.code, metric]),
  );
  const localByIdentity = new Map(
    input.localValues
      .filter((value) => value.companyId === input.company.id)
      .map((value) => [localIdentityKey(value), value]),
  );

  const seenIncomingIdentities = new Set<string>();
  const diffs = input.incomingRecords.map<TerrastSyncDiff>((incoming) => {
    if (incoming.companyCode !== input.company.companyCode) {
      throw new TerrastSyncError(
        "COMPANY_MISMATCH",
        `Incoming company code ${incoming.companyCode} does not match ${input.company.companyCode}.`,
      );
    }
    const period = periodsByLabel.get(incoming.reportingPeriod);
    if (!period) {
      throw new TerrastSyncError(
        "UNKNOWN_PERIOD",
        `Unknown reporting period ${incoming.reportingPeriod}.`,
      );
    }
    const metric = metricsByCode.get(incoming.metricCode);
    if (!metric) {
      throw new TerrastSyncError(
        "UNKNOWN_METRIC",
        `Unknown metric code ${incoming.metricCode}.`,
      );
    }

    const identityKey = createMetricIdentityKey(
      input.company.id,
      incoming.metricCode,
      period.id,
      incoming.consolidationScope,
      incoming.organizationalBoundary,
    );
    if (seenIncomingIdentities.has(identityKey)) {
      throw new TerrastSyncError(
        "DUPLICATE_INCOMING_RECORD",
        `The incoming payload contains more than one record for ${incoming.metricCode} ${incoming.reportingPeriod}.`,
      );
    }
    seenIncomingIdentities.add(identityKey);
    const local = localByIdentity.get(identityKey);
    const normalizedValue = canonicalScalar(incoming, metric);
    const changedFields: TerrastSyncDiff["changedFields"] = [];

    if (local) {
      if (!scalarsEqual(local.normalizedValue, normalizedValue))
        changedFields.push("normalizedValue");
      if (local.unit !== metric.canonicalUnit) changedFields.push("unit");
      if (local.consolidationScope !== incoming.consolidationScope)
        changedFields.push("consolidationScope");
      if (local.organizationalBoundary !== incoming.organizationalBoundary)
        changedFields.push("organizationalBoundary");
    }

    let kind: SyncDiffKind;
    if (!local) kind = "added";
    else if (changedFields.length === 0) kind = "unchanged";
    else if (local.sourceType === "manual" || local.manualOverride)
      kind = "conflict";
    else kind = "updated";

    const baseDiff = {
      id: `sync-diff:${stableHash(`${identityKey}|${incoming.externalRecordId}`)}`,
      identityKey,
      companyId: input.company.id,
      metricCode: incoming.metricCode,
      reportingPeriodId: period.id,
      incoming,
      changedFields,
      selected: kind === "added" || kind === "updated",
    };
    if (kind === "added") return { ...baseDiff, kind };
    // Every non-added branch was derived from an existing local value above.
    if (!local)
      throw new TerrastSyncError(
        "INVALID_VALUE_TYPE",
        "A non-added diff requires a local value.",
      );
    return { ...baseDiff, kind, local };
  });

  const counts: Record<SyncDiffKind, number> = {
    added: 0,
    updated: 0,
    conflict: 0,
    unchanged: 0,
  };
  for (const diff of diffs) counts[diff.kind] += 1;

  return {
    companyId: input.company.id,
    diffs,
    counts,
    idempotencyKey: createSyncIdempotencyKey(
      input.company.id,
      input.incomingRecords,
    ),
  };
}

function metricValueFromIncoming(
  diff: TerrastSyncDiff,
  metric: MetricDefinition,
  at: string,
  existing?: MetricValue,
): MetricValue {
  const normalizedValue = canonicalScalar(diff.incoming, metric);
  const common = {
    id: existing?.id ?? `metric-value:${stableHash(diff.identityKey)}`,
    companyId: diff.companyId,
    metricCode: diff.metricCode,
    reportingPeriodId: diff.reportingPeriodId,
    reportingPeriod: diff.incoming.reportingPeriod,
    unit: metric.canonicalUnit,
    originalUnit: diff.incoming.unit,
    consolidationScope: diff.incoming.consolidationScope,
    organizationalBoundary: diff.incoming.organizationalBoundary,
    sourceType: "terrast" as const,
    sourceSystem: diff.incoming.sourceSystem,
    sourceRecordId: diff.incoming.externalRecordId,
    sourceDocument: diff.incoming.sourceDocument ?? null,
    importedAt: existing?.importedAt ?? at,
    lastUpdatedAt: at,
    confidenceLevel: diff.incoming.confidenceLevel,
    verificationStatus: existing?.verificationStatus ?? ("unverified" as const),
    ownerId: existing?.ownerId ?? null,
    reviewerId: existing?.reviewerId ?? null,
    evidenceIds: existing?.evidenceIds ?? [],
    changeReason: null,
    manualOverride: false,
    version: (existing?.version ?? 0) + 1,
  };

  if (metric.valueType === "number") {
    return {
      ...common,
      valueType: "number",
      value: normalizedValue as number | null,
      originalValue: diff.incoming.value as number | null,
      normalizedValue: normalizedValue as number | null,
    };
  }
  if (metric.valueType === "text") {
    return {
      ...common,
      valueType: "text",
      value: normalizedValue as string | null,
      originalValue: diff.incoming.value as string | null,
      normalizedValue: normalizedValue as string | null,
    };
  }
  return {
    ...common,
    valueType: "boolean",
    value: normalizedValue as boolean | null,
    originalValue: diff.incoming.value as boolean | null,
    normalizedValue: normalizedValue as boolean | null,
  };
}

export function resolveSyncConflict(
  diff: TerrastSyncDiff,
  resolution: SyncConflictResolution,
  metric: MetricDefinition,
): MetricValue {
  if (diff.kind !== "conflict" || !diff.local) {
    throw new TerrastSyncError(
      "INVALID_CONFLICT_RESOLUTION",
      "Only a conflict with an existing value can be resolved.",
    );
  }
  if (!resolution.reason.trim()) {
    throw new TerrastSyncError(
      "INVALID_CONFLICT_RESOLUTION",
      "A conflict resolution reason is required.",
    );
  }

  if (resolution.strategy === "keep_manual") {
    return {
      ...diff.local,
      changeReason: resolution.reason,
      lastUpdatedAt: resolution.resolvedAt,
      version: diff.local.version + 1,
    };
  }

  if (resolution.strategy === "accept_terrast") {
    return {
      ...metricValueFromIncoming(
        diff,
        metric,
        resolution.resolvedAt,
        diff.local,
      ),
      changeReason: resolution.reason,
    };
  }

  if (resolution.overrideValue === undefined || !resolution.overrideUnit) {
    throw new TerrastSyncError(
      "INVALID_CONFLICT_RESOLUTION",
      "Manual override requires a value and unit.",
    );
  }

  const overrideIncoming: TerrastSyncDiff = {
    ...diff,
    incoming: {
      ...diff.incoming,
      value: resolution.overrideValue,
      unit: resolution.overrideUnit,
    },
  };
  const normalized = metricValueFromIncoming(
    overrideIncoming,
    metric,
    resolution.resolvedAt,
    diff.local,
  );
  return {
    ...normalized,
    sourceType: "manual",
    sourceSystem: "MANUAL_OVERRIDE",
    sourceRecordId: `manual:${resolution.diffId}`,
    manualOverride: true,
    changeReason: resolution.reason,
  };
}

export interface ApplySyncPreviewInput {
  preview: SyncPreview;
  metrics: readonly MetricDefinition[];
  currentValues: readonly MetricValue[];
  completedIdempotencyKeys: readonly string[];
  resolutions: readonly SyncConflictResolution[];
  actorId: string;
  actorOrganizationId: string;
  actorRole: AuditLog["actorRole"];
  executedAt: string;
  selectedDiffIds?: readonly string[];
}

export interface SyncExecutionResult {
  metricValues: MetricValue[];
  job: TerrastSyncJob;
  records: TerrastSyncRecord[];
  auditLogs: AuditLog[];
  alreadyApplied: boolean;
  completedIdempotencyKeys: string[];
}

export function applySyncPreview(
  input: ApplySyncPreviewInput,
): SyncExecutionResult {
  const jobId = `sync-job:${stableHash(input.preview.idempotencyKey)}`;
  const alreadyApplied = input.completedIdempotencyKeys.includes(
    input.preview.idempotencyKey,
  );
  const baseJob: TerrastSyncJob = {
    id: jobId,
    companyId: input.preview.companyId,
    requestedBy: input.actorId,
    mode: "apply",
    status: "completed",
    idempotencyKey: input.preview.idempotencyKey,
    startedAt: input.executedAt,
    completedAt: input.executedAt,
    counts: { ...input.preview.counts },
  };

  if (alreadyApplied) {
    return {
      metricValues: [...input.currentValues],
      job: baseJob,
      records: [],
      auditLogs: [],
      alreadyApplied: true,
      completedIdempotencyKeys: [...input.completedIdempotencyKeys],
    };
  }

  const metricsByCode = new Map(
    input.metrics.map((metric) => [metric.code, metric]),
  );
  const resolutionsByDiff = new Map(
    input.resolutions.map((resolution) => [resolution.diffId, resolution]),
  );
  const selectedIds = input.selectedDiffIds
    ? new Set(input.selectedDiffIds)
    : undefined;
  const valuesByIdentity = new Map(
    input.currentValues.map((value) => [localIdentityKey(value), value]),
  );
  const records: TerrastSyncRecord[] = [];

  for (const diff of input.preview.diffs) {
    const selected = selectedIds
      ? selectedIds.has(diff.id)
      : diff.selected || resolutionsByDiff.has(diff.id);
    if (!selected || diff.kind === "unchanged") {
      records.push({
        id: `sync-record:${stableHash(`${jobId}|${diff.id}`)}`,
        syncJobId: jobId,
        diffId: diff.id,
        ...(diff.local
          ? {
              metricValueId: diff.local.id,
              before: diff.local,
              after: diff.local,
            }
          : {}),
        action: "skipped",
        processedAt: input.executedAt,
      });
      continue;
    }

    const metric = metricsByCode.get(diff.metricCode);
    if (!metric)
      throw new TerrastSyncError(
        "UNKNOWN_METRIC",
        `Unknown metric code ${diff.metricCode}.`,
      );
    let after: MetricValue;
    let action: TerrastSyncRecord["action"];
    let resolution: SyncConflictResolution | undefined;

    if (diff.kind === "conflict") {
      resolution = resolutionsByDiff.get(diff.id);
      if (!resolution) {
        throw new TerrastSyncError(
          "MISSING_CONFLICT_RESOLUTION",
          `Conflict ${diff.id} requires an explicit resolution.`,
        );
      }
      after = resolveSyncConflict(diff, resolution, metric);
      action = "conflict_resolved";
    } else {
      after = metricValueFromIncoming(
        diff,
        metric,
        input.executedAt,
        diff.local,
      );
      action = diff.kind === "added" ? "inserted" : "updated";
    }

    valuesByIdentity.set(diff.identityKey, after);
    records.push({
      id: `sync-record:${stableHash(`${jobId}|${diff.id}`)}`,
      syncJobId: jobId,
      diffId: diff.id,
      metricValueId: after.id,
      ...(diff.local ? { before: diff.local } : {}),
      after,
      ...(resolution ? { resolution } : {}),
      action,
      processedAt: input.executedAt,
    });
  }

  const changedCount = records.filter(
    (record) => record.action !== "skipped",
  ).length;
  const auditLogs: AuditLog[] = [
    {
      id: `audit:${stableHash(`${jobId}|${input.executedAt}`)}`,
      organizationId: input.actorOrganizationId,
      companyId: input.preview.companyId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: "sync",
      entityType: "terrast_sync_job",
      entityId: jobId,
      occurredAt: input.executedAt,
      reason: `Applied ${changedCount} selected synthetic/external sync change(s).`,
      correlationId: jobId,
      syncJobId: jobId,
    },
  ];

  return {
    metricValues: [...valuesByIdentity.values()],
    job: baseJob,
    records,
    auditLogs,
    alreadyApplied: false,
    completedIdempotencyKeys: [
      ...input.completedIdempotencyKeys,
      input.preview.idempotencyKey,
    ],
  };
}

export function dryRunSync(input: BuildSyncPreviewInput): SyncPreview {
  return buildSyncPreview(input);
}

export function canRetrySyncJob(job: TerrastSyncJob): boolean {
  return job.status === "failed";
}

export function createSyncRetryJob(input: {
  failedJob: TerrastSyncJob;
  newJobId: string;
  idempotencyKey: string;
  requestedBy: string;
  startedAt: string;
}): TerrastSyncJob {
  if (!canRetrySyncJob(input.failedJob)) {
    throw new TerrastSyncError(
      "INVALID_RETRY",
      "Only a failed synchronization job can be retried.",
    );
  }
  return {
    id: input.newJobId,
    companyId: input.failedJob.companyId,
    requestedBy: input.requestedBy,
    mode: input.failedJob.mode,
    status: "pending",
    idempotencyKey: input.idempotencyKey,
    startedAt: input.startedAt,
    retryOfJobId: input.failedJob.id,
    counts: { added: 0, updated: 0, conflict: 0, unchanged: 0 },
  };
}
