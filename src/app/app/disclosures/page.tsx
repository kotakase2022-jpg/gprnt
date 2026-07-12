"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bot,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  FileCheck2,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  demoDisclosureRequirements,
  demoRequirementMappings,
  demoMetrics,
} from "@/data";
import { useDemoWorkspace } from "@/components/demo/demo-workspace";
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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { roleHasPermission } from "@/domain";

const statusLabels = {
  not_started: "Not Started",
  data_available: "Data Available",
  drafted: "Drafted",
  in_review: "In Review",
  revision_requested: "Revision Requested",
  approved: "Approved",
} as const;

export default function DisclosureWorkspacePage() {
  const { role } = useDemoSession();
  const workspace = useDemoWorkspace();
  const canWrite = roleHasPermission(role, "disclosure:write");
  const canGenerate = roleHasPermission(role, "ai:generate");
  const canEdit =
    canWrite &&
    !["in_review", "approved"].includes(workspace.disclosure.status);
  const [activeId, setActiveId] = React.useState(
    demoDisclosureRequirements[1]?.id ?? "",
  );
  const [answer, setAnswer] = React.useState(
    "Scope 1・2は国内外の連結対象拠点を運営支配基準で集計しています。Scope 3はカテゴリー1、2、3、4を優先して算定しています。",
  );
  const [draftInput, setDraftInput] = React.useState(
    workspace.disclosure.draft,
  );
  const active =
    demoDisclosureRequirements.find((item) => item.id === activeId) ??
    demoDisclosureRequirements[0]!;
  const mapping = demoRequirementMappings.find(
    (item) => item.requirementId === active.id,
  );
  const mappedMetrics =
    mapping?.metricCodes
      .map((code) => demoMetrics.find((metric) => metric.code === code))
      .filter(Boolean) ?? [];
  const isMain = active.requirementCode === "DEMO-CLI-01";
  const currentStatus = isMain
    ? workspace.disclosure.status
    : active.requirementCode === "DEMO-GEN-01"
      ? "approved"
      : active.requirementCode === "DEMO-HUM-01"
        ? "data_available"
        : "not_started";
  const completion =
    currentStatus === "approved"
      ? 100
      : currentStatus === "in_review"
        ? 82
        : currentStatus === "drafted"
          ? 68
          : currentStatus === "data_available"
            ? 45
            : 10;

  function saveGuidedAnswer() {
    workspace.saveDraft(
      `${workspace.disclosure.draft}\n\n【算定範囲】${answer}`,
    );
    toast.success("回答を開示案へ反映しました");
  }

  function createAiDraft() {
    const draft = `AI提案・要レビュー\n\n当社はFY2025において、運営支配基準に基づきScope 1排出量12,420 t-CO₂e、Scope 2（ロケーション基準）8,710 t-CO₂eを算定しました。Scope 3は主要カテゴリーを対象に74,100 t-CO₂eを推計しています。カテゴリー4および9は一次データの充足が限定的であり、継続的な収集が必要です。\n\n本案は合成デモデータのみを根拠とし、適合性を保証するものではありません。`;
    workspace.applyAiDraft(draft, ["GHG-S1", "GHG-S2-LB", "GHG-S3-C1"]);
    setDraftInput(draft);
    toast.success("AI提案を開示案へ反映しました", {
      description: "必ず担当者とレビュー担当者が内容・根拠を確認してください。",
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="SSBJ / ISSB DISCLOSURE WORKSPACE"
        title="要求事項とデータを、一つの作業面へ"
        description="基準本文は転載せず、独自の短いデモ要約と参照URL、対応データ、証憑、担当、レビュー状態をバージョン管理します。"
        actions={
          <Button asChild>
            <Link href="/app/assistant">
              <Bot className="size-4" />
              AI開示支援を開く
            </Link>
          </Button>
        }
      />
      <Alert className="mb-4">
        <CircleHelp className="size-4" />
        <AlertTitle>法的適合性ではなく「開示準備度」を表示</AlertTitle>
        <AlertDescription>
          以下はデモ用要求事項の独自要約です。正式な基準本文・適用判断は各参照元と専門家の確認が必要です。
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">要求事項</CardTitle>
            <CardDescription>
              {demoDisclosureRequirements.length}件 / concept-mvp-v1
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {demoDisclosureRequirements.map((requirement, index) => {
              const selected = requirement.id === active.id;
              const status =
                requirement.requirementCode === "DEMO-CLI-01"
                  ? workspace.disclosure.status
                  : index === 0
                    ? "approved"
                    : index === 5
                      ? "data_available"
                      : "not_started";
              return (
                <Button
                  key={requirement.id}
                  variant={selected ? "secondary" : "ghost"}
                  className="h-auto w-full justify-start p-3 text-left"
                  onClick={() => setActiveId(requirement.id)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      {requirement.requirementCode}
                    </span>
                    <span className="mt-1 block whitespace-normal text-xs leading-5">
                      {requirement.summary}
                    </span>
                    <Badge
                      variant={status === "approved" ? "default" : "outline"}
                      className="mt-2 text-[10px]"
                    >
                      {statusLabels[status]}
                    </Badge>
                  </span>
                  <ChevronRight className="size-4 shrink-0" />
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {active.requirementCode}
                    </Badge>
                    <Badge>{statusLabels[currentStatus]}</Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg">
                    {active.summary}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    適用日 {active.applicableFrom} · 重み {active.weight} ·
                    concept-mvp-v1
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={active.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    参照元 <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex justify-between text-xs">
                <span>入力・証憑・レビューを含む準備度</span>
                <span className="font-mono font-semibold">{completion}%</span>
              </div>
              <Progress value={completion} />
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-semibold">対応TERRASTデータ</p>
                  <div className="mt-3 space-y-2">
                    {mappedMetrics.length > 0 ? (
                      mappedMetrics.map((metric) => (
                        <div key={metric!.code} className="text-xs">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {metric!.code}
                          </span>
                          <p>{metric!.name}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        対応データなし
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-semibold">不足データ</p>
                  <p className="mt-3 text-xs leading-5 text-amber-700">
                    {isMain
                      ? "Scope 3 Cat.4・9の一次データ、算定除外の判断根拠"
                      : "担当者による説明文と更新証憑"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-semibold">添付証憑</p>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <FileCheck2 className="size-4 text-primary" />
                    {isMain ? "3件（2件確認済み）" : "未登録"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="guided">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="guided">ガイド入力</TabsTrigger>
              <TabsTrigger value="draft">開示案</TabsTrigger>
              <TabsTrigger value="history">更新履歴</TabsTrigger>
            </TabsList>
            <TabsContent value="guided">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    平易な質問に答えて開示案を補完
                  </CardTitle>
                  <CardDescription>
                    質問への回答を、対応する要求事項へ来歴付きで反映します。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-semibold">
                      排出量の算定範囲と、Scope
                      3で優先したカテゴリーを教えてください。
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      組織範囲、連結範囲、対象期間、除外事項が分かるように記載してください。
                    </p>
                  </div>
                  <Label htmlFor="guided-disclosure-answer" className="sr-only">
                    算定範囲と優先カテゴリーへの回答
                  </Label>
                  <Textarea
                    id="guided-disclosure-answer"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    rows={6}
                    className="mt-4"
                    readOnly={!canEdit}
                  />
                  <div className="mt-4 flex justify-end">
                    <Button onClick={saveGuidedAnswer} disabled={!canEdit}>
                      <Save className="size-4" />
                      回答を反映
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="draft">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">開示文案</CardTitle>
                      <CardDescription>
                        AI出力は必ず「AI提案・要レビュー」として扱います。
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={createAiDraft}
                      disabled={!canGenerate || !canEdit}
                    >
                      <Sparkles className="size-4" />
                      根拠からAI案
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="disclosure-draft" className="sr-only">
                    開示文案
                  </Label>
                  <Textarea
                    id="disclosure-draft"
                    value={draftInput}
                    onChange={(event) => setDraftInput(event.target.value)}
                    rows={12}
                    readOnly={!canEdit}
                  />
                  <div className="mt-4 flex flex-wrap justify-between gap-2">
                    <Badge variant="outline">
                      根拠ID:{" "}
                      {workspace.ai.evidenceIds.length
                        ? workspace.ai.evidenceIds.join(", ")
                        : "未付与"}
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={!canEdit}
                        onClick={() => {
                          workspace.saveDraft(draftInput);
                          toast.success("開示案を保存しました");
                        }}
                      >
                        <Save className="size-4" />
                        保存
                      </Button>
                      <Button
                        onClick={() => {
                          workspace.saveDraft(draftInput);
                          workspace.submitForReview();
                          toast.success("Reviewerへ提出しました");
                        }}
                        disabled={
                          !canEdit ||
                          workspace.disclosure.status === "in_review" ||
                          workspace.disclosure.status === "approved"
                        }
                      >
                        <Send className="size-4" />
                        レビューへ提出
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">更新履歴</CardTitle>
                  <CardDescription>
                    誰が、いつ、何を変えたかを監査ログと関連付け
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {workspace.audit
                    .filter(
                      (entry) =>
                        entry.resource.includes("SSBJ") ||
                        entry.resource.includes("requirement") ||
                        entry.action.includes("disclosure") ||
                        entry.action.includes("review") ||
                        entry.action.includes("approval") ||
                        entry.action.includes("ai."),
                    )
                    .slice(0, 8)
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="flex gap-3 rounded-lg border p-3"
                      >
                        <span className="mt-1 size-2 rounded-full bg-primary" />
                        <div>
                          <p className="text-sm font-medium">{entry.summary}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(entry.at).toLocaleString("ja-JP")} ·{" "}
                            {entry.actor} · {entry.action}
                          </p>
                        </div>
                      </div>
                    ))}
                  {workspace.audit.length <= 2 && (
                    <p className="text-sm text-muted-foreground">
                      このセッションでの変更はまだありません。
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
