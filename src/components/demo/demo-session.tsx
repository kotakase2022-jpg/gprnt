"use client";

import * as React from "react";
import type { UserRole } from "@/domain";
import { getPublicRuntimeMode } from "@/lib/auth/runtime";

export const demoRoles = [
  {
    id: "system_admin",
    label: "Sustainable Lab System Admin",
    shortLabel: "システム管理者",
  },
  {
    id: "platform_operator_demo_admin",
    label: "Exchange / Platform Operator Demo Admin",
    shortLabel: "運営者",
  },
  { id: "company_admin", label: "Company Admin", shortLabel: "企業管理者" },
  { id: "preparer", label: "Preparer", shortLabel: "作成者" },
  {
    id: "reviewer_approver",
    label: "Reviewer / Approver",
    shortLabel: "レビュー・承認者",
  },
  {
    id: "external_assurer_read_only",
    label: "External Assurer / Read Only",
    shortLabel: "外部保証・閲覧",
  },
  { id: "supplier_user", label: "Supplier User", shortLabel: "サプライヤー" },
] as const;

export type DemoRole = UserRole;

export const demoCompanies = [
  {
    id: "mirai-manufacturing",
    name: "日本未来製造株式会社",
    code: "DEMO-1001",
  },
  { id: "next-retail", name: "ネクストリテール株式会社", code: "DEMO-2002" },
  {
    id: "green-tech-services",
    name: "グリーンテックサービス株式会社",
    code: "DEMO-3003",
  },
] as const;

type DemoSessionValue = {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
  syncTrustedRole: (role: DemoRole) => void;
  companyId: string;
  setCompanyId: (companyId: string) => void;
  resetDemo: () => void;
  hydrated: boolean;
};

const DemoSessionContext = React.createContext<DemoSessionValue | null>(null);
const SESSION_KEY = "terrast-demo-session-v1";

export function DemoSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const runtimeMode = getPublicRuntimeMode();
  const [role, setRoleState] = React.useState<DemoRole>("company_admin");
  const [companyId, setCompanyIdState] = React.useState<string>(
    demoCompanies[0].id,
  );
  const [hydrated, setHydrated] = React.useState(runtimeMode !== "demo");

  React.useEffect(() => {
    if (runtimeMode !== "demo") return;

    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(SESSION_KEY);
        if (saved) {
          const value = JSON.parse(saved) as {
            role?: DemoRole;
            companyId?: string;
          };
          if (demoRoles.some((item) => item.id === value.role))
            setRoleState(value.role!);
          if (demoCompanies.some((item) => item.id === value.companyId))
            setCompanyIdState(value.companyId!);
        }
        const queryRole = new URLSearchParams(window.location.search).get(
          "role",
        ) as DemoRole | null;
        if (queryRole && demoRoles.some((item) => item.id === queryRole))
          setRoleState(queryRole);
      } catch {
        // Storage restrictions must not prevent demo use.
      } finally {
        setHydrated(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [runtimeMode]);

  React.useEffect(() => {
    if (runtimeMode !== "demo" || !hydrated) return;
    try {
      window.localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ role, companyId }),
      );
    } catch {
      // Storage restrictions must not prevent demo use.
    }
  }, [role, companyId, hydrated, runtimeMode]);

  const setRole = React.useCallback(
    (nextRole: DemoRole) => {
      if (runtimeMode === "demo") setRoleState(nextRole);
    },
    [runtimeMode],
  );

  const syncTrustedRole = React.useCallback(
    (nextRole: DemoRole) => {
      if (runtimeMode === "supabase") setRoleState(nextRole);
    },
    [runtimeMode],
  );

  const resetDemo = React.useCallback(() => {
    try {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem("terrast-demo-workspace-v1");
    } catch {
      // Storage restrictions must not prevent resetting in-memory demo state.
    }
    setRoleState("company_admin");
    setCompanyIdState(demoCompanies[0].id);
    window.dispatchEvent(new CustomEvent("terrast-demo-reset"));
  }, []);

  const value = React.useMemo<DemoSessionValue>(
    () => ({
      role,
      setRole,
      syncTrustedRole,
      companyId,
      setCompanyId: setCompanyIdState,
      resetDemo,
      hydrated,
    }),
    [role, setRole, syncTrustedRole, companyId, resetDemo, hydrated],
  );

  return <DemoSessionContext value={value}>{children}</DemoSessionContext>;
}

export function useDemoSession() {
  const value = React.use(DemoSessionContext);
  if (!value)
    throw new Error("useDemoSession must be used within DemoSessionProvider");
  return value;
}
