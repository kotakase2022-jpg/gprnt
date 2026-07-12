import { describe, expect, it } from "vitest";
import { createDemoSeed } from "@/data";
import { authorize, can, type AccessPrincipal } from "./rbac";

const principal = (
  overrides: Partial<AccessPrincipal> = {},
): AccessPrincipal => ({
  userId: "user-preparer",
  role: "preparer",
  organizationId: "org-mirai",
  companyIds: ["company-mirai"],
  assignedResourceIds: [],
  ...overrides,
});

describe("RBAC", () => {
  it("enforces company and tenant scope in addition to the role permission", () => {
    expect(
      can(principal(), {
        permission: "metric:write",
        resourceOrganizationId: "org-mirai",
        resourceCompanyId: "company-mirai",
      }),
    ).toBe(true);
    expect(
      authorize(principal(), {
        permission: "metric:write",
        resourceOrganizationId: "org-next-retail",
        resourceCompanyId: "company-next-retail",
      }),
    ).toEqual({ allowed: false, reason: "tenant_mismatch" });
  });

  it("allows platform operators aggregate data and only consented individual detail", () => {
    const seed = createDemoSeed();
    const operator = principal({
      role: "platform_operator_demo_admin",
      organizationId: "org-platform",
      companyIds: [],
    });
    expect(
      can(operator, { permission: "aggregate:read", aggregateOnly: true }),
    ).toBe(true);
    expect(
      can(operator, {
        permission: "company:read:consented",
        resourceCompanyId: "company-mirai",
        sharingConsent: seed.companySharingConsents[0],
        now: "2026-02-01T00:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      can(operator, {
        permission: "company:read:consented",
        resourceCompanyId: "company-mirai",
        sharingConsent: seed.companySharingConsents[0],
      }),
    ).toBe(false);
    const selectedMetricConsent = {
      ...seed.companySharingConsents[0]!,
      scope: "selected_metrics" as const,
      metricCodes: ["scope_1_emissions"],
    };
    expect(
      can(operator, {
        permission: "company:read:consented",
        resourceCompanyId: "company-mirai",
        resourceMetricCode: "scope_1_emissions",
        sharingConsent: selectedMetricConsent,
        now: "2026-02-01T00:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      can(operator, {
        permission: "company:read:consented",
        resourceCompanyId: "company-mirai",
        resourceMetricCode: "scope_3_emissions",
        sharingConsent: selectedMetricConsent,
        now: "2026-02-01T00:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      can(operator, {
        permission: "company:read:consented",
        resourceCompanyId: "company-next-retail",
        now: "2026-02-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("limits external assurers and suppliers to assigned resources", () => {
    const seed = createDemoSeed();
    const assurer = principal({
      role: "external_assurer_read_only",
      organizationId: "org-assurance",
      assignedResourceIds: ["evidence-1"],
    });
    expect(
      can(assurer, {
        permission: "evidence:read",
        resourceId: "evidence-1",
        resourceOrganizationId: "org-mirai",
        resourceCompanyId: "company-mirai",
      }),
    ).toBe(true);
    expect(
      can(assurer, {
        permission: "evidence:read",
        resourceId: "evidence-2",
        resourceCompanyId: "company-mirai",
      }),
    ).toBe(false);
    const supplier = principal({
      role: "supplier_user",
      organizationId: "org-supplier",
      companyIds: [],
      assignedResourceIds: ["supplier-request-mirai-001"],
    });
    const openRequest = {
      ...seed.supplierRequests[0]!,
      status: "sent" as const,
    };
    expect(
      can(supplier, {
        permission: "supplier_response:write:assigned",
        resourceId: "supplier-request-mirai-001",
        supplierRequest: openRequest,
        now: "2026-02-01T00:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      can(supplier, {
        permission: "supplier_response:write:assigned",
        resourceId: "another",
        supplierRequest: openRequest,
      }),
    ).toBe(false);
    expect(
      can(supplier, {
        permission: "supplier_response:write:assigned",
        resourceId: "supplier-request-mirai-001",
        supplierRequest: seed.supplierRequests[0],
      }),
    ).toBe(false);
  });
});
