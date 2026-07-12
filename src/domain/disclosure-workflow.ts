import type { DisclosureResponse, DisclosureStatus, UserRole } from "./types";

export type DisclosureWorkflowAction =
  | "mark_data_available"
  | "save_draft"
  | "submit_for_review"
  | "request_revision"
  | "approve"
  | "revoke_approval"
  | "mark_not_applicable";

const TRANSITIONS: Readonly<
  Record<DisclosureWorkflowAction, readonly DisclosureStatus[]>
> = {
  mark_data_available: ["not_started"],
  save_draft: [
    "not_started",
    "data_available",
    "drafted",
    "revision_requested",
  ],
  submit_for_review: ["drafted"],
  request_revision: ["in_review"],
  approve: ["in_review"],
  revoke_approval: ["approved"],
  mark_not_applicable: [
    "not_started",
    "data_available",
    "drafted",
    "revision_requested",
  ],
};

const ACTION_RESULT: Readonly<
  Record<DisclosureWorkflowAction, DisclosureStatus>
> = {
  mark_data_available: "data_available",
  save_draft: "drafted",
  submit_for_review: "in_review",
  request_revision: "revision_requested",
  approve: "approved",
  revoke_approval: "revision_requested",
  mark_not_applicable: "not_applicable",
};

const ACTION_ROLES: Readonly<
  Record<DisclosureWorkflowAction, readonly UserRole[]>
> = {
  mark_data_available: ["system_admin", "company_admin", "preparer"],
  save_draft: ["system_admin", "company_admin", "preparer"],
  submit_for_review: ["system_admin", "company_admin", "preparer"],
  request_revision: ["system_admin", "company_admin", "reviewer_approver"],
  approve: ["system_admin", "company_admin", "reviewer_approver"],
  revoke_approval: ["system_admin", "company_admin", "reviewer_approver"],
  mark_not_applicable: ["system_admin", "company_admin", "preparer"],
};

export class DisclosureWorkflowError extends Error {
  readonly code: "INVALID_TRANSITION" | "REASON_REQUIRED" | "ROLE_NOT_ALLOWED";

  constructor(code: DisclosureWorkflowError["code"], message: string) {
    super(message);
    this.name = "DisclosureWorkflowError";
    this.code = code;
  }
}

export interface TransitionDisclosureInput {
  response: DisclosureResponse;
  action: DisclosureWorkflowAction;
  actorId: string;
  actorRole: UserRole;
  occurredAt: string;
  reason?: string;
  responseText?: string;
}

export function transitionDisclosure(
  input: TransitionDisclosureInput,
): DisclosureResponse {
  if (!TRANSITIONS[input.action].includes(input.response.status)) {
    throw new DisclosureWorkflowError(
      "INVALID_TRANSITION",
      `Cannot ${input.action} from disclosure status ${input.response.status}.`,
    );
  }

  if (!ACTION_ROLES[input.action].includes(input.actorRole)) {
    throw new DisclosureWorkflowError(
      "ROLE_NOT_ALLOWED",
      `${input.actorRole} cannot perform ${input.action}.`,
    );
  }
  if (
    (input.action === "request_revision" ||
      input.action === "revoke_approval" ||
      input.action === "mark_not_applicable") &&
    !input.reason?.trim()
  ) {
    throw new DisclosureWorkflowError(
      "REASON_REQUIRED",
      `${input.action} requires a reason.`,
    );
  }

  return {
    ...input.response,
    status: ACTION_RESULT[input.action],
    responseText:
      input.action === "save_draft" && input.responseText !== undefined
        ? input.responseText
        : input.response.responseText,
    lastUpdatedBy: input.actorId,
    lastUpdatedAt: input.occurredAt,
    version: input.response.version + 1,
  };
}
