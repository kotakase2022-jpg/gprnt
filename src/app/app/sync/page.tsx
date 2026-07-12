"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { demoCompanies, useDemoSession } from "@/components/demo/demo-session";
import {
  ConflictResolution,
  SyncClassification,
  useDemoWorkspace,
} from "@/components/demo/demo-workspace";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { applySyncPreview, dryRunSync, type SyncPreview } from "@/domain";
import { createRepository } from "@/lib/repositories";
import { MockTerrastConnector } from "@/lib/terrast";

const classLabels: Record<
  SyncClassification,
  { label: string; className: string }
> = {
  added: { label: "追加", className: "bg-emerald-100 text-emerald-800" },
  updated: { label: "更新", className: "bg-blue-100 text-blue-800" },
  conflict: { label: "競合", className: "bg-amber-100 text-amber-800" },
  unchanged: { label: "未変更", className: "bg-slate-100 text-slate-700" },
};

export default function SyncCenterPage() {
  const { companyId, setCompanyId, role } = useDemoSession();
  const workspace = useDemoWorkspace();
  const [queryOverride, setQueryOverride] = React.useState<string | null>(null);
  const [dryRunAt, setDryRunAt] = React.useState<string | null>(null);
  const [dryRunMeta, setDryRunMeta] = React.useState<{
    source: string;
    records: number;
    idempotencyKey: string;
  } | null>(null);
  const [domainPreview, setDomainPreview] = React.useState<SyncPreview | null>(
    null,
  );
  const [decisions, setDecisions] = React.useState<
    Record<string, ConflictResolution>
  >({});
  const [reasons, setReasons] = React.useState<Record<string, string>>({});
  const unresolved = workspace.syncItems.filter(
    (item) =>
      item.selected && item.classification === "conflict" && !item.resolution,
  ).length;
  const selected = workspace.syncItems.filter((item) => item.selected).length;
  const connector = React.useMemo(() => new MockTerrastConnector(), []);
  const repository = React.useMemo(
    () => createRepository({ mode: "demo" }),
    [],
  );
  const selectedCompany =
    demoCompanies.find((company) => company.id === companyId) ??
    demoCompanies[0];
  const query = queryOverride ?? selectedCompany.code;

  function selectCompany() {
    const normalized = query.trim().toLowerCase();
    const company = demoCompanies.find(
      (candidate) =>
        candidate.code.toLowerCase() === normalized ||
        candidate.id.toLowerCase() === normalized,
    );
    if (!company) {
      toast.error("一致するデモ企業がありません", {
        description: demoCompanies.map((item) => item.code).join(" / "),
      });
      return;
    }
    if (role !== "system_admin" && company.id !== companyId) {
      toast.error("現在のデモロールは所属企業以外を選択できません");
      return;
    }
    setCompanyId(company.id);
    setQueryOverride(null);
    setDryRunAt(null);
    setDryRunMeta(null);
    setDomainPreview(null);
    toast.success(`${company.name}を同期対象に選択しました`);
  }

  async function dryRun() {
    try {
      const snapshot = await repository.getSnapshot();
      const company = snapshot.companies.find(
        (candidate) =>
          candidate.securityCode === query.trim() ||
          candidate.name === selectedCompany.name,
      );
      if (!company) throw new Error("対象の合成デモ企業が見つかりません。");
      const fetched = await connector.fetchCompanyData({
        companyCode: company.companyCode,
        reportingPeriods: ["FY2025"],
      });
      const preview = dryRunSync({
        company,
        reportingPeriods: snapshot.reportingPeriods,
        metrics: snapshot.metrics,
        localValues: snapshot.metricValues,
        incomingRecords: fetched.records,
      });
      setDomainPreview(preview);
      setDryRunAt(new Date().toLocaleTimeString("ja-JP"));
      setDryRunMeta({
        source: fetched.sourceLabel,
        records: fetched.records.length,
        idempotencyKey: preview.idempotencyKey,
      });
      toast.success("Dry-runが完了しました", {
        description: `${fetched.records.length}件をConnectorから取得し、domain diffを検証しました。永続データは変更していません。`,
      });
    } catch (error) {
      setDryRunAt(null);
      setDryRunMeta(null);
      setDomainPreview(null);
      toast.error(
        error instanceof Error ? error.message : "Dry-runに失敗しました。",
      );
    }
  }

  function applyResolution(id: string) {
    const decision = decisions[id];
    if (!decision) return toast.error("解決方法を選択してください");
    try {
      workspace.resolveConflict(id, decision, reasons[id]);
      toast.success("競合の解決方針を記録しました");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "入力を確認してください",
      );
    }
  }

  async function execute() {
    if (!dryRunAt) return toast.error("先にDry-runを実行してください");
    if (unresolved > 0) return toast.error("未解決の競合があります");
    try {
      let repositoryStatus = "repository previewなし";
      if (domainPreview) {
        const snapshot = await repository.getSnapshot();
        const domainResult = applySyncPreview({
          preview: domainPreview,
          metrics: snapshot.metrics,
          currentValues: snapshot.metricValues,
          completedIdempotencyKeys: snapshot.terrastSyncJobs
            .filter((job) => job.status === "completed")
            .map((job) => job.idempotencyKey),
          resolutions: [],
          actorId: `demo-${role}`,
          actorOrganizationId:
            snapshot.companies.find(
              (company) => company.id === domainPreview.companyId,
            )?.organizationId ?? "org-demo",
          actorRole: role,
          executedAt: new Date().toISOString(),
          selectedDiffIds: domainPreview.diffs
            .filter(
              (diff) => diff.kind !== "conflict" && diff.kind !== "unchanged",
            )
            .map((diff) => diff.id),
        });
        await repository.saveSyncExecution(domainResult);
        repositoryStatus = domainResult.alreadyApplied
          ? "同一idempotency keyのためdomain永続化はスキップ"
          : `${domainResult.records.filter((record) => record.action !== "skipped").length}件をDemoRepositoryへtransaction保存`;
      }
      // Update the presentation state only after the repository transaction
      // succeeds, so a persistence failure cannot leave the UI ahead of data.
      const uiResult = workspace.executeSync();
      toast.success("TERRAST同期を実行しました", {
        description: `${uiResult.applied}件を反映し、${uiResult.skipped}件を保留しました。${repositoryStatus}。`,
      });
    } catch {
      toast.error("同期を完了できませんでした。状態を保持して再実行できます。");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="TERRAST DATA SYNC CENTER"
        title="既存データを確認して、差分だけを反映"
        description="合成デモコネクターから取得した値と企業側の登録値を比較します。Dry-run、競合解決、冪等同期、来歴確認を一つの画面で実行できます。"
        actions={
          <>
            <Button variant="outline" onClick={dryRun}>
              <Search className="size-4" />
              Dry-run
            </Button>
            <Button
              onClick={execute}
              disabled={!dryRunAt || selected === 0 || unresolved > 0}
            >
              <Play className="size-4" />
              選択した{selected}件を同期
            </Button>
          </>
        }
      />

      <Alert className="mb-4 border-primary/20 bg-primary/[0.03]">
        <ShieldCheck className="size-4" />
        <AlertTitle>MockTerrastConnector / 合成デモデータ</AlertTitle>
        <AlertDescription>
          実際のTERRAST
          APIエンドポイント、顧客データ、認証情報は使用していません。実API仕様確定後にConnectorを差し替える設計です。
        </AlertDescription>
      </Alert>

      <section className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">対象企業</CardTitle>
            <CardDescription>会社コードまたは証券コードで選択</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="company-code">会社コード</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="company-code"
                  value={query}
                  onChange={(event) => setQueryOverride(event.target.value)}
                  readOnly={role !== "system_admin"}
                />
                <Button variant="outline" onClick={selectCompany}>
                  選択
                </Button>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-semibold">{selectedCompany.name}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {selectedCompany.id} / {selectedCompany.code}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">同期サマリー</CardTitle>
            <CardDescription>前回同期、分類、選択状態</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {(
                [
                  "added",
                  "updated",
                  "conflict",
                  "unchanged",
                ] as SyncClassification[]
              ).map((classification) => {
                const count = workspace.syncItems.filter(
                  (item) => item.classification === classification,
                ).length;
                return (
                  <div key={classification} className="rounded-lg border p-3">
                    <Badge className={classLabels[classification].className}>
                      {classLabels[classification].label}
                    </Badge>
                    <p className="mt-3 font-mono text-2xl font-semibold">
                      {count}
                    </p>
                  </div>
                );
              })}
              <div className="rounded-lg border p-3">
                <Badge variant="outline">選択</Badge>
                <p className="mt-3 font-mono text-2xl font-semibold">
                  {selected}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-3.5" />
                前回同期:{" "}
                {workspace.lastSyncAt
                  ? new Date(workspace.lastSyncAt).toLocaleString("ja-JP")
                  : "未実行"}
              </span>
              <span>同期実行回数: {workspace.syncRuns}</span>
              {dryRunAt && (
                <span className="text-primary">
                  Dry-run完了: {dryRunAt}（保存なし）
                </span>
              )}
              {dryRunMeta && (
                <span
                  className="font-mono text-[10px]"
                  title={dryRunMeta.idempotencyKey}
                >
                  {dryRunMeta.source} · {dryRunMeta.records} records · key{" "}
                  {dryRunMeta.idempotencyKey.slice(-8)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                同期前後の差分プレビュー
              </CardTitle>
              <CardDescription>
                値、単位、期間、取得元、信頼度を確認して反映対象を選択
              </CardDescription>
            </div>
            {unresolved > 0 && (
              <Badge className="bg-amber-100 text-amber-800">
                <AlertCircle className="mr-1 size-3" />
                未解決 {unresolved}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <span className="sr-only">選択</span>
                </TableHead>
                <TableHead>分類 / 指標</TableHead>
                <TableHead>現在値</TableHead>
                <TableHead>TERRAST値</TableHead>
                <TableHead>来歴</TableHead>
                <TableHead className="min-w-72">競合解決</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspace.syncItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={() => workspace.toggleSyncItem(item.id)}
                      aria-label={`${item.label}を同期対象にする`}
                      disabled={item.classification === "unchanged"}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={classLabels[item.classification].className}
                    >
                      {classLabels[item.classification].label}
                    </Badge>
                    <p className="mt-2 text-sm font-medium">{item.label}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {item.metricCode}
                    </p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.currentValue ?? "—"} {item.currentValue && item.unit}
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-sm font-semibold text-primary">
                      {item.terrastValue} {item.unit}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {item.period}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs">{item.source}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      取得 {item.acquiredAt} · 信頼度 {item.confidence}
                    </p>
                  </TableCell>
                  <TableCell>
                    {item.classification !== "conflict" ? (
                      <span className="text-xs text-muted-foreground">
                        解決不要
                      </span>
                    ) : item.resolution ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-700">
                        <CheckCircle2 className="size-4" />
                        {item.resolution === "keep_manual"
                          ? "手動値を維持"
                          : "TERRAST値を採用"}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Select
                            value={decisions[item.id] ?? ""}
                            onValueChange={(value) =>
                              setDecisions((current) => ({
                                ...current,
                                [item.id]: value as ConflictResolution,
                              }))
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="解決方法" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="accept_terrast">
                                TERRAST値を採用
                              </SelectItem>
                              <SelectItem value="keep_manual">
                                手動値を維持
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => applyResolution(item.id)}
                          >
                            確定
                          </Button>
                        </div>
                        {decisions[item.id] === "keep_manual" && (
                          <Input
                            value={reasons[item.id] ?? ""}
                            onChange={(event) =>
                              setReasons((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            placeholder="手動値を維持する理由（必須）"
                            aria-label="手動値維持理由"
                          />
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DatabaseZap className="size-4 text-primary" />
              冪等性と反映ルール
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              同じ外部レコードIDと入力fingerprintの再同期は重複行を作らず「未変更」に分類します。
            </p>
            <p>
              Dry-runは永続化せず、本同期のみ指標値・同期履歴・監査ログを一貫して更新します。
            </p>
            <Button variant="outline" size="sm" onClick={execute}>
              <RefreshCw className="size-4" />
              同じ同期を再実行して確認
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">同期履歴</CardTitle>
            <CardDescription>実行結果と再実行可否</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <span className="grid size-8 place-items-center rounded-full bg-emerald-100">
                <CheckCircle2 className="size-4 text-emerald-700" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">初期データロード</p>
                <p className="text-xs text-muted-foreground">
                  FY2023–FY2024 · 38件 · 成功
                </p>
              </div>
              <Badge variant="outline">完了</Badge>
            </div>
            {workspace.lastSyncAt && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <span className="grid size-8 place-items-center rounded-full bg-primary/10">
                  <CheckCircle2 className="size-4 text-primary" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">FY2025 差分同期</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(workspace.lastSyncAt).toLocaleString("ja-JP")} ·
                    成功
                  </p>
                </div>
                <Badge>完了</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
