import {
  appendAuditLog as appendOnlyAuditLog,
  filterAuditLogs,
} from "@/domain/audit";
import type { AuditLogFilter } from "@/domain/audit";
import type {
  AuditLog,
  AiGenerationLog,
  Approval,
  CompanySharingConsent,
  DemoDataset,
  DisclosureResponse,
  MetricValue,
  ReviewComment,
  ReviewTask,
  SupplierResponse,
  TransitionAction,
} from "@/domain/types";
import { createDemoSeed } from "@/data";
import type {
  DisclosureResponseQuery,
  MetricValueQuery,
  SustainabilityRepository,
} from "./repository";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DemoRepositoryOptions {
  seed?: DemoDataset;
  storage?: StorageLike | null;
  storageKey?: string;
}

export class DemoRepositoryStorageError extends Error {
  readonly code: "READ_FAILED" | "WRITE_FAILED";
  readonly cause?: unknown;

  constructor(
    code: DemoRepositoryStorageError["code"],
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "DemoRepositoryStorageError";
    this.code = code;
    this.cause = cause;
  }
}

const DEFAULT_STORAGE_KEY = "terrast-disclosure-hub:demo:v1";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function browserLocalStorage(): StorageLike | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    // Storage can be blocked by browser policy. Memory mode remains usable.
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDemoDataset(value: unknown): value is DemoDataset {
  if (!isRecord(value)) return false;
  const requiredArrays: Array<keyof DemoDataset> = [
    "organizations",
    "users",
    "organizationMembers",
    "companies",
    "companySharingConsents",
    "reportingPeriods",
    "frameworks",
    "frameworkVersions",
    "disclosureRequirements",
    "requirementMappings",
    "metrics",
    "metricValues",
    "emissionFactors",
    "calculationRecords",
    "evidenceFiles",
    "disclosureResponses",
    "disclosureDrafts",
    "reviewTasks",
    "reviewComments",
    "approvals",
    "risksOpportunities",
    "transitionTargets",
    "transitionActions",
    "supplierRequests",
    "supplierResponses",
    "marketplaceOfferings",
    "terrastSyncJobs",
    "terrastSyncRecords",
    "aiGenerationLogs",
    "auditLogs",
  ];
  return (
    value.schemaVersion === 1 &&
    value.datasetLabel === "SYNTHETIC DEMO DATA" &&
    value.isSynthetic === true &&
    typeof value.generatedAt === "string" &&
    requiredArrays.every((key) => Array.isArray(value[key]))
  );
}

export class DemoRepository implements SustainabilityRepository {
  private readonly seed: DemoDataset;
  private storage?: StorageLike;
  private readonly storageKey: string;
  private dataset: DemoDataset;
  private storageError?: DemoRepositoryStorageError;

  constructor(options: DemoRepositoryOptions = {}) {
    this.seed = clone(options.seed ?? createDemoSeed());
    this.storage =
      options.storage === null
        ? undefined
        : (options.storage ?? browserLocalStorage());
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.dataset = this.load() ?? clone(this.seed);
  }

  getStorageStatus(): {
    mode: "persistent" | "memory";
    error?: DemoRepositoryStorageError;
  } {
    return {
      mode: this.storage ? "persistent" : "memory",
      ...(this.storageError ? { error: this.storageError } : {}),
    };
  }

  private load(): DemoDataset | undefined {
    if (!this.storage) return undefined;
    try {
      const serialized = this.storage.getItem(this.storageKey);
      if (!serialized) return undefined;
      const parsed: unknown = JSON.parse(serialized);
      return isDemoDataset(parsed) ? clone(parsed) : undefined;
    } catch (error) {
      // A corrupt or inaccessible cache must not make demo mode unusable.
      this.storageError = new DemoRepositoryStorageError(
        "READ_FAILED",
        "Unable to read demo data from browser storage.",
        error,
      );
      this.storage = undefined;
      return undefined;
    }
  }

  private persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.dataset));
    } catch (error) {
      this.storageError = new DemoRepositoryStorageError(
        "WRITE_FAILED",
        "Unable to persist demo data to browser storage.",
        error,
      );
      this.storage = undefined;
    }
  }

  async getSnapshot(): Promise<DemoDataset> {
    return clone(this.dataset);
  }

  async replaceSnapshot(dataset: DemoDataset): Promise<void> {
    if (!isDemoDataset(dataset))
      throw new TypeError(
        "The replacement snapshot is not a supported synthetic demo dataset.",
      );
    this.dataset = clone(dataset);
    this.persist();
  }

  async reset(): Promise<void> {
    this.dataset = clone(this.seed);
    if (this.storage) {
      try {
        this.storage.removeItem(this.storageKey);
      } catch (error) {
        this.storageError = new DemoRepositoryStorageError(
          "WRITE_FAILED",
          "Unable to clear persisted demo data.",
          error,
        );
        this.storage = undefined;
      }
    }
  }

  async transaction<T>(
    operation: (repository: SustainabilityRepository) => Promise<T>,
  ): Promise<T> {
    const before = clone(this.dataset);
    try {
      const result = await operation(this);
      this.persist();
      return result;
    } catch (error) {
      this.dataset = before;
      this.persist();
      throw error;
    }
  }

  async listCompanies() {
    return clone(this.dataset.companies);
  }

  async getCompany(companyId: string) {
    const company = this.dataset.companies.find(
      (candidate) => candidate.id === companyId,
    );
    return company ? clone(company) : undefined;
  }

  async listReportingPeriods(companyId: string) {
    return clone(
      this.dataset.reportingPeriods.filter(
        (period) => period.companyId === companyId,
      ),
    );
  }

  async listSharingConsents(companyId: string) {
    return clone(
      this.dataset.companySharingConsents.filter(
        (consent) => consent.companyId === companyId,
      ),
    );
  }

  async saveSharingConsent(
    consent: CompanySharingConsent,
  ): Promise<CompanySharingConsent> {
    const index = this.dataset.companySharingConsents.findIndex(
      (candidate) => candidate.id === consent.id,
    );
    if (index >= 0) this.dataset.companySharingConsents[index] = clone(consent);
    else this.dataset.companySharingConsents.push(clone(consent));
    this.persist();
    return clone(consent);
  }

  async listMetrics() {
    return clone(this.dataset.metrics);
  }

  async listMetricValues(query: MetricValueQuery = {}) {
    return clone(
      this.dataset.metricValues.filter(
        (value) =>
          (!query.companyId || value.companyId === query.companyId) &&
          (!query.reportingPeriodId ||
            value.reportingPeriodId === query.reportingPeriodId) &&
          (!query.metricCodes || query.metricCodes.includes(value.metricCode)),
      ),
    );
  }

  async upsertMetricValue(value: MetricValue): Promise<MetricValue> {
    const index = this.dataset.metricValues.findIndex(
      (candidate) =>
        candidate.id === value.id ||
        (candidate.companyId === value.companyId &&
          candidate.metricCode === value.metricCode &&
          candidate.reportingPeriodId === value.reportingPeriodId &&
          candidate.consolidationScope === value.consolidationScope &&
          candidate.organizationalBoundary === value.organizationalBoundary),
    );
    if (index >= 0) this.dataset.metricValues[index] = clone(value);
    else this.dataset.metricValues.push(clone(value));
    this.persist();
    return clone(value);
  }

  async listDisclosureResponses(query: DisclosureResponseQuery = {}) {
    return clone(
      this.dataset.disclosureResponses.filter(
        (response) =>
          (!query.companyId || response.companyId === query.companyId) &&
          (!query.reportingPeriodId ||
            response.reportingPeriodId === query.reportingPeriodId) &&
          (!query.requirementId ||
            response.requirementId === query.requirementId),
      ),
    );
  }

  async saveDisclosureResponse(
    response: DisclosureResponse,
  ): Promise<DisclosureResponse> {
    const index = this.dataset.disclosureResponses.findIndex(
      (candidate) => candidate.id === response.id,
    );
    if (index >= 0) this.dataset.disclosureResponses[index] = clone(response);
    else this.dataset.disclosureResponses.push(clone(response));
    this.persist();
    return clone(response);
  }

  async listReviewTasks(responseId?: string) {
    return clone(
      this.dataset.reviewTasks.filter(
        (task) => !responseId || task.responseId === responseId,
      ),
    );
  }

  async saveReviewTask(task: ReviewTask): Promise<ReviewTask> {
    const index = this.dataset.reviewTasks.findIndex(
      (candidate) => candidate.id === task.id,
    );
    if (index >= 0) this.dataset.reviewTasks[index] = clone(task);
    else this.dataset.reviewTasks.push(clone(task));
    this.persist();
    return clone(task);
  }

  async listReviewComments(reviewTaskId: string) {
    return clone(
      this.dataset.reviewComments.filter(
        (comment) => comment.reviewTaskId === reviewTaskId,
      ),
    );
  }

  async appendReviewComment(comment: ReviewComment): Promise<ReviewComment> {
    if (
      this.dataset.reviewComments.some(
        (candidate) => candidate.id === comment.id,
      )
    ) {
      throw new TypeError(`Review comment ${comment.id} already exists.`);
    }
    this.dataset.reviewComments.push(clone(comment));
    this.persist();
    return clone(comment);
  }

  async listApprovals(responseId: string) {
    return clone(
      this.dataset.approvals.filter(
        (approval) => approval.responseId === responseId,
      ),
    );
  }

  async saveApproval(approval: Approval): Promise<Approval> {
    const index = this.dataset.approvals.findIndex(
      (candidate) => candidate.id === approval.id,
    );
    if (index >= 0) this.dataset.approvals[index] = clone(approval);
    else this.dataset.approvals.push(clone(approval));
    this.persist();
    return clone(approval);
  }

  async listSyncJobs(companyId: string) {
    return clone(
      this.dataset.terrastSyncJobs.filter((job) => job.companyId === companyId),
    );
  }

  async listSyncRecords(syncJobId: string) {
    return clone(
      this.dataset.terrastSyncRecords.filter(
        (record) => record.syncJobId === syncJobId,
      ),
    );
  }

  async saveSyncExecution(
    result: import("@/domain/sync").SyncExecutionResult,
  ): Promise<void> {
    if (result.alreadyApplied) return;
    await this.transaction(async () => {
      this.dataset.metricValues = clone(result.metricValues);
      const jobIndex = this.dataset.terrastSyncJobs.findIndex(
        (job) => job.idempotencyKey === result.job.idempotencyKey,
      );
      if (jobIndex >= 0)
        this.dataset.terrastSyncJobs[jobIndex] = clone(result.job);
      else this.dataset.terrastSyncJobs.push(clone(result.job));
      for (const record of result.records) {
        if (
          !this.dataset.terrastSyncRecords.some(
            (candidate) => candidate.id === record.id,
          )
        ) {
          this.dataset.terrastSyncRecords.push(clone(record));
        }
      }
      for (const audit of result.auditLogs) {
        if (
          !this.dataset.auditLogs.some((candidate) => candidate.id === audit.id)
        ) {
          this.dataset.auditLogs = appendOnlyAuditLog(
            this.dataset.auditLogs,
            clone(audit),
          );
        }
      }
    });
  }

  async listSupplierRequests(companyId: string) {
    return clone(
      this.dataset.supplierRequests.filter(
        (request) => request.companyId === companyId,
      ),
    );
  }

  async listSupplierResponses(requestId: string) {
    return clone(
      this.dataset.supplierResponses.filter(
        (response) => response.requestId === requestId,
      ),
    );
  }

  async saveSupplierResponse(
    response: SupplierResponse,
  ): Promise<SupplierResponse> {
    const index = this.dataset.supplierResponses.findIndex(
      (candidate) => candidate.id === response.id,
    );
    if (index >= 0) this.dataset.supplierResponses[index] = clone(response);
    else this.dataset.supplierResponses.push(clone(response));
    this.persist();
    return clone(response);
  }

  async listTransitionTargets(companyId: string) {
    return clone(
      this.dataset.transitionTargets.filter(
        (target) => target.companyId === companyId,
      ),
    );
  }

  async listTransitionActions(companyId: string) {
    return clone(
      this.dataset.transitionActions.filter(
        (action) => action.companyId === companyId,
      ),
    );
  }

  async saveTransitionAction(
    action: TransitionAction,
  ): Promise<TransitionAction> {
    const index = this.dataset.transitionActions.findIndex(
      (candidate) => candidate.id === action.id,
    );
    if (index >= 0) this.dataset.transitionActions[index] = clone(action);
    else this.dataset.transitionActions.push(clone(action));
    this.persist();
    return clone(action);
  }

  async listMarketplaceOfferings() {
    return clone(this.dataset.marketplaceOfferings);
  }

  async listAuditLogs(filter: AuditLogFilter) {
    return clone(filterAuditLogs(this.dataset.auditLogs, filter));
  }

  async appendAuditLog(entry: AuditLog): Promise<AuditLog> {
    this.dataset.auditLogs = appendOnlyAuditLog(
      this.dataset.auditLogs,
      clone(entry),
    );
    this.persist();
    return clone(entry);
  }

  async listAiGenerationLogs(companyId: string) {
    return clone(
      this.dataset.aiGenerationLogs.filter(
        (entry) => entry.companyId === companyId,
      ),
    );
  }

  async appendAiGenerationLog(
    entry: AiGenerationLog,
  ): Promise<AiGenerationLog> {
    if (
      this.dataset.aiGenerationLogs.some(
        (candidate) => candidate.id === entry.id,
      )
    ) {
      throw new TypeError(`AI generation log ${entry.id} already exists.`);
    }
    this.dataset.aiGenerationLogs.push(clone(entry));
    this.persist();
    return clone(entry);
  }
}
