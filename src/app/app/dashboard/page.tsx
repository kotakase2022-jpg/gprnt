"use client";

import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  DatabaseZap,
  FileCheck2,
  Gauge,
  Info,
  Leaf,
  Target,
} from "lucide-react";
import { useDemoWorkspace } from "@/components/demo/demo-workspace";
import {
  EmissionsTrendChart,
  Scope3CoverageChart,
} from "@/components/features/charts";
import { KpiCard } from "@/components/features/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const workspace = useDemoWorkspace();
  const readiness = Math.min(
    100,
    72 +
      workspace.syncRuns * 4 +
      (workspace.disclosure.status === "approved" ? 8 : 0),
  );
  const reviewProgress =
    workspace.disclosure.status === "approved"
      ? 100
      : workspace.disclosure.status === "in_review"
        ? 74
        : workspace.disclosure.status === "drafted"
          ? 48
          : 28;

  return (
    <>
      <PageHeader
        eyebrow="EXECUTIVE OVERVIEW / FY2025"
        title="開示準備の現在地"
        description="TERRAST由来データ、不足項目、開示・承認、Scope 3、移行施策を一つの視点で確認します。すべてのスコアは計算内訳を開示しています。"
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Info className="size-4" />
                スコア内訳
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  総合開示準備度 {readiness}% の計算内訳
                </DialogTitle>
                <DialogDescription>
                  対象要求事項ごとの入力、証憑、レビュー状態を重み付け。Not
                  Applicableは分母から除外します。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                {[
                  ["データ入力充足度", 82, 35],
                  ["証憑整備度", 76, 25],
                  ["開示案作成", 70, 20],
                  ["レビュー・承認", reviewProgress, 20],
                ].map(([label, score, weight]) => (
                  <div key={label as string}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>
                        {label as string}{" "}
                        <span className="text-muted-foreground">
                          （重み {weight}%）
                        </span>
                      </span>
                      <span className="font-mono font-semibold">{score}%</span>
                    </div>
                    <Progress value={score as number} />
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="総合開示準備度"
          value={`${readiness}%`}
          detail="前回評価から +6pt。データ同期と開示案作成が寄与"
          icon={Gauge}
          progress={readiness}
        />
        <KpiCard
          label="SSBJ 一般 / 気候"
          value="81 / 69"
          detail="一般開示はガバナンス整備、気候はScope 3が主要ギャップ"
          icon={ClipboardCheck}
          progress={75}
        />
        <KpiCard
          label="証憑整備率"
          value="76%"
          detail="主要数値のうち38件は証憑確認済み、12件が要確認"
          icon={FileCheck2}
          progress={76}
          tone="success"
        />
        <KpiCard
          label="レビュー・承認"
          value={`${reviewProgress}%`}
          detail={`現在の開示案ステータス: ${workspace.disclosure.status.replaceAll("_", " ")}`}
          icon={CheckCircle2}
          progress={reviewProgress}
          tone={reviewProgress < 50 ? "warning" : "primary"}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">GHG排出量の推移</CardTitle>
              <CardDescription>
                Scope 1・2・3 / t-CO₂e / 合成デモデータ
              </CardDescription>
            </div>
            <Badge variant="outline">基準年 FY2023</Badge>
          </CardHeader>
          <CardContent>
            <EmissionsTrendChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scope 3 データ充足率</CardTitle>
            <CardDescription>
              主要カテゴリー。推計と一次データを区別して評価
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Scope3CoverageChart />
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">15カテゴリー総合</span>
              <span className="font-mono font-semibold">67%</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">入力効率</CardTitle>
              <DatabaseZap className="size-5 text-primary" />
            </div>
            <CardDescription>TERRAST取得済みと企業補完の内訳</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-mono text-4xl font-semibold">
                  {workspace.terrastCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  TERRAST取得済み項目
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-semibold text-amber-700">
                  {workspace.additionalInputs}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  企業側の要補完
                </p>
              </div>
            </div>
            <Separator className="my-5" />
            <p className="text-xs leading-5 text-muted-foreground">
              全項目をゼロから入力せず、既存データを確認して不足情報だけを担当部門へ割り当てます。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                主要な気候リスク・機会
              </CardTitle>
              <Leaf className="size-5 text-primary" />
            </div>
            <CardDescription>影響度 × 発生可能性で優先順位付け</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["炭素価格の上昇", "移行リスク", "高"],
              ["主要拠点の洪水", "物理的リスク", "中"],
              ["低炭素部材の需要", "機会", "高"],
            ].map(([title, type, impact]) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <span className="size-2 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="text-[11px] text-muted-foreground">{type}</p>
                </div>
                <Badge variant={impact === "高" ? "default" : "outline"}>
                  {impact}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">移行計画アクション</CardTitle>
              <Target className="size-5 text-primary" />
            </div>
            <CardDescription>投資・KPIと結びついた施策の進捗</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspace.transitionActions.map((action) => (
              <div key={action.id}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium">{action.title}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {action.owner} · {action.investment}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold">
                    {action.progress}%
                  </span>
                </div>
                <Progress value={action.progress} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="flex items-center gap-5 p-5">
            <span className="grid size-12 place-items-center rounded-xl bg-primary/10">
              <Activity className="size-6 text-primary" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">同業種ベンチマーク</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                製造業デモ群の中央値 71%。自社は上位35%相当です。
              </p>
            </div>
            <Badge>+{readiness - 71}pt</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-5 p-5">
            <span className="grid size-12 place-items-center rounded-xl bg-amber-100">
              <ArrowUpRight className="size-6 text-amber-700" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">次の優先アクション</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Scope 3 Cat.4とCat.9の一次データ収集、取水量競合の解決。
              </p>
            </div>
            <Badge variant="outline">3件</Badge>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
