"use client";

import * as React from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDemoSession } from "@/components/demo/demo-session";
import { readTrustedAppRole } from "@/lib/auth/roles";
import {
  getPublicRuntimeMode,
  type PublicRuntimeMode,
} from "@/lib/auth/runtime";
import { getLazySupabaseClient } from "@/lib/supabase/client";

type AppAuthValue = {
  mode: Extract<PublicRuntimeMode, "demo" | "supabase">;
  accessToken: string | null;
  email: string | null;
  signOut: () => Promise<void>;
};

type GuardState =
  | { status: "loading"; accessToken: null; email: null }
  | {
      status: "authenticated";
      accessToken: string | null;
      email: string | null;
    };

const AppAuthContext = React.createContext<AppAuthValue | null>(null);

async function clearLocalSession(client: SupabaseClient): Promise<void> {
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    // The route remains denied even if local cleanup is unavailable.
  }
}

export function AppAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const runtimeMode = getPublicRuntimeMode();
  const { syncTrustedRole } = useDemoSession();
  const [state, setState] = React.useState<GuardState>(() =>
    runtimeMode === "demo"
      ? { status: "authenticated", accessToken: null, email: null }
      : { status: "loading", accessToken: null, email: null },
  );

  React.useEffect(() => {
    if (runtimeMode === "demo") return;
    if (runtimeMode === "misconfigured") {
      router.replace("/demo");
      return;
    }

    let client: SupabaseClient;
    try {
      client = getLazySupabaseClient();
    } catch {
      router.replace("/demo");
      return;
    }

    let cancelled = false;
    let revision = 0;
    const pendingTimers = new Set<number>();

    const denyAccess = () => {
      if (cancelled) return;
      setState({ status: "loading", accessToken: null, email: null });
      router.replace("/demo");
    };

    const verifySession = async (session: Session | null) => {
      const currentRevision = ++revision;
      if (!session) {
        denyAccess();
        return;
      }

      const { data, error } = await client.auth.getUser(session.access_token);
      if (cancelled || currentRevision !== revision) return;

      const trustedRole = error
        ? null
        : readTrustedAppRole(data.user?.app_metadata);
      if (!data.user || !trustedRole) {
        denyAccess();
        void clearLocalSession(client);
        return;
      }

      syncTrustedRole(trustedRole);
      setState({
        status: "authenticated",
        accessToken: session.access_token,
        email: data.user.email ?? null,
      });
    };

    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          denyAccess();
          return;
        }
        void verifySession(data.session);
      })
      .catch(denyAccess);

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      // Supabase recommends keeping this callback synchronous. Defer any SDK
      // call so token refresh and storage locks can finish first.
      const timer = window.setTimeout(() => {
        pendingTimers.delete(timer);
        void verifySession(session);
      }, 0);
      pendingTimers.add(timer);
    });

    return () => {
      cancelled = true;
      revision += 1;
      subscription.unsubscribe();
      pendingTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [router, runtimeMode, syncTrustedRole]);

  const signOut = React.useCallback(async () => {
    if (runtimeMode !== "supabase") return;

    const { error } = await getLazySupabaseClient().auth.signOut({
      scope: "local",
    });
    if (error) throw new Error("ログアウトを完了できませんでした。");

    setState({ status: "loading", accessToken: null, email: null });
    router.replace("/demo");
  }, [router, runtimeMode]);

  const contextValue = React.useMemo<AppAuthValue | null>(() => {
    if (runtimeMode === "misconfigured") return null;
    return {
      mode: runtimeMode,
      accessToken: state.accessToken,
      email: state.email,
      signOut,
    };
  }, [runtimeMode, signOut, state.accessToken, state.email]);

  if (state.status !== "authenticated" || !contextValue) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-muted/35 px-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="text-center text-sm text-muted-foreground">
          <LoaderCircle className="mx-auto mb-3 size-6 animate-spin" />
          {runtimeMode === "misconfigured"
            ? "認証設定が完了していません。"
            : "認証状態を確認しています。"}
        </div>
      </div>
    );
  }

  return <AppAuthContext value={contextValue}>{children}</AppAuthContext>;
}

export function useAppAuth(): AppAuthValue {
  const value = React.use(AppAuthContext);
  if (!value) throw new Error("useAppAuth must be used within AppAuthGuard");
  return value;
}
