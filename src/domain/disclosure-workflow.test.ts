import { describe, expect, it } from "vitest";
import { appendAuditLog } from "./audit";
import { transitionDisclosure } from "./disclosure-workflow";
import type { AuditLog, DisclosureResponse } from "./types";

const response: DisclosureResponse = {
  id: "response-1",
  companyId: "company-1",
  reportingPeriodId: "period-1",
  requirementId: "requirement-1",
  status: "drafted",
  responseText: "Draft",
  sourceMetricValueIds: [],
  evidenceIds: [],
  lastUpdatedBy: "preparer",
  lastUpdatedAt: "2026-01-01T00:00:00.000Z",
  version: 1,
};

describe("disclosure workflow and audit", () => {
  it("supports submit, revision request, revise, resubmit, and approve", () => {
    const submitted = transitionDisclosure({
      response,
      action: "submit_for_review",
      actorId: "preparer",
      actorRole: "preparer",
      occurredAt: "2026-01-02T00:00:00.000Z",
    });
    const returned = transitionDisclosure({
      response: submitted,
      action: "request_revision",
      actorId: "reviewer",
      actorRole: "reviewer_approver",
      occurredAt: "2026-01-03T00:00:00.000Z",
      reason: "Add evidence",
    });
    const revised = transitionDisclosure({
      response: returned,
      action: "save_draft",
      actorId: "preparer",
      actorRole: "preparer",
      occurredAt: "2026-01-04T00:00:00.000Z",
      responseText: "Revised",
    });
    const resubmitted = transitionDisclosure({
      response: revised,
      action: "submit_for_review",
      actorId: "preparer",
      actorRole: "preparer",
      occurredAt: "2026-01-05T00:00:00.000Z",
    });
    const approved = transitionDisclosure({
      response: resubmitted,
      action: "approve",
      actorId: "reviewer",
      actorRole: "reviewer_approver",
      occurredAt: "2026-01-06T00:00:00.000Z",
    });
    expect(approved.status).toBe("approved");
    expect(approved.version).toBe(6);
    expect(approved.responseText).toBe("Revised");
  });

  it("requires reasons and keeps audit history append-only", () => {
    const inReview = { ...response, status: "in_review" as const };
    expect(() =>
      transitionDisclosure({
        response: inReview,
        action: "request_revision",
        actorId: "reviewer",
        actorRole: "reviewer_approver",
        occurredAt: "2026-01-03T00:00:00.000Z",
      }),
    ).toThrowError(/reason/);
    const entry: AuditLog = {
      id: "audit-1",
      organizationId: "org-1",
      actorId: "reviewer",
      actorRole: "reviewer_approver",
      action: "approve",
      entityType: "response",
      entityId: "response-1",
      occurredAt: "2026-01-03T00:00:00.000Z",
      correlationId: "review-1",
    };
    const original: AuditLog[] = [];
    const appended = appendAuditLog(original, entry);
    expect(original).toEqual([]);
    expect(appended).toHaveLength(1);
    expect(() => appendAuditLog(appended, entry)).toThrowError(
      /already exists/,
    );
  });

  it("rejects write actions from read-only roles and prevents reviewer text mutation", () => {
    expect(() =>
      transitionDisclosure({
        response,
        action: "save_draft",
        actorId: "assurer",
        actorRole: "external_assurer_read_only",
        occurredAt: "2026-01-02T00:00:00.000Z",
        responseText: "Unauthorized edit",
      }),
    ).toThrowError(/cannot perform/);

    const inReview = { ...response, status: "in_review" as const };
    const approved = transitionDisclosure({
      response: inReview,
      action: "approve",
      actorId: "reviewer",
      actorRole: "reviewer_approver",
      occurredAt: "2026-01-03T00:00:00.000Z",
      responseText: "Reviewer replacement",
    });
    expect(approved.responseText).toBe("Draft");

    const revoked = transitionDisclosure({
      response: approved,
      action: "revoke_approval",
      actorId: "company-admin",
      actorRole: "company_admin",
      occurredAt: "2026-01-04T00:00:00.000Z",
      reason: "Re-open for correction",
    });
    expect(revoked.status).toBe("revision_requested");
  });
});
