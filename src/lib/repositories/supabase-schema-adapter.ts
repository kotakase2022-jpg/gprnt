import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DemoDataset,
  MetricDefinition,
  MetricValue,
} from "@/domain/types";
import {
  mapSupabaseCompany,
  mapSupabaseMetricDefinition,
  mapSupabaseMetricValue,
  mapSupabaseReportingPeriod,
} from "./supabase-mappers";
import {
  BrowserMetricCommandTransport,
  type SupabaseMetricCommandTransport,
} from "./supabase-metric-command";
import type { MetricValueQuery, SustainabilityRepository } from "./repository";

const COMPANY_SELECT = `
  id,
  organization_id,
  company_code,
  legal_name,
  name_en,
  securities_code,
  industry_category,
  market_segment,
  size_category,
  fiscal_year_end_month,
  terrast_external_id,
  is_demo,
  company_sharing_consents:company_sharing_consents!company_sharing_consents_company_tenant_fkey (
    status,
    data_categories,
    valid_from,
    valid_until,
    revoked_at
  )
`;

const METRIC_SELECT = `
  id,
  organization_id,
  metric_code,
  name,
  description,
  category,
  value_type,
  canonical_unit,
  allowed_units,
  is_required,
  is_sensitive,
  terrast_field_key
`;

export const METRIC_VALUE_SELECT = `
  id,
  company_id,
  metric_id,
  reporting_period_id,
  value_json,
  original_value,
  normalized_value,
  unit,
  original_unit,
  consolidation_scope,
  organizational_boundary,
  source_type,
  source_system,
  source_record_id,
  source_document,
  imported_at,
  last_updated_at,
  confidence_level,
  verification_status,
  owner_user_id,
  reviewer_user_id,
  change_reason,
  created_at,
  manual_override,
  version,
  metrics!inner (
    id,
    metric_code,
    name,
    description,
    category,
    value_type,
    canonical_unit,
    allowed_units,
    is_required,
    is_sensitive,
    terrast_field_key
  ),
  reporting_periods:reporting_periods!metric_values_period_tenant_fkey (label)
`;

export class SupabaseRepositoryOperationError extends Error {
  readonly code: "QUERY_FAILED" | "UNSUPPORTED_OPERATION";
  readonly operation: string;

  constructor(
    code: SupabaseRepositoryOperationError["code"],
    operation: string,
  ) {
    super(
      code === "QUERY_FAILED"
        ? `Supabase query failed for ${operation}.`
        : `Supabase operation ${operation} is not enabled in this production slice.`,
    );
    this.name = "SupabaseRepositoryOperationError";
    this.code = code;
    this.operation = operation;
  }
}

export interface SupabaseSchemaAdapterOptions {
  metricCommandTransport?: SupabaseMetricCommandTransport;
}

export class SupabaseSchemaAdapter implements SustainabilityRepository {
  private readonly client: SupabaseClient;
  private readonly metricCommandTransport: SupabaseMetricCommandTransport;

  constructor(
    client: SupabaseClient,
    options: SupabaseSchemaAdapterOptions = {},
  ) {
    this.client = client;
    this.metricCommandTransport =
      options.metricCommandTransport ??
      new BrowserMetricCommandTransport(client);
  }

  private unsupported(operation: string): never {
    throw new SupabaseRepositoryOperationError(
      "UNSUPPORTED_OPERATION",
      operation,
    );
  }

  private queryFailed(operation: string): never {
    throw new SupabaseRepositoryOperationError("QUERY_FAILED", operation);
  }

  async listCompanies() {
    const { data, error } = await this.client
      .from("companies")
      .select(COMPANY_SELECT)
      .order("legal_name");
    if (error || !data) this.queryFailed("listCompanies");
    return data.map((row) => mapSupabaseCompany(row));
  }

  async getCompany(companyId: string) {
    const { data, error } = await this.client
      .from("companies")
      .select(COMPANY_SELECT)
      .eq("id", companyId)
      .maybeSingle();
    if (error) this.queryFailed("getCompany");
    return data ? mapSupabaseCompany(data) : undefined;
  }

  async listReportingPeriods(companyId: string) {
    const { data, error } = await this.client
      .from("reporting_periods")
      .select("id, company_id, label, start_date, end_date, status")
      .eq("company_id", companyId)
      .in("status", ["open", "closed"])
      .order("end_date", { ascending: false });
    if (error || !data) this.queryFailed("listReportingPeriods");
    return data.map(mapSupabaseReportingPeriod);
  }

  async listMetrics(organizationId?: string) {
    let request = this.client
      .from("metrics")
      .select(METRIC_SELECT)
      .eq("status", "active")
      .neq("value_type", "json");
    request = organizationId
      ? request.or(
          `organization_id.is.null,organization_id.eq.${organizationId}`,
        )
      : request.is("organization_id", null);
    const { data, error } = await request.order("metric_code");
    if (error || !data) this.queryFailed("listMetrics");

    const definitions = new Map<string, MetricDefinition>();
    for (const row of data) {
      const definition = mapSupabaseMetricDefinition(row);
      const rowOrganizationId =
        (row as { organization_id?: string | null }).organization_id ?? null;
      if (rowOrganizationId !== null && rowOrganizationId !== organizationId)
        this.queryFailed("listMetrics.scope");
      if (
        !definitions.has(definition.code) ||
        rowOrganizationId === organizationId
      )
        definitions.set(definition.code, definition);
    }
    return [...definitions.values()];
  }

  async listMetricValues(query: MetricValueQuery = {}) {
    let request = this.client.from("metric_values").select(METRIC_VALUE_SELECT);
    if (query.companyId) request = request.eq("company_id", query.companyId);
    if (query.reportingPeriodId)
      request = request.eq("reporting_period_id", query.reportingPeriodId);
    if (query.metricCodes?.length)
      request = request.in("metrics.metric_code", [...query.metricCodes]);
    const { data, error } = await request.order("last_updated_at", {
      ascending: false,
    });
    if (error || !data) this.queryFailed("listMetricValues");

    const ids = data.map((row) => row.id as string);
    const evidenceByMetric = new Map<string, string[]>();
    if (ids.length) {
      const evidence = await this.client
        .from("evidence_files")
        .select("id, entity_id")
        .eq("entity_type", "metric_value")
        .is("deleted_at", null)
        .in("entity_id", ids);
      if (evidence.error || !evidence.data)
        this.queryFailed("listMetricValues.evidence");
      for (const item of evidence.data) {
        const entityId = item.entity_id as string;
        const current = evidenceByMetric.get(entityId) ?? [];
        current.push(item.id as string);
        evidenceByMetric.set(entityId, current);
      }
    }

    return data.map((row) =>
      mapSupabaseMetricValue(row, evidenceByMetric.get(row.id as string) ?? []),
    );
  }

  async upsertMetricValue(value: MetricValue): Promise<MetricValue> {
    const savedRow =
      await this.metricCommandTransport.saveManualMetricValue(value);
    // The command response is the atomic commit result. Evidence is not
    // mutated by this slice, so preserve the caller's already RLS-scoped IDs
    // instead of adding a post-commit reread that could report a false failure.
    return mapSupabaseMetricValue(savedRow, value.evidenceIds);
  }

  async getSnapshot(): Promise<DemoDataset> {
    return this.unsupported("getSnapshot");
  }
  async replaceSnapshot(): Promise<void> {
    return this.unsupported("replaceSnapshot");
  }
  async reset(): Promise<void> {
    return this.unsupported("reset");
  }
  async transaction<T>(): Promise<T> {
    return this.unsupported("transaction");
  }
  async listSharingConsents() {
    return this.unsupported("listSharingConsents");
  }
  async saveSharingConsent() {
    return this.unsupported("saveSharingConsent");
  }
  async listDisclosureResponses() {
    return this.unsupported("listDisclosureResponses");
  }
  async saveDisclosureResponse() {
    return this.unsupported("saveDisclosureResponse");
  }
  async listReviewTasks() {
    return this.unsupported("listReviewTasks");
  }
  async saveReviewTask() {
    return this.unsupported("saveReviewTask");
  }
  async listReviewComments() {
    return this.unsupported("listReviewComments");
  }
  async appendReviewComment() {
    return this.unsupported("appendReviewComment");
  }
  async listApprovals() {
    return this.unsupported("listApprovals");
  }
  async saveApproval() {
    return this.unsupported("saveApproval");
  }
  async listSyncJobs() {
    return this.unsupported("listSyncJobs");
  }
  async listSyncRecords() {
    return this.unsupported("listSyncRecords");
  }
  async saveSyncExecution(): Promise<void> {
    return this.unsupported("saveSyncExecution");
  }
  async listSupplierRequests() {
    return this.unsupported("listSupplierRequests");
  }
  async listSupplierResponses() {
    return this.unsupported("listSupplierResponses");
  }
  async saveSupplierResponse() {
    return this.unsupported("saveSupplierResponse");
  }
  async listTransitionTargets() {
    return this.unsupported("listTransitionTargets");
  }
  async listTransitionActions() {
    return this.unsupported("listTransitionActions");
  }
  async saveTransitionAction() {
    return this.unsupported("saveTransitionAction");
  }
  async listMarketplaceOfferings() {
    return this.unsupported("listMarketplaceOfferings");
  }
  async listAuditLogs() {
    return this.unsupported("listAuditLogs");
  }
  async appendAuditLog() {
    return this.unsupported("appendAuditLog");
  }
  async listAiGenerationLogs() {
    return this.unsupported("listAiGenerationLogs");
  }
  async appendAiGenerationLog() {
    return this.unsupported("appendAiGenerationLog");
  }
}
