import type { UserRole } from "@/domain";

const SYSTEM_ONLY: readonly UserRole[] = ["system_admin"];
const COMPANY_READ_ROLES: readonly UserRole[] = [
  "system_admin",
  "company_admin",
  "preparer",
  "reviewer_approver",
  "external_assurer_read_only",
];

export const APP_ROUTE_ROLES: Readonly<
  Record<`/app/${string}`, readonly UserRole[]>
> = {
  "/app/dashboard": COMPANY_READ_ROLES,
  "/app/sync": ["system_admin", "company_admin", "preparer"],
  "/app/data": COMPANY_READ_ROLES,
  "/app/disclosures": COMPANY_READ_ROLES,
  "/app/ghg": COMPANY_READ_ROLES,
  "/app/suppliers": [
    "system_admin",
    "company_admin",
    "preparer",
    "reviewer_approver",
    "supplier_user",
  ],
  "/app/transition": COMPANY_READ_ROLES,
  "/app/assistant": ["system_admin", "company_admin", "preparer"],
  "/app/review": ["system_admin", "company_admin", "reviewer_approver"],
  "/app/reports": COMPANY_READ_ROLES,
  "/app/marketplace": COMPANY_READ_ROLES,
  "/app/operator": ["system_admin", "platform_operator_demo_admin"],
  "/app/audit": [
    "system_admin",
    "company_admin",
    "preparer",
    "reviewer_approver",
  ],
  "/app/settings": ["system_admin", "company_admin"],
  // Reserved system administration surface. No page is exposed in this MVP.
  "/app/system": SYSTEM_ONLY,
};

export function canAccessAppPath(role: UserRole, pathname: string): boolean {
  if (pathname === "/app") return true;

  const route = Object.keys(APP_ROUTE_ROLES)
    .sort((left, right) => right.length - left.length)
    .find((candidate) =>
      pathname === candidate ? true : pathname.startsWith(`${candidate}/`),
    ) as keyof typeof APP_ROUTE_ROLES | undefined;

  return route ? APP_ROUTE_ROLES[route].includes(role) : false;
}

export function appHomeForRole(role: UserRole): `/app/${string}` {
  switch (role) {
    case "system_admin":
      return "/app/audit";
    case "platform_operator_demo_admin":
      return "/app/operator";
    case "company_admin":
      return "/app/dashboard";
    case "preparer":
      return "/app/sync";
    case "reviewer_approver":
      return "/app/review";
    case "external_assurer_read_only":
      return "/app/data";
    case "supplier_user":
      return "/app/suppliers";
  }
}
