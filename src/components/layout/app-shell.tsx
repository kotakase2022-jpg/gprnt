"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bot,
  Building2,
  ChevronDown,
  ClipboardCheck,
  DatabaseZap,
  FileBarChart,
  Gauge,
  History,
  Leaf,
  LogOut,
  Menu,
  Network,
  RefreshCw,
  Settings,
  ShieldCheck,
  Store,
  Target,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AccessDenied } from "@/components/auth/access-denied";
import { useAppAuth } from "@/components/auth/auth-guard";
import { Brand } from "@/components/brand";
import {
  demoRoles,
  type DemoRole,
  useDemoSession,
} from "@/components/demo/demo-session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { appHomeForRole, canAccessAppPath } from "@/lib/auth/route-access";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/app/dashboard", label: "エグゼクティブ", icon: Gauge },
  { href: "/app/sync", label: "TERRAST同期", icon: DatabaseZap },
  { href: "/app/data", label: "企業・指標データ", icon: Activity },
  { href: "/app/disclosures", label: "SSBJ / ISSB開示", icon: ClipboardCheck },
  { href: "/app/ghg", label: "GHG・Scope 3", icon: Leaf },
  { href: "/app/suppliers", label: "サプライヤー", icon: Users },
  { href: "/app/transition", label: "リスク・移行計画", icon: Target },
  { href: "/app/assistant", label: "AI開示支援", icon: Bot },
  { href: "/app/review", label: "レビュー・承認", icon: ShieldCheck },
  { href: "/app/reports", label: "レポート", icon: FileBarChart },
  { href: "/app/marketplace", label: "ソリューション", icon: Store },
  { href: "/app/operator", label: "運営者ダッシュボード", icon: Network },
  { href: "/app/audit", label: "監査ログ", icon: History },
];

function Navigation({ pathname, role }: { pathname: string; role: DemoRole }) {
  return (
    <nav aria-label="主要ナビゲーション" className="space-y-1">
      {navigation
        .filter((item) => canAccessAppPath(role, item.href))
        .map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAppAuth();
  const { role, setRole, companies, companyId, setCompanyId, resetDemo } =
    useDemoSession();
  const currentRole =
    demoRoles.find((item) => item.id === role) ?? demoRoles[2];
  const currentCompany = companies.find((item) => item.id === companyId);

  function changeRole(nextRole: DemoRole) {
    if (auth.mode !== "demo") return;
    setRole(nextRole);
    router.push(appHomeForRole(nextRole));
  }

  async function exitSession() {
    if (auth.mode === "supabase") {
      try {
        await auth.signOut();
      } catch {
        toast.error("ログアウトを完了できませんでした。再試行してください。");
      }
      return;
    }

    resetDemo();
    router.push("/demo");
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex"
        data-print-hide="true"
      >
        <div className="flex h-20 items-center border-b border-sidebar-border px-5">
          <Brand className="[&_span]:text-sidebar-foreground" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          <Navigation pathname={pathname} role={role} />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header
          className="sticky top-0 z-20 flex min-h-20 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6"
          data-print-hide="true"
        >
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="メニューを開く"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
            >
              <SheetTitle className="sr-only">ナビゲーション</SheetTitle>
              <div className="flex h-20 items-center border-b border-sidebar-border px-5">
                <Brand className="[&_span]:text-sidebar-foreground" />
              </div>
              <div className="p-3">
                <Navigation pathname={pathname} role={role} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {currentCompany?.name ?? "対象企業を読み込み中"}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {currentCompany
                ? auth.mode === "demo"
                  ? `${currentCompany.code} · FY2025`
                  : currentCompany.code
                : "—"}
            </p>
          </div>

          <Select
            value={companyId}
            onValueChange={setCompanyId}
            disabled={role !== "system_admin" || companies.length < 2}
          >
            <SelectTrigger
              className="hidden w-56 md:flex"
              aria-label="対象企業"
            >
              <Building2 className="size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.reload()}
                aria-label="表示を更新"
              >
                <RefreshCw className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>表示を更新</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-2 px-2 md:px-3">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                    {currentRole.shortLabel.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-32 truncate text-left text-xs md:block">
                  {currentRole.shortLabel}
                </span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>
                <span className="block text-sm">
                  {auth.mode === "demo" ? "デモロールを切替" : "認証済みロール"}
                </span>
                <span className="mt-1 block font-normal text-muted-foreground">
                  {auth.mode === "demo"
                    ? "権限に応じた画面と操作を確認できます"
                    : (auth.email ??
                      "Supabase app_metadataのロールを使用しています")}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {auth.mode === "demo" ? (
                demoRoles.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    data-testid={`role-switch-${item.id}`}
                    onClick={() => changeRole(item.id)}
                    className={cn(item.id === role && "bg-accent")}
                  >
                    <span className="flex-1">
                      <span className="block">{item.shortLabel}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.label}
                      </span>
                    </span>
                    {item.id === role && (
                      <ShieldCheck className="size-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  <span className="flex-1">
                    <span className="block">{currentRole.shortLabel}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {currentRole.label}
                    </span>
                  </span>
                  <ShieldCheck className="size-4 text-primary" />
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {canAccessAppPath(role, "/app/settings") && (
                <DropdownMenuItem onClick={() => router.push("/app/settings")}>
                  <Settings className="size-4" />
                  {auth.mode === "demo" ? "デモ設定" : "設定"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => void exitSession()}>
                <LogOut className="size-4" />
                {auth.mode === "demo" ? "デモを終了" : "ログアウト"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main
          id="main-content"
          className="min-h-[calc(100vh-5rem)] px-4 py-6 md:px-6 lg:px-8"
        >
          {canAccessAppPath(role, pathname) ? (
            children
          ) : (
            <AccessDenied role={role} />
          )}
        </main>
      </div>
    </div>
  );
}
