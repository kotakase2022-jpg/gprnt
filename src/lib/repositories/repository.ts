import type {
  AuditLog,
  Company,
  CompanySharingConsent,
  DemoDataset,
  DisclosureResponse,
  AiGenerationLog,
  Approval,
  MarketplaceOffering,
  MetricDefinition,
  MetricValue,
  ReportingPeriod,
  ReviewComment,
  ReviewTask,
  SupplierRequest,
  SupplierResponse,
  TerrastSyncJob,
  TerrastSyncRecord,
  TransitionAction,
  TransitionTarget,
} from "@/domain/types";
import type { AuditLogFilter } from "@/domain/audit";
import type { SyncExecutionResult } from "@/domain/sync";

/**
 * Persistence ports only. They are not an authorization boundary and must not
 * be exposed directly to an untrusted client. Server entry points must validate
 * input, call the domain RBAC decision, and rely on RLS as defense in depth.
 */

export interface MetricValueQuery {
  companyId?: string;
  reportingPeriodId?: string;
  metricCodes?: readonly string[];
}

export interface DisclosureResponseQuery {
  companyId?: string;
  reportingPeriodId?: string;
  requirementId?: string;
}

export interface CompanyRepository {
  listCompanies(): Promise<Company[]>;
  getCompany(companyId: string): Promise<Company | undefined>;
  listReportingPeriods(companyId: string): Promise<ReportingPeriod[]>;
  listSharingConsents(companyId: string): Promise<CompanySharingConsent[]>;
  saveSharingConsent(
    consent: CompanySharingConsent,
  ): Promise<CompanySharingConsent>;
}

export interface MetricRepository {
  listMetrics(organizationId?: string): Promise<MetricDefinition[]>;
  listMetricValues(query?: MetricValueQuery): Promise<MetricValue[]>;
  upsertMetricValue(value: MetricValue): Promise<MetricValue>;
}

export interface DisclosureRepository {
  listDisclosureResponses(
    query?: DisclosureResponseQuery,
  ): Promise<DisclosureResponse[]>;
  saveDisclosureResponse(
    response: DisclosureResponse,
  ): Promise<DisclosureResponse>;
}

export interface ReviewRepository {
  listReviewTasks(responseId?: string): Promise<ReviewTask[]>;
  saveReviewTask(task: ReviewTask): Promise<ReviewTask>;
  listReviewComments(reviewTaskId: string): Promise<ReviewComment[]>;
  appendReviewComment(comment: ReviewComment): Promise<ReviewComment>;
  listApprovals(responseId: string): Promise<Approval[]>;
  saveApproval(approval: Approval): Promise<Approval>;
}

export interface TerrastSyncRepository {
  listSyncJobs(companyId: string): Promise<TerrastSyncJob[]>;
  listSyncRecords(syncJobId: string): Promise<TerrastSyncRecord[]>;
  saveSyncExecution(result: SyncExecutionResult): Promise<void>;
}

export interface SupplierRepository {
  listSupplierRequests(companyId: string): Promise<SupplierRequest[]>;
  listSupplierResponses(requestId: string): Promise<SupplierResponse[]>;
  saveSupplierResponse(response: SupplierResponse): Promise<SupplierResponse>;
}

export interface TransitionPlanRepository {
  listTransitionTargets(companyId: string): Promise<TransitionTarget[]>;
  listTransitionActions(companyId: string): Promise<TransitionAction[]>;
  saveTransitionAction(action: TransitionAction): Promise<TransitionAction>;
}

export interface MarketplaceRepository {
  listMarketplaceOfferings(): Promise<MarketplaceOffering[]>;
}

export interface AuditLogRepository {
  listAuditLogs(filter: AuditLogFilter): Promise<AuditLog[]>;
  appendAuditLog(entry: AuditLog): Promise<AuditLog>;
}

export interface AiGenerationRepository {
  listAiGenerationLogs(companyId: string): Promise<AiGenerationLog[]>;
  appendAiGenerationLog(entry: AiGenerationLog): Promise<AiGenerationLog>;
}

export interface SustainabilityRepository
  extends
    CompanyRepository,
    MetricRepository,
    DisclosureRepository,
    ReviewRepository,
    TerrastSyncRepository,
    SupplierRepository,
    TransitionPlanRepository,
    MarketplaceRepository,
    AuditLogRepository,
    AiGenerationRepository {
  getSnapshot(): Promise<DemoDataset>;
  replaceSnapshot(dataset: DemoDataset): Promise<void>;
  reset(): Promise<void>;
  transaction<T>(
    operation: (repository: SustainabilityRepository) => Promise<T>,
  ): Promise<T>;
}
