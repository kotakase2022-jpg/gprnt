import type { AuditLog } from "./types";

export class AuditLogError extends Error {
  readonly code: "DUPLICATE_AUDIT_ID";

  constructor(message: string) {
    super(message);
    this.name = "AuditLogError";
    this.code = "DUPLICATE_AUDIT_ID";
  }
}

/** Returns a new append-only collection; existing entries are never mutated. */
export function appendAuditLog(
  logs: readonly AuditLog[],
  entry: AuditLog,
): AuditLog[] {
  if (logs.some((log) => log.id === entry.id)) {
    throw new AuditLogError(`Audit log ${entry.id} already exists.`);
  }
  return [...logs, { ...entry }];
}

export interface AuditLogFilter {
  organizationId: string;
  companyId?: string;
  actorId?: string;
  action?: AuditLog["action"];
  entityType?: string;
  from?: string;
  to?: string;
}

export function filterAuditLogs(
  logs: readonly AuditLog[],
  filter: AuditLogFilter,
): AuditLog[] {
  return logs.filter(
    (log) =>
      log.organizationId === filter.organizationId &&
      (!filter.companyId || log.companyId === filter.companyId) &&
      (!filter.actorId || log.actorId === filter.actorId) &&
      (!filter.action || log.action === filter.action) &&
      (!filter.entityType || log.entityType === filter.entityType) &&
      (!filter.from || log.occurredAt >= filter.from) &&
      (!filter.to || log.occurredAt <= filter.to),
  );
}
