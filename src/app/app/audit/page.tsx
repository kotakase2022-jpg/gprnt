"use client";

import * as React from "react";
import {
  Download,
  Eye,
  Filter,
  History,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AuditEntry, useDemoWorkspace } from "@/components/demo/demo-workspace";
import { useDemoSession } from "@/components/demo/demo-session";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

function exportAudit(entries: AuditEntry[]) {
  const rows = [
    [
      "occurred_at",
      "actor",
      "role",
      "action",
      "resource",
      "summary",
      "correlation_id",
    ],
    ...entries.map((entry) => [
      entry.at,
      entry.actor,
      entry.role,
      entry.action,
      entry.resource,
      entry.summary,
      entry.correlationId,
    ]),
  ];
  const csv = encodeCsv(rows);
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "terrast-audit-log-demo.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AuditPage() {
  const { role } = useDemoSession();
  const workspace = useDemoWorkspace();
  const [query, setQuery] = React.useState("");
  const [action, setAction] = React.useState("all");
  const [selected, setSelected] = React.useState<AuditEntry | null>(null);
  const filtered = workspace.audit.filter(
    (entry) =>
      `${entry.actor} ${entry.action} ${entry.resource} ${entry.summary} ${entry.correlationId}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (action === "all" || entry.action.includes(action)),
  );
  const systemView = role === "system_admin";

  return (
    <>
      <PageHeader
        eyebrow="AUDIT TRAIL / APPEND ONLY"
        title="変更・承認・AI生成を検索可能な履歴へ"
        description="誰が、いつ、何を、なぜ変更したか。手動値、TERRAST同期、証憑、AI、共有同意をcorrelation IDで追跡します。"
        actions={
          <Button
            variant="outline"
            onClick={() => {
              exportAudit(filtered);
              toast.success("監査ログCSVを出力しました");
            }}
          >
            <Download className="size-4" />
            CSV出力
          </Button>
        }
      />
      <Alert className="mb-4">
        <ShieldCheck className="size-4" />
        <AlertTitle>
          {systemView ? "システム監査ビュー" : "企業スコープの監査ビュー"}
        </AlertTitle>
        <AlertDescription>
          {systemView
            ? "System Adminとして企業を切り替え、各テナントの合成デモ監査を確認できます。"
            : "現在の企業と権限範囲に限定。証憑本文、秘密情報、APIキーはログへ記録しません。"}
        </AlertDescription>
      </Alert>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">イベント</p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {workspace.audit.length}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              append-only demo state
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">TERRAST / 手動値</p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {
                workspace.audit.filter(
                  (entry) =>
                    entry.action.includes("sync") ||
                    entry.action.includes("metric"),
                ).length
              }
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              来歴と解決理由
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">
              レビュー / AI / 同意
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold">
              {
                workspace.audit.filter((entry) =>
                  ["review", "approval", "ai", "sharing"].some((term) =>
                    entry.action.includes(term),
                  ),
                ).length
              }
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              説明責任イベント
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">監査ログ検索</CardTitle>
          <CardDescription>
            表示 {filtered.length}件 / 全{workspace.audit.length}件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="実行者、操作、対象、correlation ID"
              />
            </div>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-full md:w-52">
                <Filter className="size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全アクション</SelectItem>
                <SelectItem value="sync">TERRAST同期</SelectItem>
                <SelectItem value="metric">指標</SelectItem>
                <SelectItem value="review">レビュー</SelectItem>
                <SelectItem value="approval">承認</SelectItem>
                <SelectItem value="ai">AI生成</SelectItem>
                <SelectItem value="sharing">共有同意</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="transition">移行計画</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>実行者 / ロール</TableHead>
                  <TableHead>アクション</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>概要</TableHead>
                  <TableHead className="text-right">詳細</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap font-mono text-[11px]">
                      {new Date(entry.at).toLocaleString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium">{entry.actor}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {entry.role}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px]"
                      >
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[10px]">
                      {entry.resource}
                    </TableCell>
                    <TableCell className="max-w-sm text-xs">
                      {entry.summary}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelected(entry)}
                        aria-label={`${entry.action}の詳細`}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      条件に一致するログはありません
                    </TableCell>
                  </TableRow>
                )}
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
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              監査イベント詳細
            </DialogTitle>
            <DialogDescription>
              秘密情報を含まない最小限の変更メタデータ
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">occurred_at</dt>
                <dd className="mt-1 font-mono text-xs">{selected.at}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">actor / role</dt>
                <dd className="mt-1">
                  {selected.actor} / {selected.role}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">action</dt>
                <dd className="mt-1 font-mono">{selected.action}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">resource</dt>
                <dd className="mt-1 font-mono text-xs">{selected.resource}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs text-muted-foreground">
                  summary / reason
                </dt>
                <dd className="mt-1 rounded-lg bg-muted p-3">
                  {selected.summary}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs text-muted-foreground">
                  correlation_id
                </dt>
                <dd className="mt-1 font-mono text-xs">
                  {selected.correlationId}
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
