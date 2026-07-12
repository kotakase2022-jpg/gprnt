"use client";

import * as React from "react";
import { Download, FileCheck2, Filter, Plus, Search } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  WorkspaceMetric,
  useDemoWorkspace,
} from "@/components/demo/demo-workspace";
import { useDemoSession } from "@/components/demo/demo-session";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { encodeCsv } from "@/lib/csv";
import { roleHasPermission } from "@/domain";

const metricSchema = z.object({
  metricCode: z.string().min(3, "指標コードを3文字以上で入力してください"),
  label: z.string().min(2, "指標名を入力してください"),
  category: z.string().min(1, "カテゴリーを選択してください"),
  value: z.string().min(1, "値を入力してください"),
  unit: z.string().min(1, "単位を入力してください"),
});
type MetricForm = z.infer<typeof metricSchema>;

function downloadCsv(metrics: WorkspaceMetric[]) {
  const rows = [
    [
      "metric_code",
      "label",
      "category",
      "reporting_period",
      "value",
      "unit",
      "source",
      "confidence",
      "verification_status",
    ],
    ...metrics.map((metric) => [
      metric.metricCode,
      metric.label,
      metric.category,
      metric.period,
      metric.value,
      metric.unit,
      metric.source,
      metric.confidence,
      metric.verification,
    ]),
  ];
  const csv = encodeCsv(rows);
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "terrast-metric-values-demo.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function CompanyDataPage() {
  const { role } = useDemoSession();
  const workspace = useDemoWorkspace();
  const canWrite = roleHasPermission(role, "metric:write");
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [source, setSource] = React.useState("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<WorkspaceMetric | null>(null);
  const form = useForm<MetricForm>({
    resolver: zodResolver(metricSchema),
    defaultValues: {
      metricCode: "",
      label: "",
      category: "環境",
      value: "",
      unit: "",
    },
  });
  const selectedCategory = useWatch({
    control: form.control,
    name: "category",
    defaultValue: "環境",
  });

  const filtered = React.useMemo(
    () =>
      workspace.metrics.filter((metric) => {
        const matchesText = `${metric.metricCode} ${metric.label}`
          .toLowerCase()
          .includes(search.toLowerCase());
        return (
          matchesText &&
          (category === "all" || metric.category === category) &&
          (source === "all" || metric.source === source)
        );
      }),
    [workspace.metrics, search, category, source],
  );

  function submit(values: MetricForm) {
    workspace.addMetric(values);
    form.reset();
    setFormOpen(false);
    toast.success("不足指標を登録しました", {
      description: "手動入力として来歴と監査ログへ記録されています。",
    });
  }

  const categories = Array.from(
    new Set(workspace.metrics.map((metric) => metric.category)),
  );
  return (
    <>
      <PageHeader
        eyebrow="COMPANY DATA / PROVENANCE"
        title="企業・指標データ"
        description="経年の非財務データを共通モデルで管理し、原値・正規化値・出所・対象期間・信頼度・証憑・担当を追跡します。"
        actions={
          <>
            <Button variant="outline" onClick={() => downloadCsv(filtered)}>
              <Download className="size-4" />
              CSV
            </Button>
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canWrite}>
                  <Plus className="size-4" />
                  不足項目を入力
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={form.handleSubmit(submit)}>
                  <DialogHeader>
                    <DialogTitle>不足指標を手動入力</DialogTitle>
                    <DialogDescription>
                      入力値はTERRAST由来値と区別し、変更理由・担当・証憑の来歴を保持します。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-5">
                    <div className="grid gap-2">
                      <Label htmlFor="metric-code">指標コード</Label>
                      <Input
                        id="metric-code"
                        {...form.register("metricCode")}
                        placeholder="例: S3-CAT4-PRIMARY"
                      />
                      {form.formState.errors.metricCode && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.metricCode.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="metric-label">指標名</Label>
                      <Input
                        id="metric-label"
                        {...form.register("label")}
                        placeholder="上流輸送の一次データ比率"
                      />
                      {form.formState.errors.label && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.label.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label>カテゴリー</Label>
                      <Select
                        value={selectedCategory}
                        onValueChange={(value) =>
                          form.setValue("category", value, {
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "環境",
                            "人的資本",
                            "ガバナンス",
                            "GHG排出",
                            "エネルギー",
                            "水",
                            "廃棄物",
                            "サプライチェーン",
                            "リスク・機会",
                            "目標・実績",
                          ].map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="metric-value">値</Label>
                        <Input id="metric-value" {...form.register("value")} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="metric-unit">単位</Label>
                        <Input
                          id="metric-unit"
                          {...form.register("unit")}
                          placeholder="% / t-CO₂e"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormOpen(false)}
                    >
                      キャンセル
                    </Button>
                    <Button type="submit">保存して来歴を記録</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">登録データポイント</p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {workspace.metrics.length}
            </p>
            <p className="mt-2 text-[11px] text-primary">FY2025 表示中</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">TERRAST由来</p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {
                workspace.metrics.filter(
                  (metric) => metric.source === "TERRAST",
                ).length
              }
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              手動値とは明確に分離
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">証憑確認済み</p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {
                workspace.metrics.filter(
                  (metric) => metric.verification !== "Pending",
                ).length
              }
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              署名付きURL設計
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">データカタログ</CardTitle>
          <CardDescription>
            フィルター後 {filtered.length}件。値の出所と検証状態を並べて確認
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="指標コード・名称で検索"
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全カテゴリー</SelectItem>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全データソース</SelectItem>
                {["TERRAST", "Manual", "Calculated", "Supplier"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>指標</TableHead>
                  <TableHead>期間</TableHead>
                  <TableHead className="text-right">値</TableHead>
                  <TableHead>ソース</TableHead>
                  <TableHead>信頼度</TableHead>
                  <TableHead>証憑</TableHead>
                  <TableHead className="text-right">詳細</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((metric) => (
                  <TableRow key={metric.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{metric.label}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {metric.metricCode} · {metric.category}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {metric.period}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {metric.value}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {metric.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          metric.source === "TERRAST" ? "default" : "outline"
                        }
                      >
                        {metric.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          metric.confidence >= 90
                            ? "text-emerald-700"
                            : metric.confidence < 70
                              ? "text-amber-700"
                              : ""
                        }
                      >
                        {metric.confidence}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-xs">
                        <FileCheck2 className="size-3.5 text-primary" />
                        {metric.verification}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelected(metric)}
                      >
                        来歴
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.label}</DialogTitle>
            <DialogDescription>
              データ来歴と正規化情報。証憑本文は監査ログへ保存しません。
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">metric_code</p>
                <p className="mt-1 font-mono">{selected.metricCode}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  reporting_period
                </p>
                <p className="mt-1 font-mono">{selected.period}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  original / normalized
                </p>
                <p className="mt-1 font-mono">
                  {selected.value} {selected.unit}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">source_system</p>
                <p className="mt-1">{selected.source}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  confidence_level
                </p>
                <p className="mt-1">{selected.confidence}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">last_updated_at</p>
                <p className="mt-1 font-mono">{selected.updatedAt}</p>
              </div>
              <div className="col-span-2 rounded-lg border bg-muted/40 p-4">
                <p className="text-xs font-semibold">証憑アクセス</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  デモではメタデータのみ表示。本番はサーバー認可後に短期限の署名付きURLを発行します。
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
