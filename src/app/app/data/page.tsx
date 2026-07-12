"use client";

import * as React from "react";
import {
  Download,
  FileCheck2,
  Filter,
  LoaderCircle,
  Plus,
  Search,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  WorkspaceMetric,
  useDemoWorkspace,
} from "@/components/demo/demo-workspace";
import { useDemoSession } from "@/components/demo/demo-session";
import { useAppAuth } from "@/components/auth/auth-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { encodeCsv } from "@/lib/csv";
import {
  confidenceLevelScore,
  roleHasPermission,
  type MetricDefinition,
  type MetricValue,
  type ReportingPeriod,
  type Unit,
} from "@/domain";
import { parseMetricInputValue } from "@/domain/metric-input";
import {
  createRepository,
  type SustainabilityRepository,
} from "@/lib/repositories";

const metricSchema = z.object({
  metricCode: z.string().min(1, "指標コードを入力してください"),
  label: z.string().min(1, "指標名を入力してください"),
  category: z.string().min(1, "カテゴリーを選択してください"),
  value: z.string().trim().min(1, "値を入力してください"),
  unit: z.string().min(1, "単位を入力してください"),
  changeReason: z
    .string()
    .trim()
    .min(3, "変更理由を3文字以上で入力してください")
    .max(500),
  consolidationScope: z
    .string()
    .trim()
    .min(1, "連結範囲を入力してください")
    .max(200),
  organizationalBoundary: z
    .string()
    .trim()
    .min(1, "組織境界を入力してください")
    .max(200),
});
type MetricForm = z.infer<typeof metricSchema>;

const EMPTY_METRIC_FORM: MetricForm = {
  metricCode: "",
  label: "",
  category: "環境",
  value: "",
  unit: "",
  changeReason: "",
  consolidationScope: "",
  organizationalBoundary: "",
};

const CATEGORY_LABELS: Readonly<Record<MetricDefinition["category"], string>> =
  {
    environment: "環境",
    human_capital: "人的資本",
    governance: "ガバナンス",
    ghg_emissions: "GHG排出",
    energy: "エネルギー",
    water: "水",
    waste: "廃棄物",
    diversity: "多様性",
    employees: "従業員",
    occupational_safety: "労働安全",
    supply_chain: "サプライチェーン",
    risk_opportunity: "リスク・機会",
    target_performance: "目標・実績",
  };

function categoryLabel(category: MetricDefinition["category"]): string {
  return CATEGORY_LABELS[category];
}

const DISPLAY_UNITS: Partial<Record<Unit, string>> = {
  tCO2e: "t-CO₂e",
  kgCO2e: "kg-CO₂e",
  gCO2e: "g-CO₂e",
  percent: "%",
  people: "人",
  m3: "m³",
};

function displayUnit(unit: Unit): string {
  return DISPLAY_UNITS[unit] ?? unit;
}

function toWorkspaceMetric(
  value: MetricValue,
  definition: MetricDefinition | undefined,
): WorkspaceMetric {
  const confidence = confidenceLevelScore(value.confidenceLevel);
  const source: WorkspaceMetric["source"] =
    value.sourceType === "terrast"
      ? "TERRAST"
      : value.sourceType === "calculation"
        ? "Calculated"
        : value.sourceType === "supplier"
          ? "Supplier"
          : "Manual";
  return {
    id: value.id,
    metricCode: value.metricCode,
    label: definition?.name ?? value.metricName ?? value.metricCode,
    category: definition
      ? categoryLabel(definition.category)
      : value.metricCategory
        ? categoryLabel(value.metricCategory)
        : "その他",
    period: value.reportingPeriod,
    value: value.value === null ? "—" : String(value.value),
    unit: displayUnit(value.unit),
    source,
    confidence,
    verification:
      value.verificationStatus === "externally_assured"
        ? "Verified"
        : value.verificationStatus === "internally_reviewed"
          ? "Evidence attached"
          : "Pending",
    updatedAt: value.lastUpdatedAt.slice(0, 10),
    changeReason: value.changeReason ?? undefined,
    consolidationScope: value.consolidationScope,
    organizationalBoundary: value.organizationalBoundary,
    catalogState: definition ? "current" : "historical",
  };
}

function downloadCsv(metrics: WorkspaceMetric[], isDemo: boolean) {
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
  anchor.download = isDemo
    ? "terrast-metric-values-demo.csv"
    : "terrast-metric-values.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function CompanyDataPage() {
  const auth = useAppAuth();
  const { role, companyId } = useDemoSession();
  const workspace = useDemoWorkspace();
  const repository = React.useMemo<SustainabilityRepository | null>(
    () =>
      auth.mode === "supabase" ? createRepository({ mode: "supabase" }) : null,
    [auth.mode],
  );
  const [metricValues, setMetricValues] = React.useState<MetricValue[]>([]);
  const [metricCatalog, setMetricCatalog] = React.useState<MetricDefinition[]>(
    [],
  );
  const [reportingPeriod, setReportingPeriod] =
    React.useState<ReportingPeriod | null>(null);
  const [loadedCompanyId, setLoadedCompanyId] = React.useState<string | null>(
    null,
  );
  const [dataState, setDataState] = React.useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const hasOpenReportingPeriod = reportingPeriod?.status === "open";
  const canWrite = roleHasPermission(role, "metric:write");
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [source, setSource] = React.useState("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<WorkspaceMetric | null>(null);
  const form = useForm<MetricForm>({
    resolver: zodResolver(metricSchema),
    defaultValues: EMPTY_METRIC_FORM,
  });
  const selectedCategory = useWatch({
    control: form.control,
    name: "category",
    defaultValue: "環境",
  });
  const selectedMetricCode = useWatch({
    control: form.control,
    name: "metricCode",
    defaultValue: "",
  });

  React.useEffect(() => {
    if (auth.mode !== "supabase") return;
    const frame = window.requestAnimationFrame(() => {
      form.reset(EMPTY_METRIC_FORM);
      setFormOpen(false);
      setSelected(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [auth.mode, companyId, form]);

  React.useEffect(() => {
    if (!repository || !companyId) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setDataState("loading");
      setMetricValues([]);
      setReportingPeriod(null);
      setLoadedCompanyId(null);
      try {
        const [periods, company] = await Promise.all([
          repository.listReportingPeriods(companyId),
          repository.getCompany(companyId),
        ]);
        if (!company) throw new Error("company_unavailable");
        const period =
          periods.find((candidate) => candidate.status === "open") ??
          periods[0] ??
          null;
        const [catalog, values] = await Promise.all([
          repository.listMetrics(company.organizationId),
          period
            ? repository.listMetricValues({
                companyId,
                reportingPeriodId: period.id,
              })
            : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setReportingPeriod(period);
        setMetricCatalog(catalog);
        setMetricValues(values);
        setLoadedCompanyId(companyId);
        setDataState("ready");
      } catch {
        if (!cancelled) setDataState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, repository]);

  React.useEffect(() => {
    if (auth.mode !== "supabase") return;
    const definition = metricCatalog.find(
      (metric) => metric.code === selectedMetricCode,
    );
    if (!definition) return;
    form.setValue("label", definition.name, { shouldValidate: true });
    form.setValue("category", categoryLabel(definition.category), {
      shouldValidate: true,
    });
    form.setValue("unit", definition.canonicalUnit, {
      shouldValidate: true,
    });
    const existing = metricValues.find(
      (metric) =>
        metric.metricCode === definition.code &&
        metric.metricId === definition.id &&
        metric.reportingPeriodId === reportingPeriod?.id &&
        metric.sourceType === "manual" &&
        metric.sourceSystem === "manual_entry" &&
        metric.sourceRecordId === `manual:${definition.id}`,
    );
    form.setValue("consolidationScope", existing?.consolidationScope ?? "", {
      shouldValidate: Boolean(existing),
    });
    form.setValue(
      "organizationalBoundary",
      existing?.organizationalBoundary ?? "",
      { shouldValidate: Boolean(existing) },
    );
  }, [
    auth.mode,
    form,
    metricCatalog,
    metricValues,
    reportingPeriod?.id,
    selectedMetricCode,
  ]);

  const metrics = React.useMemo(
    () =>
      auth.mode === "demo"
        ? workspace.metrics
        : loadedCompanyId === companyId
          ? metricValues.map((value) =>
              toWorkspaceMetric(
                value,
                value.metricId
                  ? metricCatalog.find((metric) => metric.id === value.metricId)
                  : metricCatalog.find(
                      (metric) => metric.code === value.metricCode,
                    ),
              ),
            )
          : [],
    [
      auth.mode,
      companyId,
      loadedCompanyId,
      metricCatalog,
      metricValues,
      workspace.metrics,
    ],
  );

  const filtered = React.useMemo(
    () =>
      metrics.filter((metric) => {
        const matchesText = `${metric.metricCode} ${metric.label}`
          .toLowerCase()
          .includes(search.toLowerCase());
        return (
          matchesText &&
          (category === "all" || metric.category === category) &&
          (source === "all" || metric.source === source)
        );
      }),
    [metrics, search, category, source],
  );

  async function submit(values: MetricForm) {
    try {
      if (auth.mode === "demo") {
        workspace.addMetric(values);
      } else {
        if (!repository || !companyId || reportingPeriod?.status !== "open")
          throw new Error("metric_repository_unavailable");
        const definition = metricCatalog.find(
          (metric) => metric.code === values.metricCode,
        );
        if (!definition) throw new Error("metric_definition_unavailable");
        if (!definition.id) throw new Error("metric_definition_unavailable");
        const existing = metricValues.find(
          (metric) =>
            metric.metricCode === definition.code &&
            metric.metricId === definition.id &&
            metric.reportingPeriodId === reportingPeriod.id &&
            metric.sourceType === "manual" &&
            metric.sourceSystem === "manual_entry" &&
            metric.sourceRecordId === `manual:${definition.id}`,
        );
        const now = new Date().toISOString();
        const scalar = parseMetricInputValue(
          definition.valueType,
          values.value,
        );
        const base = {
          id: existing?.id ?? globalThis.crypto.randomUUID(),
          companyId,
          metricId: definition.id,
          metricCode: definition.code,
          reportingPeriodId: reportingPeriod.id,
          reportingPeriod: reportingPeriod.label,
          unit: definition.canonicalUnit,
          originalUnit: definition.canonicalUnit,
          consolidationScope: values.consolidationScope,
          organizationalBoundary: values.organizationalBoundary,
          sourceType: "manual" as const,
          sourceSystem: "manual_entry",
          sourceRecordId: `manual:${definition.id}`,
          sourceDocument: null,
          importedAt: existing?.importedAt ?? now,
          lastUpdatedAt: now,
          confidenceLevel: "medium" as const,
          verificationStatus: "unverified" as const,
          ownerId: existing?.ownerId ?? null,
          reviewerId: existing?.reviewerId ?? null,
          evidenceIds: existing?.evidenceIds ?? [],
          changeReason: values.changeReason,
          manualOverride: true,
          version: existing?.version ?? 0,
        };
        const candidate = {
          ...base,
          valueType: definition.valueType,
          value: scalar,
          originalValue: scalar,
          normalizedValue: scalar,
        } as MetricValue;
        const saved = await repository.upsertMetricValue(candidate);
        setMetricValues((current) => [
          saved,
          ...current.filter((metric) => metric.id !== saved.id),
        ]);
      }
      form.reset(EMPTY_METRIC_FORM);
      setFormOpen(false);
      toast.success("不足指標を登録しました", {
        description:
          auth.mode === "demo"
            ? "手動入力として来歴と監査ログへ記録されています。"
            : "指標値と監査イベントを同一トランザクションで保存しました。",
      });
    } catch (error) {
      toast.error(
        error instanceof Error && error.message === "invalid_metric_value"
          ? "指標の型に合う値を入力してください。"
          : "指標値を保存できませんでした。再読込してお試しください。",
      );
    }
  }

  const categories = Array.from(
    new Set(metrics.map((metric) => metric.category)),
  );
  return (
    <>
      <PageHeader
        eyebrow="COMPANY DATA / PROVENANCE"
        title="企業・指標データ"
        description="経年の非財務データを共通モデルで管理し、原値・正規化値・出所・対象期間・信頼度・証憑・担当を追跡します。"
        actions={
          <>
            {auth.mode === "demo" ? (
              <Button
                variant="outline"
                onClick={() => downloadCsv(filtered, true)}
              >
                <Download className="size-4" />
                CSV
              </Button>
            ) : (
              <Badge variant="outline">本番CSVは監査コマンド準備中</Badge>
            )}
            <Dialog
              open={formOpen}
              onOpenChange={(open) => {
                setFormOpen(open);
                if (!open) form.reset(EMPTY_METRIC_FORM);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  disabled={
                    !canWrite ||
                    (auth.mode === "supabase" &&
                      (dataState !== "ready" ||
                        loadedCompanyId !== companyId ||
                        !hasOpenReportingPeriod ||
                        metricCatalog.length === 0))
                  }
                >
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
                      {auth.mode === "supabase" ? (
                        <Select
                          value={selectedMetricCode}
                          onValueChange={(value) =>
                            form.setValue("metricCode", value, {
                              shouldValidate: true,
                            })
                          }
                        >
                          <SelectTrigger id="metric-code">
                            <SelectValue placeholder="登録済み指標を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {metricCatalog.map((metric) => (
                              <SelectItem key={metric.code} value={metric.code}>
                                {metric.code} · {metric.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="metric-code"
                          {...form.register("metricCode")}
                          placeholder="例: S3-CAT4-PRIMARY"
                        />
                      )}
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
                        readOnly={auth.mode === "supabase"}
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
                        disabled={auth.mode === "supabase"}
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
                          readOnly={auth.mode === "supabase"}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="metric-change-reason">変更理由</Label>
                      <Textarea
                        id="metric-change-reason"
                        {...form.register("changeReason")}
                        placeholder="例: 月次確定値へ更新したため"
                      />
                      {form.formState.errors.changeReason && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.changeReason.message}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="metric-consolidation-scope">
                          連結範囲
                        </Label>
                        <Input
                          id="metric-consolidation-scope"
                          {...form.register("consolidationScope")}
                          placeholder="例: 連結"
                        />
                        {form.formState.errors.consolidationScope && (
                          <p className="text-xs text-destructive">
                            {form.formState.errors.consolidationScope.message}
                          </p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="metric-organizational-boundary">
                          組織境界
                        </Label>
                        <Input
                          id="metric-organizational-boundary"
                          {...form.register("organizationalBoundary")}
                          placeholder="例: 国内外連結子会社"
                        />
                        {form.formState.errors.organizationalBoundary && (
                          <p className="text-xs text-destructive">
                            {
                              form.formState.errors.organizationalBoundary
                                .message
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.reset(EMPTY_METRIC_FORM);
                        setFormOpen(false);
                      }}
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting
                        ? "保存中..."
                        : "保存して来歴を記録"}
                    </Button>
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
              {metrics.length}
            </p>
            <p className="mt-2 text-[11px] text-primary">
              {auth.mode === "demo"
                ? "FY2025 表示中"
                : reportingPeriod
                  ? `${reportingPeriod.label} (${reportingPeriod.status === "open" ? "受付中" : "締切済み"})`
                  : "対象期間なし"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">TERRAST由来</p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {metrics.filter((metric) => metric.source === "TERRAST").length}
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
                metrics.filter((metric) => metric.verification !== "Pending")
                  .length
              }
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              署名付きURL設計
            </p>
          </CardContent>
        </Card>
      </section>

      {auth.mode === "supabase" && !companyId && (
        <Alert className="mt-4" variant="destructive">
          <AlertDescription>
            閲覧可能な企業がありません。現在のorganization
            membershipとRLSを管理者に確認してください。
          </AlertDescription>
        </Alert>
      )}
      {auth.mode === "supabase" &&
        Boolean(companyId) &&
        (dataState === "loading" || loadedCompanyId !== companyId) && (
          <Alert className="mt-4">
            <LoaderCircle className="size-4 animate-spin" />
            <AlertDescription>
              RLSで許可された指標データを読み込んでいます。
            </AlertDescription>
          </Alert>
        )}
      {auth.mode === "supabase" &&
        dataState === "ready" &&
        loadedCompanyId === companyId &&
        hasOpenReportingPeriod &&
        metricCatalog.length === 0 && (
          <Alert className="mt-4">
            <AlertDescription>
              手動入力できる有効な指標カタログがありません。管理者がASCIIの指標コード、対応する型・単位を持つ指標を有効化する必要があります。
            </AlertDescription>
          </Alert>
        )}
      {auth.mode === "supabase" && dataState === "error" && (
        <Alert className="mt-4" variant="destructive">
          <AlertDescription>
            実データを読み込めませんでした。Supabase
            migration・権限・接続設定を確認してください。
          </AlertDescription>
        </Alert>
      )}
      {auth.mode === "supabase" &&
        dataState === "ready" &&
        loadedCompanyId === companyId &&
        !hasOpenReportingPeriod && (
          <Alert className="mt-4">
            <AlertDescription>
              書き込み可能な受付中の報告期間がありません。締切済み期間は閲覧できますが、手動入力を再開するには管理者が報告期間を受付中にする必要があります。
            </AlertDescription>
          </Alert>
        )}

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
                      {metric.catalogState === "historical" && (
                        <Badge variant="outline" className="mt-1">
                          履歴定義
                        </Badge>
                      )}
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
              {selected.source === "Manual" && (
                <div className="col-span-2 grid gap-3 rounded-lg border bg-muted/40 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      change_reason
                    </p>
                    <p className="mt-1">
                      {selected.changeReason ?? "記録なし"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      consolidation_scope
                    </p>
                    <p className="mt-1">
                      {selected.consolidationScope ?? "記録なし"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      organizational_boundary
                    </p>
                    <p className="mt-1">
                      {selected.organizationalBoundary ?? "記録なし"}
                    </p>
                  </div>
                </div>
              )}
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
