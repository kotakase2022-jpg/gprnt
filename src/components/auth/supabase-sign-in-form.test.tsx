import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseSignInForm } from "./supabase-sign-in-form";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/supabase/client", () => ({
  getLazySupabaseClient: () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
    },
  }),
}));

describe("SupabaseSignInForm", () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.signInWithPassword.mockReset();
    mocks.signOut.mockReset();
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it("validates the form before calling Supabase", async () => {
    render(<SupabaseSignInForm />);

    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(
      await screen.findByText("メールアドレスを入力してください。"),
    ).toBeVisible();
    expect(screen.getByText("パスワードを入力してください。")).toBeVisible();
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("redirects a valid session to the trusted role home", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: "session-token" },
        user: {
          id: "user-1",
          app_metadata: { role: "reviewer_approver" },
        },
      },
      error: null,
    });
    render(<SupabaseSignInForm />);

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: " reviewer@example.com " },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() =>
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: "reviewer@example.com",
        password: "correct horse battery staple",
      }),
    );
    expect(mocks.replace).toHaveBeenCalledWith("/app/review");
  });

  it("uses one generalized error for credentials and invalid app roles", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: "session-token" },
        user: { id: "user-1", app_metadata: { role: "unknown_role" } },
      },
      error: null,
    });
    render(<SupabaseSignInForm />);

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("パスワード"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(
      await screen.findByText(
        "ログインできませんでした。入力内容を確認して、もう一度お試しください。",
      ),
    ).toBeVisible();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
