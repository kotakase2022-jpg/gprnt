import { AppAuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { DemoSessionProvider } from "@/components/demo/demo-session";
import { DemoWorkspaceProvider } from "@/components/demo/demo-workspace";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoSessionProvider>
      <AppAuthGuard>
        <DemoWorkspaceProvider>
          <AppShell>{children}</AppShell>
        </DemoWorkspaceProvider>
      </AppAuthGuard>
    </DemoSessionProvider>
  );
}
