"use client";

import * as React from "react";
import { Download, FileJson2, FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";
import { demoCompanies, useDemoSession } from "@/components/demo/demo-session";
import { useDemoWorkspace } from "@/components/demo/demo-workspace";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { encodeCsv } from "@/lib/csv";

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { companyId } = useDemoSession();
  const workspace = useDemoWorkspace();
  const company =
    demoCompanies.find((candidate) => candidate.id === companyId) ??
    demoCompanies[0];
  const [active, setActive] = React.useState("readiness");
  const readiness = Math.min(
    100,
    72 +
      workspace.syncRuns * 4 +
      (workspace.disclosure.status === "approved" ? 8 : 0),
  );

  function exportJson() {
    const report = {
      reportType: active,
      generatedAt: new Date().toISOString(),
      syntheticDemoData: true,
      company: company.name,
      companyCode: company.code,
      readiness,
      disclosure: workspace.disclosure,
      metrics: workspace.metrics,
      transitionActions: workspace.transitionActions,
      auditExcerpt: workspace.audit.slice(0, 20),
    };
    download(
      `terrast-${active}-demo.json`,
      JSON.stringify(report, null, 2),
      "application/json;charset=utf-8",
    );
    toast.success("JSONレポートを出力しました");
  }

  function exportCsv() {
    const rows = [
      [
        "metric_code",
        "label",
        "period",
        "value",
        "unit",
        "source",
        "confidence",
        "verification",
      ],
      ...workspace.metrics.map((metric) => [
        metric.metricCode,
        metric.label,
        metric.period,
        metric.value,
        metric.unit,
        metric.source,
        metric.confidence,
        metric.verification,
      ]),
    ];
    const csv = encodeCsv(rows);
    download(
      "terrast-data-lineage-demo.csv",
      `\uFEFF${csv}`,
      "text/csv;charset=utf-8",
    );
    toast.success("CSVを出力しました");
  }

  return (
    <>
      <PageHeader
        eyebrow="REPORT / EXPORT"
        title="開示準備とデータ来歴を、提出可能な形へ"
        description="印刷最適化HTML、ブラウザPDF保存、CSV、JSONで、準備度、要求事項、ギャップ、GHG、移行計画、来歴、監査ログを出力します。"
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <FileSpreadsheet className="size-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={exportJson}>
              <FileJson2 className="size-4" />
              JSON
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="size-4" />
              印刷 / PDF保存
            </Button>
          </>
        }
      />

      <AlertSummary />
      <Tabs value={active} onValueChange={setActive} className="mt-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="readiness">準備度</TabsTrigger>
          <TabsTrigger value="requirements">要求事項</TabsTrigger>
          <TabsTrigger value="gaps">ギャップ</TabsTrigger>
          <TabsTrigger value="ghg">GHG</TabsTrigger>
          <TabsTrigger value="transition">移行計画</TabsTrigger>
          <TabsTrigger value="lineage">データ来歴</TabsTrigger>
          <TabsTrigger value="audit">監査抜粋</TabsTrigger>
        </TabsList>
        <div className="mt-4" id="print-report">
          <TabsContent value="readiness">
            <ReportShell
              title="開示準備度レポート"
              code="REPORT-READINESS-FY2025"
              companyName={company.name}
            >
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="grid place-items-center rounded-xl bg-primary p-6 text-primary-foreground">
                  <div className="text-center">
                    <p className="text-xs text-primary-foreground/70">
                      総合準備度
                    </p>
                    <p className="mt-2 font-mono text-5xl font-semibold">
                      {readiness}%
                    </p>
                    <p className="mt-2 text-xs">FY2025</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    ["SSBJ一般", 81],
                    ["SSBJ気候", 69],
                    ["入力充足度", 82],
                    ["証憑整備度", 76],
                    [
                      "レビュー・承認",
                      workspace.disclosure.status === "approved" ? 100 : 48,
                    ],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>{label as string}</span>
                        <span className="font-mono">{value}%</span>
                      </div>
                      <Progress value={value as number} />
                    </div>
                  ))}
                </div>
              </div>
              <Separator className="my-6" />
              <h3 className="font-semibold">要約</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                TERRAST由来の既存データ{workspace.terrastCount}
                項目を起点に、企業側の要補完は{workspace.additionalInputs}
                項目です。主要課題はScope 3
                Cat.4・9の一次データと移行投資の説明です。
              </p>
            </ReportShell>
          </TabsContent>
          <TabsContent value="requirements">
            <ReportShell
              title="SSBJ／ISSB要求事項別回答一覧"
              code="REPORT-REQUIREMENTS-FY2025"
              companyName={company.name}
            >
              <ReportRows
                rows={[
                  ["DEMO-GEN-01", "管理体制の説明", "Approved"],
                  [
                    "DEMO-CLI-01",
                    "Scope 1・2・3と算定範囲",
                    workspace.disclosure.status,
                  ],
                  ["DEMO-CLI-02", "主要な気候リスク", "Drafted"],
                  ["DEMO-TRN-01", "移行目標・施策・進捗", "Data Available"],
                  ["DEMO-SUP-01", "Scope 3一次データ収集", "In Review"],
                  ["DEMO-HUM-01", "人的資本と多様性", "Data Available"],
                ]}
              />
            </ReportShell>
          </TabsContent>
          <TabsContent value="gaps">
            <ReportShell
              title="データギャップ一覧"
              code="REPORT-GAPS-FY2025"
              companyName={company.name}
            >
              <ReportRows
                rows={[
                  [
                    "S3-CAT4-PRIMARY",
                    "上流輸送の一次データ比率",
                    "高 / 調達統括部",
                  ],
                  [
                    "S3-CAT9-PRIMARY",
                    "下流輸送の一次データ",
                    "高 / 営業企画部",
                  ],
                  ["TRANSITION-CAPEX", "施策別CapEx計画", "中 / 経営企画"],
                  [
                    "BOUNDARY-NOTE",
                    "算定除外の決裁根拠",
                    "中 / サステナビリティ部",
                  ],
                ]}
              />
            </ReportShell>
          </TabsContent>
          <TabsContent value="ghg">
            <ReportShell
              title="GHG算定レポート"
              code="REPORT-GHG-FY2025"
              companyName={company.name}
            >
              <ReportRows
                rows={[
                  ["Scope 1", "12,420 t-CO₂e", "実測 / 内部レビュー"],
                  ["Scope 2 LB", "8,710 t-CO₂e", "実測 / 確認済み"],
                  ["Scope 2 MB", "6,980 t-CO₂e", "実測 / 確認済み"],
                  ["Scope 3", "74,100 t-CO₂e", "推計含む / 要補完"],
                ]}
              />
              <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                排出係数はDEMO DATAです。正式な実務係数として使用できません。
              </p>
            </ReportShell>
          </TabsContent>
          <TabsContent value="transition">
            <ReportShell
              title="移行計画レポート"
              code="REPORT-TRANSITION-FY2025"
              companyName={company.name}
            >
              <div className="space-y-4">
                {workspace.transitionActions.map((action) => (
                  <div key={action.id} className="rounded-lg border p-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{action.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {action.owner} · {action.investment} · FY
                          {action.targetYear}
                        </p>
                      </div>
                      <span className="font-mono text-sm">
                        {action.progress}%
                      </span>
                    </div>
                    <Progress value={action.progress} className="mt-3" />
                  </div>
                ))}
              </div>
            </ReportShell>
          </TabsContent>
          <TabsContent value="lineage">
            <ReportShell
              title="データ来歴一覧"
              code="REPORT-LINEAGE-FY2025"
              companyName={company.name}
            >
              <ReportRows
                rows={workspace.metrics.map((metric) => [
                  metric.metricCode,
                  `${metric.value} ${metric.unit}`,
                  `${metric.source} / 信頼度${metric.confidence}% / ${metric.updatedAt}`,
                ])}
              />
            </ReportShell>
          </TabsContent>
          <TabsContent value="audit">
            <ReportShell
              title="監査ログ抜粋"
              code="REPORT-AUDIT-FY2025"
              companyName={company.name}
            >
              <ReportRows
                rows={workspace.audit
                  .slice(0, 20)
                  .map((entry) => [
                    new Date(entry.at).toLocaleString("ja-JP"),
                    entry.action,
                    `${entry.actor}: ${entry.summary}`,
                  ])}
              />
            </ReportShell>
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}

function AlertSummary() {
  return (
    <Card
      className="border-primary/20 bg-primary/[0.03]"
      data-print-hide="true"
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10">
          <Download className="size-5 text-primary" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">出力は現在のデモ状態を反映</p>
          <p className="mt-1 text-xs text-muted-foreground">
            同期、手動入力、レビュー、移行施策の変更をリアルタイムにレポートへ反映します。
          </p>
        </div>
        <Badge variant="outline">合成デモデータ</Badge>
      </CardContent>
    </Card>
  );
}

function ReportShell({
  title,
  code,
  companyName,
  children,
}: {
  title: string;
  code: string;
  companyName: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="print:border-0 print:shadow-none">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge variant="outline">SYNTHETIC DEMO DATA</Badge>
            <CardTitle className="mt-3 text-xl">{title}</CardTitle>
            <CardDescription className="mt-1">
              {companyName} / FY2025 / {code}
            </CardDescription>
          </div>
          <div className="text-right text-[10px] text-muted-foreground">
            <p>生成日 2026-07-12</p>
            <p>concept-mvp-v1</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {children}
        <Separator className="my-6" />
        <p className="text-[10px] leading-4 text-muted-foreground">
          法的適合性や保証を示すレポートではありません。
        </p>
      </CardContent>
    </Card>
  );
}

function ReportRows({ rows }: { rows: Array<Array<string>> }) {
  return (
    <div className="divide-y rounded-lg border">
      {rows.map((row, index) => (
        <div
          key={`${row[0]}-${index}`}
          className="grid gap-2 p-4 text-sm md:grid-cols-[180px_1fr_1fr]"
        >
          <span className="font-mono text-xs">{row[0]}</span>
          <span>{row[1]}</span>
          <span className="text-muted-foreground">{row[2]}</span>
        </div>
      ))}
    </div>
  );
}
