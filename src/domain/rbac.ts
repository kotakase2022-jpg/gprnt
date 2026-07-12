import type {
  CompanySharingConsent,
  Permission,
  SupplierRequest,
  UserRole,
} from "./types";

const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly Permission[]>> = {
  system_admin: [
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
  ],
  platform_operator_demo_admin: [
    "aggregate:read",
    "company:read:consented",
    "report:export",
  ],
  company_admin: [
    "company:read",
    "company:manage",
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
    "transition:read",
    "transition:write",
    "report:export",
  ],
  preparer: [
    "company:read",
    "metric:read",
    "metric:write",
    "evidence:read",
    "evidence:write",
    "disclosure:read",
    "disclosure:write",
    "ai:generate",
    "supplier_request:manage",
    "supplier_response:read",
    "transition:read",
    "transition:write",
    "report:export",
  ],
  reviewer_approver: [
    "company:read",
    "metric:read",
    "evidence:read",
    "disclosure:read",
    "disclosure:review",
    "disclosure:approve",
    "supplier_response:read",
    "transition:read",
    "report:export",
  ],
  external_assurer_read_only: [
    "company:read",
    "metric:read",
    "evidence:read",
    "disclosure:read",
    "transition:read",
    "report:export",
  ],
  supplier_user: ["supplier_response:write:assigned"],
};

export interface AccessPrincipal {
  userId: string;
  role: UserRole;
  organizationId: string;
  companyIds: string[];
  assignedResourceIds: string[];
}

export interface AccessRequest {
  permission: Permission;
  resourceOrganizationId?: string;
  resourceCompanyId?: string;
  resourceId?: string;
  resourceMetricCode?: string;
  aggregateOnly?: boolean;
  sharingConsent?: CompanySharingConsent;
  supplierRequest?: SupplierRequest;
  now?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason:
    | "role_permission"
    | "system_admin"
    | "same_tenant_company"
    | "aggregate_only"
    | "active_company_consent"
    | "assigned_resource"
    | "assigned_supplier_request"
    | "permission_missing"
    | "tenant_mismatch"
    | "company_out_of_scope"
    | "consent_missing_or_expired"
    | "resource_not_assigned";
}

export function permissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

const isConsentActive = (
  consent: CompanySharingConsent | undefined,
  companyId: string | undefined,
  now?: string,
): boolean => {
  if (
    !consent ||
    !companyId ||
    consent.companyId !== companyId ||
    consent.revokedAt
  )
    return false;
  if (consent.expiresAt && (!now || consent.expiresAt <= now)) return false;
  return true;
};

export function authorize(
  principal: AccessPrincipal,
  request: AccessRequest,
): AuthorizationDecision {
  if (principal.role === "system_admin")
    return { allowed: true, reason: "system_admin" };
  if (!roleHasPermission(principal.role, request.permission)) {
    return { allowed: false, reason: "permission_missing" };
  }

  if (principal.role === "platform_operator_demo_admin") {
    if (request.permission === "aggregate:read" && request.aggregateOnly) {
      return { allowed: true, reason: "aggregate_only" };
    }
    if (
      request.permission === "company:read:consented" &&
      isConsentActive(
        request.sharingConsent,
        request.resourceCompanyId,
        request.now,
      ) &&
      request.sharingConsent?.granteeOrganizationId ===
        principal.organizationId &&
      (request.sharingConsent.scope === "individual_detail" ||
        (request.sharingConsent.scope === "selected_metrics" &&
          typeof request.resourceMetricCode === "string" &&
          request.sharingConsent.metricCodes.includes(
            request.resourceMetricCode,
          )))
    ) {
      return { allowed: true, reason: "active_company_consent" };
    }
    if (request.permission === "report:export" && request.aggregateOnly) {
      return { allowed: true, reason: "aggregate_only" };
    }
    return { allowed: false, reason: "consent_missing_or_expired" };
  }

  if (principal.role === "supplier_user") {
    const supplierRequest = request.supplierRequest;
    if (
      supplierRequest &&
      request.resourceId === supplierRequest.id &&
      principal.assignedResourceIds.includes(supplierRequest.id) &&
      supplierRequest.supplierOrganizationId === principal.organizationId &&
      (supplierRequest.status === "sent" ||
        supplierRequest.status === "revision_requested") &&
      (!request.now ||
        supplierRequest.status === "revision_requested" ||
        supplierRequest.dueDate >= request.now.slice(0, 10))
    ) {
      return { allowed: true, reason: "assigned_supplier_request" };
    }
    return { allowed: false, reason: "resource_not_assigned" };
  }

  if (principal.role === "external_assurer_read_only") {
    if (
      !request.resourceId ||
      !principal.assignedResourceIds.includes(request.resourceId)
    ) {
      return { allowed: false, reason: "resource_not_assigned" };
    }
    return { allowed: true, reason: "assigned_resource" };
  }

  if (
    request.resourceOrganizationId &&
    request.resourceOrganizationId !== principal.organizationId
  ) {
    return { allowed: false, reason: "tenant_mismatch" };
  }
  if (
    request.resourceCompanyId &&
    !principal.companyIds.includes(request.resourceCompanyId)
  ) {
    return { allowed: false, reason: "company_out_of_scope" };
  }

  return {
    allowed: true,
    reason: request.resourceCompanyId
      ? "same_tenant_company"
      : "role_permission",
  };
}

export function can(
  principal: AccessPrincipal,
  request: AccessRequest,
): boolean {
  return authorize(principal, request).allowed;
}
