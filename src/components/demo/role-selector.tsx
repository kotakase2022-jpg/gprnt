"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  Eye,
  Factory,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DemoRole, demoRoles } from "@/components/demo/demo-session";

const details: Record<
  DemoRole,
  { description: string; icon: typeof Building2; destination: string }
> = {
  system_admin: {
    description:
      "全テナント、TERRAST連携設定、基準マッピング、システム監査を管理",
    icon: Database,
    destination: "/app/audit",
  },
  platform_operator_demo_admin: {
    description: "匿名集計を中心に、市場全体の開示準備状況とデータ品質を把握",
    icon: Building2,
    destination: "/app/operator",
  },
  company_admin: {
    description: "自社の全体進捗、組織、権限、共有同意を管理",
    icon: ShieldCheck,
    destination: "/app/dashboard",
  },
  preparer: {
    description: "データ補完、証憑登録、開示案・移行計画の作成を担当",
    icon: Factory,
    destination: "/app/sync",
  },
  reviewer_approver: {
    description: "開示案へのコメント、差戻し、承認と変更履歴を確認",
    icon: CheckCircle2,
    destination: "/app/review",
  },
  external_assurer_read_only: {
    description: "指定されたデータ、証憑、計算過程のみを読み取り",
    icon: Eye,
    destination: "/app/data",
  },
  supplier_user: {
    description: "招待されたScope 3関連項目への回答と証憑提出のみを実施",
    icon: Users,
    destination: "/app/suppliers",
  },
};

export function RoleSelector() {
  const router = useRouter();
  function startDemo(role: DemoRole) {
    window.localStorage.setItem(
      "terrast-demo-session-v1",
      JSON.stringify({ role, companyId: "mirai-manufacturing" }),
    );
    router.push(`${details[role].destination}?role=${role}`);
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {demoRoles.map((role) => {
        const item = details[role.id];
        const Icon = item.icon;
        return (
          <Card
            key={role.id}
            className="group flex min-h-56 flex-col transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
          >
            <CardHeader>
              <span className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <CardTitle className="text-base">{role.shortLabel}</CardTitle>
              <CardDescription className="text-xs font-medium">
                {role.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 text-sm leading-6 text-muted-foreground">
              {item.description}
            </CardContent>
            <CardFooter>
              <Button
                data-testid={`role-${role.id}`}
                className="w-full justify-between"
                onClick={() => startDemo(role.id)}
              >
                このロールで開始{" "}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
