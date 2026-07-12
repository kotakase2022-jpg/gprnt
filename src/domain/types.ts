/**
 * Core domain contracts for the concept MVP.
 *
 * All sample entities carry an explicit synthetic marker. Nothing in these
 * contracts implies a real TERRAST, exchange, issuer, or emissions-factor API.
 */

export type IsoDate = string;
export type IsoDateTime = string;
export type EntityId = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export const USER_ROLES = [
  "system_admin",
  "platform_operator_demo_admin",
  "company_admin",
  "preparer",
  "reviewer_approver",
  "external_assurer_read_only",
  "supplier_user",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  system_admin: "Sustainable Lab System Admin",
  platform_operator_demo_admin: "Exchange / Platform Operator Demo Admin",
  company_admin: "Company Admin",
  preparer: "Preparer",
  reviewer_approver: "Reviewer / Approver",
  external_assurer_read_only: "External Assurer / Read Only",
  supplier_user: "Supplier User",
};

export const PERMISSIONS = [
  "tenant:manage",
  "integration:manage",
  "framework:manage",
  "audit:read:system",
  "aggregate:read",
  "company:read",
  "company:manage",
  "company:read:consented",
  "metric:read",
  "metric:write",
  "evidence:read",
  "evidence:write",
  "disclosure:read",
  "disclosure:write",
  "disclosure:review",
  "disclosure:approve",
  "ai:generate",
  "supplier_request:manage",
  "supplier_response:read",
  "supplier_response:write:assigned",
  "transition:read",
  "transition:write",
  "report:export",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface UserProfile {
  id: EntityId;
  displayName: string;
  email: string;
  locale: "ja" | "en";
  isSynthetic: boolean;
}

export interface Organization {
  id: EntityId;
  name: string;
  type:
    | "system_operator"
    | "platform_operator"
    | "company"
    | "assurance"
    | "supplier";
  isSynthetic: boolean;
  createdAt: IsoDateTime;
}

export interface OrganizationMember {
  id: EntityId;
  organizationId: EntityId;
  userId: EntityId;
  role: UserRole;
  companyIds: EntityId[];
  assignedResourceIds: EntityId[];
  active: boolean;
}

export const INDUSTRIES = [
  "manufacturing",
  "retail",
  "information_services",
  "other",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export interface Company {
  id: EntityId;
  organizationId: EntityId;
  companyCode: string;
  securityCode: string | null;
  name: string;
  nameEn: string | null;
  industry: Industry;
  marketSegment: "demo_prime" | "demo_standard" | "demo_growth" | null;
  size: "large" | "medium" | "small" | null;
  fiscalYearEndMonth: number;
  terrastExternalId: string | null;
  sharingConsent: "none" | "aggregated_only" | "individual_consented";
  isSynthetic: boolean;
}

export interface CompanySharingConsent {
  id: EntityId;
  companyId: EntityId;
  granteeOrganizationId: EntityId;
  scope: "aggregated" | "selected_metrics" | "individual_detail";
  metricCodes: string[];
  grantedBy: EntityId;
  grantedAt: IsoDateTime;
  expiresAt?: IsoDateTime;
  revokedAt?: IsoDateTime;
}

export interface ReportingPeriod {
  id: EntityId;
  companyId: EntityId;
  fiscalYear: number;
  startDate: IsoDate;
  endDate: IsoDate;
  label: string;
  status: "open" | "closed";
}

export const METRIC_CATEGORIES = [
  "environment",
  "human_capital",
  "governance",
  "ghg_emissions",
  "energy",
  "water",
  "waste",
  "diversity",
  "employees",
  "occupational_safety",
  "supply_chain",
  "risk_opportunity",
  "target_performance",
] as const;

export type MetricCategory = (typeof METRIC_CATEGORIES)[number];
export type MetricScalar = number | string | boolean | null;

export const UNITS = [
  "tCO2e",
  "kgCO2e",
  "gCO2e",
  "MWh",
  "kWh",
  "GJ",
  "TJ",
  "m3",
  "L",
  "percent",
  "ratio",
  "people",
  "hours",
  "JPY",
  "million_JPY",
  "t",
  "kg",
  "unitless",
] as const;

export type Unit = (typeof UNITS)[number];

export interface MetricDefinition {
  id?: EntityId;
  code: string;
  name: string;
  description: string;
  category: MetricCategory;
  valueType: "number" | "text" | "boolean";
  canonicalUnit: Unit;
  allowedUnits: Unit[];
  isRequired: boolean;
  isSensitive: boolean;
  terrastFieldKey?: string;
}

export type SourceType =
  | "terrast"
  | "manual"
  | "csv_import"
  | "json_import"
  | "calculation"
  | "supplier";
export type ConfidenceLevel = "unknown" | "low" | "medium" | "high";
export type VerificationStatus =
  "unverified" | "internally_reviewed" | "externally_assured";

interface MetricValueBase {
  id: EntityId;
  companyId: EntityId;
  metricId?: EntityId;
  metricCode: string;
  metricName?: string;
  metricCategory?: MetricCategory;
  reportingPeriodId: EntityId;
  reportingPeriod: string;
  unit: Unit;
  originalUnit: Unit;
  consolidationScope: string;
  organizationalBoundary: string;
  sourceType: SourceType;
  sourceSystem: string;
  sourceRecordId: string;
  sourceDocument: string | null;
  importedAt: IsoDateTime;
  lastUpdatedAt: IsoDateTime;
  confidenceLevel: ConfidenceLevel;
  verificationStatus: VerificationStatus;
  ownerId: EntityId | null;
  reviewerId: EntityId | null;
  evidenceIds: EntityId[];
  changeReason: string | null;
  manualOverride: boolean;
  version: number;
}

export type MetricValue =
  | (MetricValueBase & {
      valueType: "number";
      value: number | null;
      originalValue: number | null;
      normalizedValue: number | null;
    })
  | (MetricValueBase & {
      valueType: "text";
      value: string | null;
      originalValue: string | null;
      normalizedValue: string | null;
    })
  | (MetricValueBase & {
      valueType: "boolean";
      value: boolean | null;
      originalValue: boolean | null;
      normalizedValue: boolean | null;
    });

export type FrameworkCode =
  | "SSBJ_APPLICATION"
  | "SSBJ_GENERAL"
  | "SSBJ_CLIMATE"
  | "SSBJ_IMPLEMENTATION"
  | "IFRS_S1"
  | "IFRS_S2";

export interface Framework {
  id: EntityId;
  code: FrameworkCode;
  name: string;
  referenceUrl: string;
}

export interface FrameworkVersion {
  id: EntityId;
  frameworkId: EntityId;
  version: string;
  effectiveDate: IsoDate;
  status: "draft" | "current" | "superseded";
}

export interface DisclosureRequirement {
  id: EntityId;
  frameworkVersionId: EntityId;
  requirementCode: string;
  summary: string;
  referenceUrl: string;
  applicableFrom: IsoDate;
  status: "active" | "inactive";
  weight: number;
}

export interface RequirementMapping {
  id: EntityId;
  requirementId: EntityId;
  metricCodes: string[];
  mappingType: "required" | "supporting";
}

export const DISCLOSURE_STATUSES = [
  "not_started",
  "data_available",
  "drafted",
  "in_review",
  "revision_requested",
  "approved",
  "not_applicable",
] as const;

export type DisclosureStatus = (typeof DISCLOSURE_STATUSES)[number];

export const DISCLOSURE_STATUS_LABELS: Readonly<
  Record<DisclosureStatus, string>
> = {
  not_started: "Not Started",
  data_available: "Data Available",
  drafted: "Drafted",
  in_review: "In Review",
  revision_requested: "Revision Requested",
  approved: "Approved",
  not_applicable: "Not Applicable",
};

export interface DisclosureResponse {
  id: EntityId;
  companyId: EntityId;
  reportingPeriodId: EntityId;
  requirementId: EntityId;
  status: DisclosureStatus;
  responseText: string;
  sourceMetricValueIds: EntityId[];
  evidenceIds: EntityId[];
  ownerId?: EntityId;
  reviewerId?: EntityId;
  approvalId?: EntityId;
  lastUpdatedBy: EntityId;
  lastUpdatedAt: IsoDateTime;
  version: number;
}

export interface DisclosureDraft {
  id: EntityId;
  responseId: EntityId;
  text: string;
  source: "manual" | "ai_suggestion";
  evidenceMetricValueIds: EntityId[];
  createdBy: EntityId;
  createdAt: IsoDateTime;
  promptVersion?: string;
  model?: string;
}

export interface ReviewTask {
  id: EntityId;
  responseId: EntityId;
  assignedTo: EntityId;
  status: "pending" | "revision_requested" | "approved" | "cancelled";
  dueDate?: IsoDate;
  createdBy: EntityId;
  createdAt: IsoDateTime;
  completedAt?: IsoDateTime;
}

export interface ReviewComment {
  id: EntityId;
  reviewTaskId: EntityId;
  authorId: EntityId | null;
  body: string;
  mentionedUserIds: EntityId[];
  createdAt: IsoDateTime;
  resolvedAt?: IsoDateTime;
}

export interface Approval {
  id: EntityId;
  responseId: EntityId;
  approverId: EntityId;
  status: "approved" | "revoked";
  reason?: string;
  approvedAt: IsoDateTime;
  revokedAt?: IsoDateTime;
}

export interface EvidenceFile {
  id: EntityId;
  companyId: EntityId;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedBy: EntityId;
  uploadedAt: IsoDateTime;
  checksumSha256: string;
  status: "pending_scan" | "available" | "quarantined" | "deleted";
  isSynthetic: true;
}

export interface TerrastMetricRecord {
  externalRecordId: string;
  companyCode: string;
  metricCode: string;
  reportingPeriod: string;
  value: MetricScalar;
  unit: Unit;
  consolidationScope: string;
  organizationalBoundary: string;
  sourceDocument?: string;
  observedAt: IsoDateTime;
  updatedAt: IsoDateTime;
  confidenceLevel: ConfidenceLevel;
  sourceSystem: "TERRAST_MOCK" | "TERRAST_API" | "CSV_IMPORT" | "JSON_IMPORT";
  isSynthetic: boolean;
}

export type SyncDiffKind = "added" | "updated" | "conflict" | "unchanged";

interface TerrastSyncDiffBase {
  id: string;
  identityKey: string;
  companyId: EntityId;
  metricCode: string;
  reportingPeriodId: EntityId;
  incoming: TerrastMetricRecord;
  changedFields: Array<
    keyof Pick<
      MetricValue,
      | "normalizedValue"
      | "unit"
      | "consolidationScope"
      | "organizationalBoundary"
    >
  >;
  selected: boolean;
}

export type TerrastSyncDiff =
  | (TerrastSyncDiffBase & { kind: "added"; local?: never })
  | (TerrastSyncDiffBase & {
      kind: "updated" | "conflict" | "unchanged";
      local: MetricValue;
    });

export type ConflictResolutionStrategy =
  "keep_manual" | "accept_terrast" | "manual_override";

export interface SyncConflictResolution {
  diffId: string;
  strategy: ConflictResolutionStrategy;
  resolvedBy: EntityId;
  reason: string;
  overrideValue?: MetricScalar;
  overrideUnit?: Unit;
  resolvedAt: IsoDateTime;
}

export interface TerrastSyncJob {
  id: EntityId;
  companyId: EntityId;
  requestedBy: EntityId;
  mode: "dry_run" | "apply";
  status: "pending" | "running" | "completed" | "failed";
  idempotencyKey: string;
  startedAt: IsoDateTime;
  completedAt?: IsoDateTime;
  errorCode?: string;
  errorMessage?: string;
  retryOfJobId?: EntityId;
  counts: Record<SyncDiffKind, number>;
}

export interface TerrastSyncRecord {
  id: EntityId;
  syncJobId: EntityId;
  diffId: string;
  metricValueId?: EntityId;
  action: "inserted" | "updated" | "skipped" | "conflict_resolved";
  before?: MetricValue;
  after?: MetricValue;
  resolution?: SyncConflictResolution;
  processedAt: IsoDateTime;
}

export interface QuantifiedValue {
  value: number;
  unit: Unit;
}

export interface EmissionFactor {
  id: EntityId;
  name: string;
  factorValue: number;
  activityUnit: Unit;
  emissionUnit: "kgCO2e" | "tCO2e";
  geography: string;
  factorYear: number;
  version: string;
  sourceLabel: string;
  sourceUrl?: string;
  isDemo: boolean;
}

export type GhgScope = "scope_1" | "scope_2" | "scope_3";
export type Scope2Basis = "location_based" | "market_based";

export interface CalculationRecord {
  id: EntityId;
  companyId: EntityId;
  reportingPeriodId: EntityId;
  scope: GhgScope;
  scope2Basis?: Scope2Basis;
  scope3Category?: Scope3Category;
  activity: QuantifiedValue;
  emissionFactorId: EntityId;
  emissions: QuantifiedValue & { unit: "tCO2e" };
  formula: string;
  methodology: string;
  isEstimated: boolean;
  calculatedAt: IsoDateTime;
}

export const SCOPE3_CATEGORIES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
] as const;
export type Scope3Category = (typeof SCOPE3_CATEGORIES)[number];

export const SCOPE3_CATEGORY_LABELS: Readonly<Record<Scope3Category, string>> =
  {
    1: "購入した製品・サービス",
    2: "資本財",
    3: "燃料・エネルギー関連活動",
    4: "輸送・配送（上流）",
    5: "事業から出る廃棄物",
    6: "出張",
    7: "雇用者の通勤",
    8: "リース資産（上流）",
    9: "輸送・配送（下流）",
    10: "販売した製品の加工",
    11: "販売した製品の使用",
    12: "販売した製品の廃棄",
    13: "リース資産（下流）",
    14: "フランチャイズ",
    15: "投資",
  };

export interface SupplierRequest {
  id: EntityId;
  companyId: EntityId;
  supplierOrganizationId: EntityId;
  metricCodes: string[];
  scope3Categories: Scope3Category[];
  dueDate: IsoDate;
  invitationToken: string;
  status:
    | "draft"
    | "sent"
    | "submitted"
    | "revision_requested"
    | "accepted"
    | "expired";
  createdBy: EntityId;
  createdAt: IsoDateTime;
}

export interface SupplierResponse {
  id: EntityId;
  requestId: EntityId;
  respondentId: EntityId;
  values: Array<{
    metricCode: string;
    value: MetricScalar;
    unit: Unit;
    isEstimated: boolean;
    evidenceIds: EntityId[];
  }>;
  status: "draft" | "submitted" | "revision_requested" | "accepted";
  submittedAt?: IsoDateTime;
  reviewedAt?: IsoDateTime;
  revisionReason?: string;
}

export type ClimateRiskOpportunityType =
  "physical_risk" | "transition_risk" | "opportunity";

export interface ClimateRiskOpportunity {
  id: EntityId;
  companyId: EntityId;
  title: string;
  description: string;
  type: ClimateRiskOpportunityType;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  timeHorizon: "short" | "medium" | "long";
  affectedBusiness: string;
  financialImpactDirection: "positive" | "negative" | "mixed";
  response: string;
  ownerId: EntityId;
  oversight: string;
  status: "identified" | "assessed" | "mitigating" | "monitoring";
}

export interface TransitionTarget {
  id: EntityId;
  companyId: EntityId;
  title: string;
  metricCode: string;
  baselineYear: number;
  baselineValue: number;
  targetYear: number;
  targetValue: number;
  unit: Unit;
  progressValue: number;
  status: "on_track" | "at_risk" | "off_track" | "not_started";
}

export interface TransitionAction {
  id: EntityId;
  companyId: EntityId;
  targetId: EntityId;
  relatedRiskOpportunityIds: EntityId[];
  title: string;
  description: string;
  ownerId: EntityId;
  kpi: string;
  baselineYear: number;
  targetYear: number;
  targetValue: number;
  progressPercent: number;
  investmentType: "capex" | "opex" | "both" | "none";
  investmentAmountMillionJpy?: number;
  oversightStatus: string;
  status: "planned" | "in_progress" | "completed" | "delayed";
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "sync"
  | "submit"
  | "revision_request"
  | "approve"
  | "revoke_approval"
  | "consent_grant"
  | "consent_revoke"
  | "ai_generate"
  | "export";

export interface AuditLog {
  id: EntityId;
  organizationId: EntityId;
  companyId?: EntityId;
  actorId: EntityId;
  actorRole: UserRole;
  action: AuditAction;
  entityType: string;
  entityId: EntityId;
  occurredAt: IsoDateTime;
  before?: JsonValue;
  after?: JsonValue;
  reason?: string;
  correlationId: string;
  syncJobId?: EntityId;
  aiGenerationId?: EntityId;
  ipAddressMasked?: string;
}

export type MarketplaceCategory =
  | "decarbonization"
  | "disclosure_support"
  | "assurance"
  | "education"
  | "green_finance"
  | "subsidy_support";

export interface MarketplaceOffering {
  id: EntityId;
  name: string;
  providerName: string;
  category: MarketplaceCategory;
  description: string;
  supportedIndustries: Industry[];
  supportedHotspots: Array<
    | "scope_1"
    | "scope_2"
    | "scope_3"
    | "human_capital"
    | "disclosure"
    | "transition"
  >;
  supportedGapCodes: string[];
  relatedActionKeywords: string[];
  isSynthetic: true;
  termsDisclaimer: string;
}

export interface AiGenerationLog {
  id: EntityId;
  companyId: EntityId;
  responseId?: EntityId;
  promptVersion: string;
  model: string;
  inputHash: string;
  output: JsonValue;
  executedBy: EntityId;
  executedAt: IsoDateTime;
  status: "completed" | "validation_failed" | "insufficient_evidence";
}

export interface DemoDataset {
  schemaVersion: 1;
  generatedAt: IsoDateTime;
  datasetLabel: "SYNTHETIC DEMO DATA";
  isSynthetic: true;
  organizations: Organization[];
  users: UserProfile[];
  organizationMembers: OrganizationMember[];
  companies: Company[];
  companySharingConsents: CompanySharingConsent[];
  reportingPeriods: ReportingPeriod[];
  frameworks: Framework[];
  frameworkVersions: FrameworkVersion[];
  disclosureRequirements: DisclosureRequirement[];
  requirementMappings: RequirementMapping[];
  metrics: MetricDefinition[];
  metricValues: MetricValue[];
  emissionFactors: EmissionFactor[];
  calculationRecords: CalculationRecord[];
  evidenceFiles: EvidenceFile[];
  disclosureResponses: DisclosureResponse[];
  disclosureDrafts: DisclosureDraft[];
  reviewTasks: ReviewTask[];
  reviewComments: ReviewComment[];
  approvals: Approval[];
  risksOpportunities: ClimateRiskOpportunity[];
  transitionTargets: TransitionTarget[];
  transitionActions: TransitionAction[];
  supplierRequests: SupplierRequest[];
  supplierResponses: SupplierResponse[];
  marketplaceOfferings: MarketplaceOffering[];
  terrastSyncJobs: TerrastSyncJob[];
  terrastSyncRecords: TerrastSyncRecord[];
  aiGenerationLogs: AiGenerationLog[];
  auditLogs: AuditLog[];
}
