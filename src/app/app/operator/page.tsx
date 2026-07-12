"use client";

import {
  Building2,
  ClockAlert,
  FileCheck2,
  LockKeyhole,
  Network,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { useDemoSession } from "@/components/demo/demo-session";
import { useDemoWorkspace } from "@/components/demo/demo-workspace";
import {
  OperatorReadinessChart,
  QualityDistributionChart,
} from "@/components/features/charts";
import { KpiCard } from "@/components/features/kpi-card";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function OperatorPage() {
  const { role, setRole } = useDemoSession();
  const workspace = useDemoWorkspace();
  const operator =
    role === "platform_operator_demo_admin" || role === "system_admin";
  const summaries = workspace.companySummaries;
  const average = (values: number[]) =>
    values.length
      ? Math.round(
          values.reduce((total, value) => total + value, 0) / values.length,
        )
      : 0;
  const averageReadiness = average(summaries.map((item) => item.readiness));
  const averageQuality = average(summaries.map((item) => item.dataQuality));
  const averageSupplier = average(
    summaries.map((item) => item.supplierResponseRate),
  );
  const averageTransition = average(
    summaries.map((item) => item.transitionProgress),
  );
  const overdue = summaries.filter(
    (item) => item.additionalInputs >= 20,
  ).length;
  const awaitingReview = summaries.filter(
    (item) => item.disclosureStatus === "in_review",
  ).length;
  const consented = summaries.filter((item) => item.sharingConsent);

  return (
    <>
      <PageHeader
        eyebrow="PLATFORM OPERATOR / AGGREGATED VIEW"
        title="市場全体の開示準備を、匿名集計で把握"
        description="市場区分、業種、企業規模ごとの準備度・不足項目・Scope 3・Supplier回答を集計表示。個社非公開明細は共有同意なしに閲覧できません。"
        actions={
          !operator ? (
            <Button onClick={() => setRole("platform_operator_demo_admin")}>
              <Network className="size-4" />
              運営者ロールへ切替
            </Button>
          ) : undefined
        }
      />
      <Alert className="mb-4 border-primary/20 bg-primary/[0.03]">
        <LockKeyhole className="size-4" />
        <AlertTitle>集計・匿名化・同意済み個社を分離</AlertTitle>
        <AlertDescription>
          この画面の市場分析は合成した匿名集計です。個社情報は企業が明示同意した範囲に限り、別セクションで表示します。
        </AlertDescription>
      </Alert>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="参加企業（操作可能デモ）"
          value={`${summaries.length}社`}
          detail="架空3社の会社別stateを匿名集計"
          icon={Building2}
          progress={100}
        />
        <KpiCard
          label="SSBJ一般 / 気候"
          value={`${averageReadiness} / ${Math.max(0, averageReadiness - 8)}`}
          detail="操作結果を含むデモ企業平均"
          icon={FileCheck2}
          progress={averageReadiness}
        />
        <KpiCard
          label="期限超過"
          value={`${overdue}社`}
          detail="不足項目20件以上の要支援企業"
          icon={ClockAlert}
          tone="warning"
        />
        <KpiCard
          label="レビュー待ち"
          value={`${awaitingReview}件`}
          detail="企業内Reviewerの処理待ちを状態から集計"
          icon={Users}
          progress={Math.max(0, 100 - awaitingReview * 25)}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_.6fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">業種別の開示準備度</CardTitle>
            <CardDescription>
              SSBJ一般 / 気候関連。個社値を表示しない匿名集計
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OperatorReadinessChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">市場区分別参加率</CardTitle>
            <CardDescription>架空のデモ区分</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              ["デモPrime", 78, 78],
              ["デモStandard", 91, 58],
              ["デモGrowth", 31, 41],
            ].map(([label, count, rate]) => (
              <div key={label as string}>
                <div className="mb-2 flex justify-between text-xs">
                  <span>
                    {label as string}{" "}
                    <span className="text-muted-foreground">{count}社</span>
                  </span>
                  <span className="font-mono">{rate}%</span>
                </div>
                <Progress value={rate as number} />
              </div>
            ))}
            <div className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
              実在市場区分の参加率ではありません。コンセプトMVP用の合成データです。
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">データ品質分布</CardTitle>
            <CardDescription>完全性・来歴・鮮度・検証状態</CardDescription>
          </CardHeader>
          <CardContent>
            <QualityDistributionChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">集計KPI</CardTitle>
            <CardDescription>市場全体のボトルネック</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["データ品質", averageQuality],
              ["TERRAST取得比率", averageReadiness],
              ["Scope 3充足率", Math.max(0, averageReadiness - 16)],
              ["移行計画進捗", averageTransition],
              ["Supplier回答率", averageSupplier],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div className="mb-2 flex justify-between text-xs">
                  <span>{label as string}</span>
                  <span className="font-mono font-semibold">{value}%</span>
                </div>
                <Progress value={value as number} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">主要な不足項目</CardTitle>
            <CardDescription>業種別の上位ギャップ</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>業種</TableHead>
                  <TableHead>不足</TableHead>
                  <TableHead className="text-right">企業</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ["製造", "Scope 3 Cat.4", 32],
                  ["小売", "Supplier一次", 21],
                  ["情報通信", "財務影響", 14],
                  ["運輸", "移行CapEx", 11],
                  ["金融", "投融資排出", 9],
                ].map(([industry, gap, count]) => (
                  <TableRow key={industry as string}>
                    <TableCell>{industry as string}</TableCell>
                    <TableCell className="text-xs">{gap as string}</TableCell>
                    <TableCell className="text-right font-mono">
                      {count as number}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" />
                同意済み個社ビュー
              </CardTitle>
              <CardDescription>
                企業の共有同意で許可された情報だけを表示
              </CardDescription>
            </div>
            <Badge variant={consented.length ? "default" : "outline"}>
              同意有効 {consented.length}/{summaries.length}社
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {consented.length ? (
            <div className="space-y-3">
              {consented.map((company) => (
                <div
                  key={company.companyId}
                  data-testid={`operator-company-${company.companyId}`}
                  className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_auto] md:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {company.companyName}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {company.companyCode}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <span>準備度 {company.readiness}%</span>
                    <span>品質 {company.dataQuality}%</span>
                    <span>同期 {company.syncRuns}回</span>
                  </div>
                  <Badge variant="outline">同意済みサマリー</Badge>
                </div>
              ))}
              <div className="flex justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">範囲を確認</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>企業共有同意</DialogTitle>
                      <DialogDescription>
                        同意履歴は監査ログで追跡されます。
                      </DialogDescription>
                    </DialogHeader>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          同意者
                        </dt>
                        <dd className="mt-1">Company Admin</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          同意日時
                        </dt>
                        <dd className="mt-1">2026-07-09 15:15</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          有効期限
                        </dt>
                        <dd className="mt-1">2027-03-31</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">目的</dt>
                        <dd className="mt-1">市場支援施策の検討</dd>
                      </div>
                    </dl>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <div className="grid min-h-28 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
              個社詳細は表示できません。匿名集計のみ利用可能です。
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex items-center gap-4 p-5">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10">
            <Target className="size-5 text-primary" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">市場支援への示唆</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              製造・小売のScope
              3一次データ収集と、中小規模企業の移行投資整理を優先支援テーマとして検討できます。
            </p>
          </div>
          <Badge variant="outline">合成分析</Badge>
        </CardContent>
      </Card>
    </>
  );
}
