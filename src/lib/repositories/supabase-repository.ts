import type { SupabaseClient } from "@supabase/supabase-js";
import { getLazySupabaseClient } from "@/lib/supabase/client";
import type { SustainabilityRepository } from "./repository";
import { SupabaseSchemaAdapter } from "./supabase-schema-adapter";
import type { SupabaseMetricCommandTransport } from "./supabase-metric-command";

export type SupabaseRepositoryDelegateFactory = (
  client: SupabaseClient,
) => SustainabilityRepository | Promise<SustainabilityRepository>;

export interface SupabaseRepositoryOptions {
  getClient?: () => SupabaseClient;
  /**
   * Optional full adapter override. Without one, the reviewed metric-data
   * slice is enabled and every other operation remains explicitly fail-closed.
   */
  delegateFactory?: SupabaseRepositoryDelegateFactory;
  metricCommandTransport?: SupabaseMetricCommandTransport;
}

export class SupabaseRepository implements SustainabilityRepository {
  private readonly getClient: () => SupabaseClient;
  private readonly delegateFactory: SupabaseRepositoryDelegateFactory;
  private delegatePromise?: Promise<SustainabilityRepository>;

  constructor(options: SupabaseRepositoryOptions = {}) {
    this.getClient = options.getClient ?? getLazySupabaseClient;
    this.delegateFactory =
      options.delegateFactory ??
      ((client) =>
        new SupabaseSchemaAdapter(client, {
          metricCommandTransport: options.metricCommandTransport,
        }));
  }

  private delegate(): Promise<SustainabilityRepository> {
    this.delegatePromise ??= Promise.resolve(
      this.delegateFactory(this.getClient()),
    );
    return this.delegatePromise;
  }

  async getSnapshot() {
    return (await this.delegate()).getSnapshot();
  }
  async replaceSnapshot(
    dataset: Parameters<SustainabilityRepository["replaceSnapshot"]>[0],
  ) {
    return (await this.delegate()).replaceSnapshot(dataset);
  }
  async reset() {
    return (await this.delegate()).reset();
  }
  async transaction<T>(
    operation: (repository: SustainabilityRepository) => Promise<T>,
  ) {
    return (await this.delegate()).transaction(operation);
  }
  async listCompanies() {
    return (await this.delegate()).listCompanies();
  }
  async getCompany(companyId: string) {
    return (await this.delegate()).getCompany(companyId);
  }
  async listReportingPeriods(companyId: string) {
    return (await this.delegate()).listReportingPeriods(companyId);
  }
  async listSharingConsents(companyId: string) {
    return (await this.delegate()).listSharingConsents(companyId);
  }
  async saveSharingConsent(
    consent: Parameters<SustainabilityRepository["saveSharingConsent"]>[0],
  ) {
    return (await this.delegate()).saveSharingConsent(consent);
  }
  async listMetrics(organizationId?: string) {
    return (await this.delegate()).listMetrics(organizationId);
  }
  async listMetricValues(
    query?: Parameters<SustainabilityRepository["listMetricValues"]>[0],
  ) {
    return (await this.delegate()).listMetricValues(query);
  }
  async upsertMetricValue(
    value: Parameters<SustainabilityRepository["upsertMetricValue"]>[0],
  ) {
    return (await this.delegate()).upsertMetricValue(value);
  }
  async listDisclosureResponses(
    query?: Parameters<SustainabilityRepository["listDisclosureResponses"]>[0],
  ) {
    return (await this.delegate()).listDisclosureResponses(query);
  }
  async saveDisclosureResponse(
    response: Parameters<SustainabilityRepository["saveDisclosureResponse"]>[0],
  ) {
    return (await this.delegate()).saveDisclosureResponse(response);
  }
  async listReviewTasks(responseId?: string) {
    return (await this.delegate()).listReviewTasks(responseId);
  }
  async saveReviewTask(
    task: Parameters<SustainabilityRepository["saveReviewTask"]>[0],
  ) {
    return (await this.delegate()).saveReviewTask(task);
  }
  async listReviewComments(reviewTaskId: string) {
    return (await this.delegate()).listReviewComments(reviewTaskId);
  }
  async appendReviewComment(
    comment: Parameters<SustainabilityRepository["appendReviewComment"]>[0],
  ) {
    return (await this.delegate()).appendReviewComment(comment);
  }
  async listApprovals(responseId: string) {
    return (await this.delegate()).listApprovals(responseId);
  }
  async saveApproval(
    approval: Parameters<SustainabilityRepository["saveApproval"]>[0],
  ) {
    return (await this.delegate()).saveApproval(approval);
  }
  async listSyncJobs(companyId: string) {
    return (await this.delegate()).listSyncJobs(companyId);
  }
  async listSyncRecords(syncJobId: string) {
    return (await this.delegate()).listSyncRecords(syncJobId);
  }
  async saveSyncExecution(
    result: Parameters<SustainabilityRepository["saveSyncExecution"]>[0],
  ) {
    return (await this.delegate()).saveSyncExecution(result);
  }
  async listSupplierRequests(companyId: string) {
    return (await this.delegate()).listSupplierRequests(companyId);
  }
  async listSupplierResponses(requestId: string) {
    return (await this.delegate()).listSupplierResponses(requestId);
  }
  async saveSupplierResponse(
    response: Parameters<SustainabilityRepository["saveSupplierResponse"]>[0],
  ) {
    return (await this.delegate()).saveSupplierResponse(response);
  }
  async listTransitionTargets(companyId: string) {
    return (await this.delegate()).listTransitionTargets(companyId);
  }
  async listTransitionActions(companyId: string) {
    return (await this.delegate()).listTransitionActions(companyId);
  }
  async saveTransitionAction(
    action: Parameters<SustainabilityRepository["saveTransitionAction"]>[0],
  ) {
    return (await this.delegate()).saveTransitionAction(action);
  }
  async listMarketplaceOfferings() {
    return (await this.delegate()).listMarketplaceOfferings();
  }
  async listAuditLogs(
    filter: Parameters<SustainabilityRepository["listAuditLogs"]>[0],
  ) {
    return (await this.delegate()).listAuditLogs(filter);
  }
  async appendAuditLog(
    entry: Parameters<SustainabilityRepository["appendAuditLog"]>[0],
  ) {
    return (await this.delegate()).appendAuditLog(entry);
  }
  async listAiGenerationLogs(companyId: string) {
    return (await this.delegate()).listAiGenerationLogs(companyId);
  }
  async appendAiGenerationLog(
    entry: Parameters<SustainabilityRepository["appendAiGenerationLog"]>[0],
  ) {
    return (await this.delegate()).appendAiGenerationLog(entry);
  }
}
