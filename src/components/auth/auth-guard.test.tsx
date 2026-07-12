import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppAuthGuard } from "./auth-guard";

const mocks = vi.hoisted(() => ({
  mode: "demo" as "demo" | "supabase" | "misconfigured",
  replace: vi.fn(),
  syncTrustedRole: vi.fn(),
  syncTrustedCompanies: vi.fn(),
  companyOrder: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/components/demo/demo-session", () => ({
  useDemoSession: () => ({
    syncTrustedRole: mocks.syncTrustedRole,
    syncTrustedCompanies: mocks.syncTrustedCompanies,
  }),
}));

vi.mock("@/lib/auth/runtime", () => ({
  getPublicRuntimeMode: () => mocks.mode,
}));

vi.mock("@/lib/supabase/client", () => ({
  getLazySupabaseClient: () => ({
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      signOut: mocks.signOut,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    from: () => ({
      select: () => ({ order: mocks.companyOrder }),
    }),
  }),
}));

describe("AppAuthGuard", () => {
  beforeEach(() => {
    mocks.mode = "demo";
    mocks.replace.mockReset();
    mocks.syncTrustedRole.mockReset();
    mocks.syncTrustedCompanies.mockReset();
    mocks.companyOrder.mockReset();
    mocks.companyOrder.mockResolvedValue({ data: [], error: null });
    mocks.getSession.mockReset();
    mocks.getUser.mockReset();
    mocks.signOut.mockReset();
    mocks.unsubscribe.mockReset();
    mocks.onAuthStateChange.mockReset();
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mocks.unsubscribe } },
    });
  });

  it("leaves the existing Demo Mode flow untouched", () => {
    render(
      <AppAuthGuard>
        <div>protected workspace</div>
      </AppAuthGuard>,
    );

    expect(screen.getByText("protected workspace")).toBeVisible();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("redirects an unauthenticated Supabase session to /demo", async () => {
    mocks.mode = "supabase";
    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    render(
      <AppAuthGuard>
        <div>protected workspace</div>
      </AppAuthGuard>,
    );

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/demo"));
    expect(screen.queryByText("protected workspace")).not.toBeInTheDocument();
  });

  it("verifies the user and syncs the trusted role and RLS-visible companies", async () => {
    mocks.mode = "supabase";
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "session-token" } },
      error: null,
    });
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "reviewer@example.com",
          app_metadata: { role: "reviewer_approver" },
        },
      },
      error: null,
    });
    mocks.companyOrder.mockResolvedValue({
      data: [
        {
          id: "company-1",
          legal_name: "テスト株式会社",
          company_code: "C-001",
        },
      ],
      error: null,
    });
    render(
      <AppAuthGuard>
        <div>protected workspace</div>
      </AppAuthGuard>,
    );

    expect(await screen.findByText("protected workspace")).toBeVisible();
    expect(mocks.getUser).toHaveBeenCalledWith("session-token");
    expect(mocks.syncTrustedRole).toHaveBeenCalledWith("reviewer_approver");
    expect(mocks.syncTrustedCompanies).toHaveBeenCalledWith([
      { id: "company-1", name: "テスト株式会社", code: "C-001" },
    ]);
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
